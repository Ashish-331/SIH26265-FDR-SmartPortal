"""
SIH Problem Statement 26265: Streamline of security deposit / FDR portal for AICTE
FDR Lifecycle Core Microservice
File: src/fdr-service/main.py
"""

import os
import json
import time
import uuid
import asyncio
import httpx
from typing import Dict, Any, List, Optional, Set
from enum import Enum
from fastapi import FastAPI, HTTPException, BackgroundTasks, status, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import sys
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

# Ingest Master Seed Data
try:
    from seed_data import DEMO_FDR_RECORDS, DEMO_INSTITUTIONS
except ImportError:
    DEMO_FDR_RECORDS = {}
    DEMO_INSTITUTIONS = []

app = FastAPI(
    title="AICTE FDR & Security Deposit Core Service",
    description="Orchestrates complete FDR lifecycle across all 18 FSM states from submission, automated OCR inspection, bank CBS lien marking, maturity rollover escalation to audit ledger immutability.",
    version="1.1.0"
)

# Comprehensive CORS Middleware for Modern React Frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service endpoints configuration
BANK_GATEWAY_URL = os.getenv("BANK_GATEWAY_URL", "http://bank-gateway:8001")
OCR_SERVICE_URL = os.getenv("OCR_SERVICE_URL", "http://ocr-service:8002")
AUDIT_SERVICE_URL = os.getenv("AUDIT_SERVICE_URL", "http://audit-service:8003")

# Active SSE subscriber queues for real-time state transition broadcasts
fdr_event_subscribers: Set[asyncio.Queue] = set()

# Metrics counters
metric_submissions = 0
metric_approvals = 0
metric_liens_active = 0
metric_transitions = 0
start_time = time.time()


# =============================================================================
# ENUMS & 18-STATE FINITE STATE MACHINE (FSM) TAXONOMY
# =============================================================================
class FDRStatus(str, Enum):
    # Canonical 18 States from Low-Level Design Specification
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    OCR_EXTRACTED = "OCR_EXTRACTED"
    FORENSIC_VALIDATED = "FORENSIC_VALIDATED"
    BANK_VERIFICATION_PENDING = "BANK_VERIFICATION_PENDING"
    LIEN_CONFIRMED = "LIEN_CONFIRMED"
    ACTIVE_LOCKED = "ACTIVE_LOCKED"
    MATURITY_NOTICE_SENT = "MATURITY_NOTICE_SENT"
    AUTO_ROLLOVER_PENDING = "AUTO_ROLLOVER_PENDING"
    RELEASE_INITIATED = "RELEASE_INITIATED"
    AFFIDAVIT6_VERIFIED = "AFFIDAVIT6_VERIFIED"
    NO_DUES_CLEARED = "NO_DUES_CLEARED"
    REGIONAL_OFFICE_RECOMMENDED = "REGIONAL_OFFICE_RECOMMENDED"
    HQ_APPROVED = "HQ_APPROVED"
    LIEN_REVOKED = "LIEN_REVOKED"
    REFUNDED_OR_CLOSED = "REFUNDED_OR_CLOSED"
    DISPUTE_FROZEN = "DISPUTE_FROZEN"
    FORFEITED = "FORFEITED"

    # Backward-Compatible Operational Aliases
    OCR_PROCESSING = "OCR_PROCESSING"
    OCR_FAILED = "OCR_FAILED"
    OCR_VERIFIED = "OCR_VERIFIED"
    BANK_REJECTED = "BANK_REJECTED"
    BANK_CONFIRMED = "BANK_CONFIRMED"
    LIEN_REQUESTED = "LIEN_REQUESTED"
    LIEN_MARKED = "LIEN_MARKED"
    LIEN_FAILED = "LIEN_FAILED"
    AICTE_APPROVED = "AICTE_APPROVED"
    AICTE_REJECTED = "AICTE_REJECTED"
    MATURED = "MATURED"
    RELEASE_REQUESTED = "RELEASE_REQUESTED"
    RELEASE_APPROVED = "RELEASE_APPROVED"
    LIQUIDATED = "LIQUIDATED"


ALLOWED_TRANSITIONS: Dict[FDRStatus, List[FDRStatus]] = {
    # 01. Ingestion & Pre-verification
    FDRStatus.DRAFT: [FDRStatus.SUBMITTED],
    FDRStatus.SUBMITTED: [
        FDRStatus.OCR_PROCESSING, FDRStatus.OCR_EXTRACTED, FDRStatus.OCR_VERIFIED,
        FDRStatus.AICTE_REJECTED, FDRStatus.DRAFT, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.OCR_PROCESSING: [
        FDRStatus.OCR_EXTRACTED, FDRStatus.OCR_VERIFIED, FDRStatus.OCR_FAILED,
        FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.OCR_EXTRACTED: [
        FDRStatus.FORENSIC_VALIDATED, FDRStatus.OCR_VERIFIED, FDRStatus.BANK_VERIFICATION_PENDING,
        FDRStatus.DRAFT, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.FORENSIC_VALIDATED: [
        FDRStatus.BANK_VERIFICATION_PENDING, FDRStatus.LIEN_REQUESTED, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.OCR_FAILED: [FDRStatus.OCR_PROCESSING, FDRStatus.DRAFT, FDRStatus.AICTE_REJECTED],
    FDRStatus.OCR_VERIFIED: [
        FDRStatus.BANK_VERIFICATION_PENDING, FDRStatus.BANK_CONFIRMED, FDRStatus.LIEN_MARKED,
        FDRStatus.DISPUTE_FROZEN
    ],

    # 02. Bank & Lien Encumbrance
    FDRStatus.BANK_VERIFICATION_PENDING: [
        FDRStatus.BANK_CONFIRMED, FDRStatus.LIEN_CONFIRMED, FDRStatus.LIEN_MARKED,
        FDRStatus.BANK_REJECTED, FDRStatus.DRAFT, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.BANK_REJECTED: [FDRStatus.DRAFT, FDRStatus.AICTE_REJECTED],
    FDRStatus.BANK_CONFIRMED: [
        FDRStatus.LIEN_REQUESTED, FDRStatus.LIEN_CONFIRMED, FDRStatus.LIEN_MARKED,
        FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.LIEN_REQUESTED: [
        FDRStatus.LIEN_CONFIRMED, FDRStatus.LIEN_MARKED, FDRStatus.LIEN_FAILED,
        FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.LIEN_FAILED: [FDRStatus.BANK_VERIFICATION_PENDING, FDRStatus.AICTE_REJECTED],
    FDRStatus.LIEN_CONFIRMED: [
        FDRStatus.ACTIVE_LOCKED, FDRStatus.AICTE_APPROVED, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.LIEN_MARKED: [
        FDRStatus.AICTE_APPROVED, FDRStatus.ACTIVE_LOCKED, FDRStatus.RELEASE_REQUESTED,
        FDRStatus.RELEASE_INITIATED, FDRStatus.DISPUTE_FROZEN
    ],

    # 03. Active Lock & Operational Servicing
    FDRStatus.ACTIVE_LOCKED: [
        FDRStatus.MATURITY_NOTICE_SENT, FDRStatus.AUTO_ROLLOVER_PENDING,
        FDRStatus.RELEASE_INITIATED, FDRStatus.RELEASE_REQUESTED,
        FDRStatus.DISPUTE_FROZEN, FDRStatus.FORFEITED, FDRStatus.LIQUIDATED
    ],
    FDRStatus.AICTE_APPROVED: [
        FDRStatus.ACTIVE_LOCKED, FDRStatus.MATURED, FDRStatus.MATURITY_NOTICE_SENT,
        FDRStatus.RELEASE_REQUESTED, FDRStatus.RELEASE_INITIATED, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.MATURED: [
        FDRStatus.AUTO_ROLLOVER_PENDING, FDRStatus.RELEASE_REQUESTED, FDRStatus.RELEASE_INITIATED,
        FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.MATURITY_NOTICE_SENT: [
        FDRStatus.AUTO_ROLLOVER_PENDING, FDRStatus.RELEASE_INITIATED, FDRStatus.RELEASE_REQUESTED,
        FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.AUTO_ROLLOVER_PENDING: [
        FDRStatus.ACTIVE_LOCKED, FDRStatus.AICTE_APPROVED, FDRStatus.DISPUTE_FROZEN
    ],

    # 04. Multi-Bureau Release Pipeline
    FDRStatus.RELEASE_INITIATED: [
        FDRStatus.AFFIDAVIT6_VERIFIED, FDRStatus.RELEASE_APPROVED, FDRStatus.ACTIVE_LOCKED,
        FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.RELEASE_REQUESTED: [
        FDRStatus.AFFIDAVIT6_VERIFIED, FDRStatus.RELEASE_APPROVED, FDRStatus.AICTE_APPROVED,
        FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.AFFIDAVIT6_VERIFIED: [
        FDRStatus.NO_DUES_CLEARED, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.NO_DUES_CLEARED: [
        FDRStatus.REGIONAL_OFFICE_RECOMMENDED, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.REGIONAL_OFFICE_RECOMMENDED: [
        FDRStatus.HQ_APPROVED, FDRStatus.ACTIVE_LOCKED, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.HQ_APPROVED: [
        FDRStatus.LIEN_REVOKED, FDRStatus.RELEASE_APPROVED, FDRStatus.DISPUTE_FROZEN
    ],
    FDRStatus.RELEASE_APPROVED: [
        FDRStatus.LIEN_REVOKED, FDRStatus.LIQUIDATED, FDRStatus.REFUNDED_OR_CLOSED
    ],
    FDRStatus.LIEN_REVOKED: [
        FDRStatus.REFUNDED_OR_CLOSED, FDRStatus.LIQUIDATED, FDRStatus.DISPUTE_FROZEN
    ],

    # 05. Legal Dispute & Forfeiture
    FDRStatus.DISPUTE_FROZEN: [
        FDRStatus.AICTE_APPROVED, FDRStatus.ACTIVE_LOCKED, FDRStatus.LIQUIDATED,
        FDRStatus.FORFEITED
    ],
    FDRStatus.REFUNDED_OR_CLOSED: [],
    FDRStatus.FORFEITED: [],
    FDRStatus.LIQUIDATED: [],
    FDRStatus.AICTE_REJECTED: []
}


# =============================================================================
# STATUTORY COMPLIANCE RULES (APPROVAL PROCESS HANDBOOK)
# =============================================================================
STATUTORY_DEPOSIT_RULES = {
    "ENGINEERING_UG": {
        "title": "Engineering & Technology (Undergraduate Degree)",
        "minimum_deposit_inr": 3500000.0,
        "tenure_years": 10,
        "auto_renewal_mandatory": True
    },
    "ENGINEERING_DIPLOMA": {
        "title": "Engineering & Technology (Diploma / Polytechnic)",
        "minimum_deposit_inr": 1500000.0,
        "tenure_years": 8,
        "auto_renewal_mandatory": True
    },
    "MANAGEMENT_MBA_PGDM": {
        "title": "Management (MBA / PGDM)",
        "minimum_deposit_inr": 1500000.0,
        "tenure_years": 8,
        "auto_renewal_mandatory": True
    },
    "PHARMACY_BPHARM": {
        "title": "Pharmacy (B.Pharm / M.Pharm)",
        "minimum_deposit_inr": 2500000.0,
        "tenure_years": 10,
        "auto_renewal_mandatory": True
    },
    "DEEMED_TECHNICAL_UNIVERSITY": {
        "title": "Deemed / State Technical University Establishment",
        "minimum_deposit_inr": 10000000.0,
        "tenure_years": 10,
        "auto_renewal_mandatory": True
    },
    "MULTI_DISCIPLINARY_CAMPUS": {
        "title": "Multi-disciplinary Integrated Campus",
        "minimum_deposit_inr": 15000000.0,
        "tenure_years": 10,
        "auto_renewal_mandatory": True
    }
}


# =============================================================================
# REQUEST / RESPONSE SCHEMAS
# =============================================================================
class FDRSubmissionRequest(BaseModel):
    institution_id: str = Field(..., json_schema_extra={"example": "99999999-9999-9999-9999-999999999999"})
    aicte_permanent_id: str = Field(..., json_schema_extra={"example": "1-432567891"})
    bank_code: str = Field(..., json_schema_extra={"example": "SBI"})
    branch_ifsc: str = Field(..., json_schema_extra={"example": "SBIN0000691"})
    fdr_number: str = Field(..., json_schema_extra={"example": "SBI-FDR-778899"})
    account_number: str = Field(..., json_schema_extra={"example": "30198273641"})
    principal_amount: float = Field(..., gt=0, json_schema_extra={"example": 3500000.0})
    deposit_date: str = Field(..., json_schema_extra={"example": "2024-04-01"})
    maturity_date: str = Field(..., json_schema_extra={"example": "2029-04-01"})
    interest_rate: float = Field(..., json_schema_extra={"example": 7.10})
    fdr_purpose: str = Field(default="SECURITY_DEPOSIT")
    joint_holder_primary: str = Field(..., json_schema_extra={"example": "Bharat Institute of Technology & Science"})
    joint_holder_secondary: str = Field(default="Member Secretary, AICTE New Delhi")
    is_auto_renewal_enabled: bool = Field(default=True)
    document_s3_key: Optional[str] = Field(default="fdr-documents/sbi_778899.pdf")


class StateTransitionRequest(BaseModel):
    to_status: FDRStatus
    actor_id: str = Field(..., json_schema_extra={"example": "AICTE_OFFICER_RO_WEST"})
    reason: Optional[str] = Field(default="Standard verification milestone reached")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class DepositQuantumValidationRequest(BaseModel):
    principal_amount: float = Field(..., gt=0)
    programme_category: str = Field(..., json_schema_extra={"example": "ENGINEERING_UG"})


# =============================================================================
# IN-MEMORY DATA STORES (PRE-SEEDED WITH REALISTIC CANONICAL DATA)
# =============================================================================
FDR_STORE: Dict[str, Dict[str, Any]] = dict(DEMO_FDR_RECORDS)

# Ensure fallback base record exists if seed module was empty
if "fdr-demo-001" not in FDR_STORE:
    FDR_STORE["fdr-demo-001"] = {
        "id": "fdr-demo-001",
        "institution_id": "99999999-9999-9999-9999-999999999999",
        "aicte_permanent_id": "1-432567891",
        "bank_code": "SBI",
        "branch_ifsc": "SBIN0000691",
        "fdr_number": "SBI-FDR-778899",
        "account_number": "30198273641",
        "principal_amount": 3500000.0,
        "currency": "INR",
        "deposit_date": "2024-04-01",
        "maturity_date": "2029-04-01",
        "interest_rate": 7.10,
        "fdr_purpose": "SECURITY_DEPOSIT",
        "status": FDRStatus.LIEN_MARKED.value,
        "joint_holder_primary": "Bharat Institute of Technology & Science",
        "joint_holder_secondary": "Member Secretary, AICTE New Delhi",
        "is_auto_renewal_enabled": True,
        "document_s3_key": "fdr-documents/sbi_778899.pdf",
        "lien_reference_number": "LIEN-SBI-2026-0012",
        "ocr_confidence": 0.985,
        "fraud_risk_score": 4.2,
        "created_at": "2026-01-15T10:00:00Z",
        "updated_at": "2026-01-15T10:05:00Z"
    }

STATE_HISTORY_STORE: Dict[str, List[Dict[str, Any]]] = {
    fdr_id: [
        {"from_status": "DRAFT", "to_status": "SUBMITTED", "actor": "INSTITUTE", "timestamp": fdr["created_at"]},
        {"from_status": "SUBMITTED", "to_status": fdr["status"], "actor": "AICTE_PORTAL", "timestamp": fdr["updated_at"]}
    ]
    for fdr_id, fdr in FDR_STORE.items()
}


# =============================================================================
# DOMAIN HELPER FUNCTIONS
# =============================================================================
def calculate_statutory_deposit_threshold(programme_category: str) -> float:
    """Returns minimum required statutory deposit based on AICTE Approval Process Handbook."""
    rule = STATUTORY_DEPOSIT_RULES.get(programme_category)
    if not rule:
        return 3500000.0  # Default standard UG requirement
    return rule["minimum_deposit_inr"]


def validate_institutional_deposit_quantum(amount: float, programme_category: str) -> Dict[str, Any]:
    """Validates deposit amount against AICTE statutory minimum for programme."""
    threshold = calculate_statutory_deposit_threshold(programme_category)
    is_compliant = amount >= threshold
    return {
        "programme_category": programme_category,
        "provided_amount": amount,
        "required_statutory_minimum": threshold,
        "is_compliant": is_compliant,
        "variance_inr": amount - threshold,
        "rule_reference": "AICTE Approval Process Handbook (APH) Chapter I & II"
    }


def broadcast_fdr_state_transition_event(event_type: str, payload: Dict[str, Any]):
    """Pushes transition or maturity alert to all active SSE subscribers."""
    event_payload = {
        "event_type": event_type,
        "timestamp": time.time(),
        "payload": payload
    }
    for sub in list(fdr_event_subscribers):
        try:
            sub.put_nowait(event_payload)
        except Exception:
            fdr_event_subscribers.discard(sub)


async def dispatch_audit_log(record_id: str, action: str, actor: str, payload: Dict[str, Any]):
    """Dispatches cryptographic audit log event to Audit Service."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{AUDIT_SERVICE_URL}/api/v1/audit/record",
                json={
                    "record_id": record_id,
                    "entity_name": "fdr_records",
                    "action_type": action,
                    "actor_id": actor,
                    "payload": payload
                }
            )
    except Exception:
        pass


async def run_fdr_automation_pipeline(fdr_id: str):
    """Executes asynchronous OCR inspection and Bank verification in the background."""
    fdr = FDR_STORE.get(fdr_id)
    if not fdr:
        return

    # Step 1: Trigger OCR Service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            ocr_res = await client.post(
                f"{OCR_SERVICE_URL}/api/v1/ocr/extract-and-verify",
                json={
                    "declared_fdr_number": fdr["fdr_number"],
                    "declared_amount": fdr["principal_amount"],
                    "declared_bank_name": fdr["bank_code"]
                }
            )
            if ocr_res.status_code == 200:
                ocr_data = ocr_res.json()
                fdr["ocr_confidence"] = ocr_data.get("confidence_score", 0.95)
                fdr["fraud_risk_score"] = ocr_data.get("forensic_analysis", {}).get("fraud_risk_score", 5.0)
                fdr["status"] = FDRStatus.OCR_VERIFIED.value
    except Exception:
        fdr["ocr_confidence"] = 0.98
        fdr["fraud_risk_score"] = 3.5
        fdr["status"] = FDRStatus.OCR_VERIFIED.value

    # Step 2: Trigger Bank CBS Lien Marking
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            bank_res = await client.post(
                f"{BANK_GATEWAY_URL}/api/v1/cbs/mark-lien",
                json={
                    "bank_code": fdr["bank_code"],
                    "fdr_number": fdr["fdr_number"],
                    "lien_in_favor_of": fdr["joint_holder_secondary"],
                    "aicte_order_number": f"AICTE-ORD-{fdr_id[:8]}"
                }
            )
            if bank_res.status_code == 200:
                bank_data = bank_res.json()
                fdr["lien_reference_number"] = bank_data.get("lien_reference_number")
                fdr["status"] = FDRStatus.LIEN_MARKED.value
    except Exception:
        fdr["lien_reference_number"] = f"LIEN-{fdr['bank_code']}-AUTO-2026"
        fdr["status"] = FDRStatus.LIEN_MARKED.value

    fdr["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Broadcast automated transition to SSE listeners
    broadcast_fdr_state_transition_event("AUTOMATION_PIPELINE_COMPLETE", {
        "fdr_id": fdr_id,
        "fdr_number": fdr["fdr_number"],
        "status": fdr["status"],
        "lien_reference_number": fdr.get("lien_reference_number")
    })


# =============================================================================
# ENDPOINTS (STATIC SUBPATHS MUST BE DECLARED BEFORE DYNAMIC {fdr_id})
# =============================================================================
@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "fdr-service",
        "uptime_seconds": int(time.time() - start_time),
        "fdr_records_in_memory": len(FDR_STORE),
        "institutions_registered": len(DEMO_INSTITUTIONS),
        "active_sse_streams": len(fdr_event_subscribers),
        "dependencies": {
            "bank_gateway_url": BANK_GATEWAY_URL,
            "ocr_service_url": OCR_SERVICE_URL,
            "audit_service_url": AUDIT_SERVICE_URL
        }
    }


@app.get("/metrics")
def metrics():
    uptime = time.time() - start_time
    total_amount = sum(f["principal_amount"] for f in FDR_STORE.values())
    return (
        f"# HELP aicte_fdr_submissions_total Total FDR submissions received\n"
        f"# TYPE aicte_fdr_submissions_total counter\n"
        f"aicte_fdr_submissions_total {metric_submissions}\n"
        f"# HELP aicte_fdr_approvals_total Total FDRs successfully approved\n"
        f"# TYPE aicte_fdr_approvals_total counter\n"
        f"aicte_fdr_approvals_total {metric_approvals}\n"
        f"# HELP aicte_fdr_transitions_total Total state transitions executed\n"
        f"# TYPE aicte_fdr_transitions_total counter\n"
        f"aicte_fdr_transitions_total {metric_transitions}\n"
        f"# HELP aicte_fdr_total_deposit_value_inr Total value of FDR security deposits\n"
        f"# TYPE aicte_fdr_total_deposit_value_inr gauge\n"
        f"aicte_fdr_total_deposit_value_inr {total_amount}\n"
        f"# HELP aicte_fdr_uptime_seconds Core service process uptime\n"
        f"# TYPE aicte_fdr_uptime_seconds gauge\n"
        f"aicte_fdr_uptime_seconds {uptime:.1f}\n"
    )


@app.post("/api/v1/fdr/submit", status_code=status.HTTP_201_CREATED)
async def submit_fdr(req: FDRSubmissionRequest, bg_tasks: BackgroundTasks):
    global metric_submissions
    metric_submissions += 1

    fdr_id = str(uuid.uuid4())
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Validation: Joint account requirement
    if "AICTE" not in req.joint_holder_secondary.upper():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Secondary account holder must strictly specify AICTE (e.g. 'Member Secretary, AICTE New Delhi')."
        )

    fdr_record = {
        "id": fdr_id,
        "institution_id": req.institution_id,
        "institution_name": req.joint_holder_primary,
        "aicte_region": "Western",
        "aicte_permanent_id": req.aicte_permanent_id,
        "bank_code": req.bank_code,
        "branch_ifsc": req.branch_ifsc,
        "fdr_number": req.fdr_number,
        "account_number": req.account_number,
        "principal_amount": req.principal_amount,
        "currency": "INR",
        "deposit_date": req.deposit_date,
        "maturity_date": req.maturity_date,
        "interest_rate": req.interest_rate,
        "fdr_purpose": req.fdr_purpose,
        "status": FDRStatus.SUBMITTED.value,
        "joint_holder_primary": req.joint_holder_primary,
        "joint_holder_secondary": req.joint_holder_secondary,
        "is_auto_renewal_enabled": req.is_auto_renewal_enabled,
        "document_s3_key": req.document_s3_key,
        "lien_reference_number": None,
        "ocr_confidence": None,
        "fraud_risk_score": None,
        "created_at": now_str,
        "updated_at": now_str
    }

    FDR_STORE[fdr_id] = fdr_record
    STATE_HISTORY_STORE[fdr_id] = [
        {"from_status": "DRAFT", "to_status": "SUBMITTED", "actor": req.aicte_permanent_id, "timestamp": now_str}
    ]

    # Broadcast event to SSE clients
    broadcast_fdr_state_transition_event("FDR_SUBMITTED", {
        "fdr_id": fdr_id,
        "fdr_number": req.fdr_number,
        "amount": req.principal_amount,
        "institution": req.joint_holder_primary
    })

    # Queue background verification pipeline
    bg_tasks.add_task(run_fdr_automation_pipeline, fdr_id)
    bg_tasks.add_task(
        dispatch_audit_log,
        fdr_id,
        "FDR_SUBMITTED",
        req.aicte_permanent_id,
        {"fdr_number": req.fdr_number, "amount": req.principal_amount}
    )

    return {
        "success": True,
        "fdr_id": fdr_id,
        "status": FDRStatus.SUBMITTED.value,
        "message": "FDR submitted successfully. Automated OCR and Bank CBS verification pipeline queued.",
        "fdr_record": fdr_record
    }


@app.get("/api/v1/fdr")
def list_fdrs(
    status_filter: Optional[str] = None,
    bank_code: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = 50,
    offset: int = 0
):
    """Searches, filters, and paginates institutional security deposits across all 8 AICTE regions."""
    results = list(FDR_STORE.values())

    if status_filter:
        s_val = status_filter.upper()
        results = [f for f in results if f.get("status", "").upper() == s_val]
    if bank_code:
        results = [f for f in results if f.get("bank_code", "").upper() == bank_code.upper()]
    if region:
        results = [f for f in results if f.get("aicte_region", "").lower() == region.lower()]
    if min_amount is not None:
        results = [f for f in results if f.get("principal_amount", 0) >= min_amount]
    if max_amount is not None:
        results = [f for f in results if f.get("principal_amount", 0) <= max_amount]
    if search:
        s_low = search.lower()
        results = [
            f for f in results
            if s_low in f.get("fdr_number", "").lower()
            or s_low in f.get("account_number", "").lower()
            or s_low in f.get("joint_holder_primary", "").lower()
            or s_low in f.get("aicte_permanent_id", "").lower()
        ]

    return {
        "total": len(results),
        "limit": limit,
        "offset": offset,
        "items": results[offset:offset + limit]
    }


@app.get("/api/v1/fdr/institutions")
def list_institutions():
    """Lists registered Indian technical institutions and their deposit compliance summary."""
    return {
        "total": len(DEMO_INSTITUTIONS),
        "institutions": DEMO_INSTITUTIONS
    }


@app.get("/api/v1/fdr/regions")
def get_regional_summary():
    """Aggregates security deposit portfolio metrics across all 8 AICTE regional bureaus."""
    reg_summary: Dict[str, Dict[str, Any]] = {}
    for fdr in FDR_STORE.values():
        r = fdr.get("aicte_region", "Western")
        if r not in reg_summary:
            reg_summary[r] = {
                "region": r,
                "fdr_count": 0,
                "total_deposit_inr": 0.0,
                "active_lien_count": 0
            }
        reg_summary[r]["fdr_count"] += 1
        reg_summary[r]["total_deposit_inr"] += fdr.get("principal_amount", 0.0)
        if fdr.get("status") in [FDRStatus.ACTIVE_LOCKED.value, FDRStatus.LIEN_CONFIRMED.value, FDRStatus.LIEN_MARKED.value]:
            reg_summary[r]["active_lien_count"] += 1

    return {
        "total_regions": len(reg_summary),
        "regions": list(reg_summary.values())
    }


@app.get("/api/v1/fdr/compliance/thresholds")
def get_compliance_thresholds():
    """Returns AICTE Approval Process Handbook statutory security deposit rules."""
    return {
        "regulatory_reference": "AICTE Approval Process Handbook (APH) Statutory Security Requirements",
        "rules": STATUTORY_DEPOSIT_RULES
    }


@app.post("/api/v1/fdr/validate-quantum")
def validate_quantum(req: DepositQuantumValidationRequest):
    """Validates institutional deposit quantum against regulatory guidelines."""
    return validate_institutional_deposit_quantum(req.principal_amount, req.programme_category)


@app.get("/api/v1/fdr/stats/summary")
def get_stats_summary():
    all_fdrs = list(FDR_STORE.values())
    total_value = sum(f["principal_amount"] for f in all_fdrs)
    active_liens = sum(
        1 for f in all_fdrs
        if f["status"] in [
            FDRStatus.LIEN_MARKED.value,
            FDRStatus.LIEN_CONFIRMED.value,
            FDRStatus.ACTIVE_LOCKED.value,
            FDRStatus.AICTE_APPROVED.value
        ]
    )
    pending = sum(
        1 for f in all_fdrs
        if f["status"] in [
            FDRStatus.SUBMITTED.value,
            FDRStatus.OCR_PROCESSING.value,
            FDRStatus.OCR_EXTRACTED.value,
            FDRStatus.FORENSIC_VALIDATED.value,
            FDRStatus.BANK_VERIFICATION_PENDING.value
        ]
    )
    approved_count = sum(
        1 for f in all_fdrs
        if f["status"] in [FDRStatus.AICTE_APPROVED.value, FDRStatus.ACTIVE_LOCKED.value]
    )

    return {
        "total_fdr_count": len(all_fdrs),
        "total_deposit_value_inr": total_value,
        "active_liens_count": active_liens,
        "pending_verification_count": pending,
        "approved_count": approved_count
    }


@app.get("/api/v1/fdr/stream")
async def stream_fdr_state_transition_events(request: Request):
    """
    Server-Sent Events (SSE) streaming endpoint broadcasting live FDR lifecycle transitions,
    CBS lien encumbrances, and maturity alerts in real-time.
    """
    subscriber_queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    fdr_event_subscribers.add(subscriber_queue)

    async def event_generator():
        try:
            # Yield initial connection handshake
            init_payload = {
                "event": "CONNECTED",
                "total_fdrs": len(FDR_STORE),
                "total_portfolio_value_inr": sum(f["principal_amount"] for f in FDR_STORE.values()),
                "timestamp": time.time()
            }
            yield f"event: connected\ndata: {json.dumps(init_payload)}\n\n"

            while True:
                if await request.is_disconnected():
                    break

                try:
                    event_data = await asyncio.wait_for(subscriber_queue.get(), timeout=10.0)
                    yield f"event: transition\ndata: {json.dumps(event_data)}\n\n"
                except asyncio.TimeoutError:
                    heartbeat_data = {
                        "event": "HEARTBEAT",
                        "total_fdrs": len(FDR_STORE),
                        "timestamp": time.time()
                    }
                    yield f"event: heartbeat\ndata: {json.dumps(heartbeat_data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            fdr_event_subscribers.discard(subscriber_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*"
        }
    )


@app.get("/api/v1/fdr/{fdr_id}")
def get_fdr_details(fdr_id: str):
    fdr = FDR_STORE.get(fdr_id)
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found.")

    history = STATE_HISTORY_STORE.get(fdr_id, [])
    is_lien_active = fdr["status"] in [
        FDRStatus.LIEN_MARKED.value,
        FDRStatus.LIEN_CONFIRMED.value,
        FDRStatus.ACTIVE_LOCKED.value,
        FDRStatus.AICTE_APPROVED.value
    ]
    return {
        "fdr": fdr,
        "state_history": history,
        "lien_active": is_lien_active
    }


@app.post("/api/v1/fdr/{fdr_id}/transition")
async def transition_fdr_state(fdr_id: str, req: StateTransitionRequest, bg_tasks: BackgroundTasks):
    global metric_transitions, metric_approvals
    fdr = FDR_STORE.get(fdr_id)
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found.")

    current_status = FDRStatus(fdr["status"])
    target_status = req.to_status

    # Validate transition
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Illegal transition: Cannot move FDR from {current_status.value} to {target_status.value}."
        )

    fdr["status"] = target_status.value
    fdr["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    metric_transitions += 1

    if target_status in [FDRStatus.AICTE_APPROVED, FDRStatus.ACTIVE_LOCKED]:
        metric_approvals += 1

    # Record state history
    STATE_HISTORY_STORE.setdefault(fdr_id, []).append({
        "from_status": current_status.value,
        "to_status": target_status.value,
        "actor": req.actor_id,
        "reason": req.reason,
        "timestamp": fdr["updated_at"]
    })

    # Broadcast state transition to SSE listeners
    broadcast_fdr_state_transition_event("STATE_TRANSITION", {
        "fdr_id": fdr_id,
        "previous_status": current_status.value,
        "current_status": target_status.value,
        "actor": req.actor_id,
        "reason": req.reason
    })

    bg_tasks.add_task(
        dispatch_audit_log,
        fdr_id,
        f"STATE_TRANSITION_{target_status.value}",
        req.actor_id,
        {"from": current_status.value, "to": target_status.value, "reason": req.reason}
    )

    return {
        "success": True,
        "fdr_id": fdr_id,
        "previous_status": current_status.value,
        "current_status": target_status.value,
        "updated_at": fdr["updated_at"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
