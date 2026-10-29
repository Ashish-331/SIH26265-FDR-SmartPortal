"""
SIH Problem Statement 26265: Streamline of security deposit / FDR portal for AICTE
Bank CBS (Core Banking Solution) Mock Adapter & Gateway
File: src/bank-gateway/main.py
"""

import os
import time
import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="AICTE Bank CBS Gateway & Mock Adapter",
    description="Simulates Scheduled Commercial Bank Core Banking Systems (SBI, PNB, HDFC, Canara, Bank of Baroda) for FDR verification, digital lien marking, NeSL MT760 verification, and NOC release.",
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

# Metrics counters
metric_verifications = 0
metric_liens_marked = 0
metric_liens_released = 0
metric_webhook_dispatches = 0
metric_nesl_verifications = 0
start_time = time.time()

# Supported Scheduled Commercial Banks Metadata
PARTICIPATING_BANKS = [
    {
        "bank_code": "SBI",
        "bank_name": "State Bank of India",
        "cbs_engine": "TCS BaNCS",
        "ifsc_prefix": "SBIN",
        "integration_mode": "DIRECT_REST_API",
        "nesl_sfms_supported": True,
        "branch_count_india": 22405,
        "sla_uptime_percent": 99.95,
        "status": "OPERATIONAL"
    },
    {
        "bank_code": "PNB",
        "bank_name": "Punjab National Bank",
        "cbs_engine": "Infosys Finacle 10.x",
        "ifsc_prefix": "PUNB",
        "integration_mode": "DIRECT_REST_API",
        "nesl_sfms_supported": True,
        "branch_count_india": 10058,
        "sla_uptime_percent": 99.88,
        "status": "OPERATIONAL"
    },
    {
        "bank_code": "HDFC",
        "bank_name": "HDFC Bank Ltd",
        "cbs_engine": "Finacle / Oracle FLEXCUBE",
        "ifsc_prefix": "HDFC",
        "integration_mode": "DIRECT_REST_API",
        "nesl_sfms_supported": True,
        "branch_count_india": 8091,
        "sla_uptime_percent": 99.98,
        "status": "OPERATIONAL"
    },
    {
        "bank_code": "CANARA",
        "bank_name": "Canara Bank",
        "cbs_engine": "Infosys Finacle",
        "ifsc_prefix": "CNRB",
        "integration_mode": "DIRECT_REST_API",
        "nesl_sfms_supported": True,
        "branch_count_india": 9604,
        "sla_uptime_percent": 99.85,
        "status": "OPERATIONAL"
    },
    {
        "bank_code": "BOB",
        "bank_name": "Bank of Baroda",
        "cbs_engine": "Finacle 10.x",
        "ifsc_prefix": "BARB",
        "integration_mode": "DIRECT_REST_API",
        "nesl_sfms_supported": True,
        "branch_count_india": 8200,
        "sla_uptime_percent": 99.91,
        "status": "OPERATIONAL"
    }
]

# Mock CBS In-Memory Database representing commercial bank core ledgers
MOCK_CBS_LEDGER: Dict[str, Dict[str, Any]] = {
    "SBI-FDR-778899": {
        "bank_code": "SBI",
        "fdr_number": "SBI-FDR-778899",
        "account_number": "30198273641",
        "branch_ifsc": "SBIN0000691",
        "branch_name": "New Delhi Main Branch",
        "account_holders": [
            "Bharat Institute of Technology & Science",
            "Member Secretary, AICTE New Delhi"
        ],
        "principal_amount": 3500000.0,
        "currency": "INR",
        "deposit_date": "2024-04-01",
        "maturity_date": "2029-04-01",
        "interest_rate": 7.10,
        "is_active": True,
        "is_lien_marked": False,
        "lien_reference_number": None,
        "lien_holder": None,
        "auto_renewal": True,
        "liquidation_blocked": False
    },
    "PNB-FDR-443322": {
        "bank_code": "PNB",
        "fdr_number": "PNB-FDR-443322",
        "account_number": "00140021008877",
        "branch_ifsc": "PUNB0014300",
        "branch_name": "Connaught Place Branch",
        "account_holders": [
            "Vidya Vikas Educational Trust",
            "Regional Officer, AICTE Western Region"
        ],
        "principal_amount": 2500000.0,
        "currency": "INR",
        "deposit_date": "2023-08-15",
        "maturity_date": "2028-08-15",
        "interest_rate": 6.85,
        "is_active": True,
        "is_lien_marked": False,
        "lien_reference_number": None,
        "lien_holder": None,
        "auto_renewal": True,
        "liquidation_blocked": False
    },
    "HDFC-FDR-998877": {
        "bank_code": "HDFC",
        "fdr_number": "HDFC-FDR-998877",
        "account_number": "50100234871928",
        "branch_ifsc": "HDFC0000003",
        "branch_name": "Curzon Road Branch",
        "account_holders": [
            "National Institute of Engineering Studies",
            "Member Secretary, AICTE"
        ],
        "principal_amount": 5000000.0,
        "currency": "INR",
        "deposit_date": "2025-01-10",
        "maturity_date": "2030-01-10",
        "interest_rate": 7.25,
        "is_active": True,
        "is_lien_marked": True,
        "lien_reference_number": "LIEN-HDFC-EXISTING-001",
        "lien_holder": "AICTE, New Delhi",
        "auto_renewal": True,
        "liquidation_blocked": True
    },
    "CAN-FDR-551122": {
        "bank_code": "CANARA",
        "fdr_number": "CAN-FDR-551122",
        "account_number": "0192101088412",
        "branch_ifsc": "CNRB0000192",
        "branch_name": "Madurai Main Branch",
        "account_holders": [
            "Thiagarajar College of Engineering",
            "Member Secretary, AICTE New Delhi"
        ],
        "principal_amount": 3500000.0,
        "currency": "INR",
        "deposit_date": "2022-06-15",
        "maturity_date": "2032-06-15",
        "interest_rate": 7.00,
        "is_active": True,
        "is_lien_marked": True,
        "lien_reference_number": "LIEN-CANARA-2022-8812",
        "lien_holder": "Member Secretary, AICTE New Delhi",
        "auto_renewal": True,
        "liquidation_blocked": True
    },
    "BOB-FDR-882233": {
        "bank_code": "BOB",
        "fdr_number": "BOB-FDR-882233",
        "account_number": "28100100091823",
        "branch_ifsc": "BARB0VJTIMU",
        "branch_name": "Matunga East Branch",
        "account_holders": [
            "Veermata Jijabai Technological Institute",
            "Member Secretary, AICTE New Delhi"
        ],
        "principal_amount": 10000000.0,
        "currency": "INR",
        "deposit_date": "2021-03-20",
        "maturity_date": "2031-03-20",
        "interest_rate": 7.15,
        "is_active": True,
        "is_lien_marked": True,
        "lien_reference_number": "LIEN-BOB-2021-9921",
        "lien_holder": "Member Secretary, AICTE New Delhi",
        "auto_renewal": True,
        "liquidation_blocked": True
    }
}

# Ingest Master Seed CBS Records if available
try:
    from seed_data import DEMO_CBS_RECORDS
    for _k, _v in DEMO_CBS_RECORDS.items():
        if _k not in MOCK_CBS_LEDGER:
            MOCK_CBS_LEDGER[_k] = _v
except Exception:
    pass


# =============================================================================
# REQUEST / RESPONSE SCHEMAS
# =============================================================================
class VerifyFDRRequest(BaseModel):
    bank_code: str = Field(..., json_schema_extra={"example": "SBI"})
    fdr_number: str = Field(..., json_schema_extra={"example": "SBI-FDR-778899"})
    expected_amount: Optional[float] = None
    expected_ifsc: Optional[str] = None


class MarkLienRequest(BaseModel):
    bank_code: str = Field(..., json_schema_extra={"example": "SBI"})
    fdr_number: str = Field(..., json_schema_extra={"example": "SBI-FDR-778899"})
    lien_in_favor_of: str = Field(default="Member Secretary, AICTE New Delhi")
    aicte_order_number: str = Field(..., json_schema_extra={"example": "AICTE/RO/WRO/2026/FDR-99182"})
    officer_pin: str = Field(default="SECURE_OFFICER_PIN_99")


class ReleaseLienRequest(BaseModel):
    bank_code: str = Field(..., json_schema_extra={"example": "SBI"})
    fdr_number: str = Field(..., json_schema_extra={"example": "SBI-FDR-778899"})
    lien_reference_number: str = Field(..., json_schema_extra={"example": "LIEN-SBI-..."})
    noc_reference_number: str = Field(..., json_schema_extra={"example": "NOC-AICTE-FIN-2026-78"})
    approval_token: str = Field(..., json_schema_extra={"example": "DIGITAL_TOKEN_VALIDATED"})


class WebhookDispatchRequest(BaseModel):
    event_type: str = Field(..., json_schema_extra={"example": "FDR_AUTO_RENEWED"})
    fdr_number: str = Field(..., json_schema_extra={"example": "SBI-FDR-778899"})
    details: Dict[str, Any] = Field(default_factory=dict)


class NeSLMT760VerificationRequest(BaseModel):
    sfms_message_id: str = Field(..., json_schema_extra={"example": "SFMS-MT760-20260401-889921"})
    issuing_bank_ifsc: str = Field(..., json_schema_extra={"example": "SBIN0000691"})
    fdr_or_bg_number: str = Field(..., json_schema_extra={"example": "SBI-FDR-778899"})
    beneficiary_name: str = Field(default="Member Secretary, AICTE New Delhi")
    guarantee_amount: float = Field(..., json_schema_extra={"example": 3500000.0})
    digital_signature_hash: str = Field(..., json_schema_extra={"example": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"})


# =============================================================================
# DOMAIN HELPER FUNCTIONS
# =============================================================================
def reconcile_core_banking_lien_record(fdr_record: Dict[str, Any], lien_ref: Optional[str] = None) -> bool:
    """Verifies that the Core Banking System lien lock flag and reference align."""
    if fdr_record.get("is_lien_marked"):
        return fdr_record.get("lien_reference_number") is not None and fdr_record.get("liquidation_blocked") is True
    return fdr_record.get("lien_reference_number") is None


def execute_digital_lien_encumbrance(
    bank_code: str,
    fdr_number: str,
    lien_in_favor_of: str,
    aicte_order_number: str
) -> Dict[str, Any]:
    """Applies an irrevocable statutory encumbrance lock on the CBS ledger record."""
    fdr = MOCK_CBS_LEDGER.get(fdr_number)
    if not fdr:
        # Dynamically create if ad-hoc test FDR
        fdr = {
            "bank_code": bank_code,
            "fdr_number": fdr_number,
            "account_number": "39" + str(uuid.uuid4().int)[:9],
            "branch_ifsc": f"{bank_code}0000691",
            "branch_name": "Main Branch",
            "account_holders": ["Technical Institute", lien_in_favor_of],
            "principal_amount": 3500000.0,
            "is_active": True,
            "is_lien_marked": False,
            "auto_renewal": True,
            "liquidation_blocked": False
        }
        MOCK_CBS_LEDGER[fdr_number] = fdr

    if fdr["is_lien_marked"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"FDR '{fdr_number}' is already lien-marked to '{fdr.get('lien_holder')}' under ref: {fdr.get('lien_reference_number')}."
        )

    lien_ref = f"LIEN-{bank_code}-{int(time.time())}-{str(uuid.uuid4())[:8].upper()}"
    cbs_tx_id = f"CBS-TXN-{str(uuid.uuid4())[:12].upper()}"

    fdr["is_lien_marked"] = True
    fdr["lien_reference_number"] = lien_ref
    fdr["lien_holder"] = lien_in_favor_of
    fdr["liquidation_blocked"] = True

    return {
        "success": True,
        "status": "LIEN_MARKED_SUCCESS",
        "fdr_number": fdr_number,
        "bank_code": bank_code,
        "lien_reference_number": lien_ref,
        "cbs_transaction_id": cbs_tx_id,
        "lien_in_favor_of": lien_in_favor_of,
        "aicte_order_number": aicte_order_number,
        "marked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "liquidation_blocked": True,
        "certificate_url": f"https://cbs-storage.{bank_code.lower()}.in/certificates/{lien_ref}.pdf",
        "message": f"Lien successfully marked in favor of {lien_in_favor_of}. Premature liquidation frozen in CBS."
    }


def process_statutory_lien_revocation(
    bank_code: str,
    fdr_number: str,
    lien_reference_number: str,
    noc_reference_number: str
) -> Dict[str, Any]:
    """Processes verified AICTE NOC and removes the CBS lien block."""
    fdr = MOCK_CBS_LEDGER.get(fdr_number)
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found.")

    if not fdr["is_lien_marked"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FDR is not currently lien marked."
        )

    if fdr.get("lien_reference_number") != lien_reference_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provided lien reference number does not match active CBS lien reference."
        )

    fdr["is_lien_marked"] = False
    fdr["lien_reference_number"] = None
    fdr["lien_holder"] = None
    fdr["liquidation_blocked"] = False

    return {
        "success": True,
        "status": "LIEN_RELEASED_SUCCESS",
        "fdr_number": fdr_number,
        "noc_reference_number": noc_reference_number,
        "released_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "liquidation_blocked": False,
        "message": "AICTE NOC verified. Lien released in Core Banking System."
    }


# =============================================================================
# ENDPOINTS
# =============================================================================
@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "bank-gateway",
        "uptime_seconds": int(time.time() - start_time),
        "supported_banks": [b["bank_code"] for b in PARTICIPATING_BANKS],
        "active_cbs_records": len(MOCK_CBS_LEDGER),
        "nesl_gateway_status": "CONNECTED"
    }


@app.get("/metrics")
def metrics():
    uptime = time.time() - start_time
    return (
        f"# HELP aicte_cbs_verifications_total Total FDR CBS verification requests\n"
        f"# TYPE aicte_cbs_verifications_total counter\n"
        f"aicte_cbs_verifications_total {metric_verifications}\n"
        f"# HELP aicte_cbs_liens_marked_total Total liens successfully marked\n"
        f"# TYPE aicte_cbs_liens_marked_total counter\n"
        f"aicte_cbs_liens_marked_total {metric_liens_marked}\n"
        f"# HELP aicte_cbs_liens_released_total Total liens released with NOC\n"
        f"# TYPE aicte_cbs_liens_released_total counter\n"
        f"aicte_cbs_liens_released_total {metric_liens_released}\n"
        f"# HELP aicte_cbs_webhook_events_total Webhook notifications dispatched\n"
        f"# TYPE aicte_cbs_webhook_events_total counter\n"
        f"aicte_cbs_webhook_events_total {metric_webhook_dispatches}\n"
        f"# HELP aicte_cbs_nesl_verifications_total Total NeSL MT760 messages verified\n"
        f"# TYPE aicte_cbs_nesl_verifications_total counter\n"
        f"aicte_cbs_nesl_verifications_total {metric_nesl_verifications}\n"
        f"# HELP aicte_cbs_uptime_seconds Process uptime\n"
        f"# TYPE aicte_cbs_uptime_seconds gauge\n"
        f"aicte_cbs_uptime_seconds {uptime:.1f}\n"
    )


@app.get("/api/v1/cbs/banks")
def list_participating_banks():
    """Lists all Scheduled Commercial Banks integrated into the AICTE FDR Gateway."""
    return {
        "total_banks": len(PARTICIPATING_BANKS),
        "banks": PARTICIPATING_BANKS
    }


@app.get("/api/v1/cbs/fdrs")
def query_commercial_bank_ledger(
    bank_code: Optional[str] = None,
    is_lien_marked: Optional[bool] = None,
    search: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = 50,
    offset: int = 0
):
    """Searches and filters deposits across the simulated commercial bank ledgers."""
    results = list(MOCK_CBS_LEDGER.values())

    if bank_code:
        results = [f for f in results if f.get("bank_code", "").upper() == bank_code.upper()]
    if is_lien_marked is not None:
        results = [f for f in results if f.get("is_lien_marked") == is_lien_marked]
    if min_amount is not None:
        results = [f for f in results if f.get("principal_amount", 0) >= min_amount]
    if max_amount is not None:
        results = [f for f in results if f.get("principal_amount", 0) <= max_amount]
    if search:
        s_lower = search.lower()
        results = [
            f for f in results
            if s_lower in f.get("fdr_number", "").lower()
            or s_lower in f.get("account_number", "").lower()
            or any(s_lower in holder.lower() for holder in f.get("account_holders", []))
        ]

    return {
        "total": len(results),
        "limit": limit,
        "offset": offset,
        "items": results[offset:offset + limit]
    }


@app.post("/api/v1/cbs/verify-fdr")
def verify_fdr(req: VerifyFDRRequest):
    global metric_verifications
    metric_verifications += 1

    fdr = MOCK_CBS_LEDGER.get(req.fdr_number)
    if not fdr:
        if req.fdr_number.startswith("MOCK-"):
            return {
                "verified": True,
                "cbs_status": "AUTHENTIC",
                "bank_code": req.bank_code,
                "fdr_number": req.fdr_number,
                "account_number": "MOCK" + str(uuid.uuid4().int)[:10],
                "branch_ifsc": req.expected_ifsc or f"{req.bank_code}0001234",
                "principal_amount": req.expected_amount or 1500000.0,
                "is_lien_marked": False,
                "auto_renewal": True,
                "message": "FDR record verified against Core Banking System."
            }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"FDR number '{req.fdr_number}' not found in {req.bank_code} Core Banking System."
        )

    amount_matched = True
    if req.expected_amount and abs(fdr["principal_amount"] - req.expected_amount) > 0.01:
        amount_matched = False

    return {
        "verified": True,
        "cbs_status": "AUTHENTIC",
        "bank_code": fdr["bank_code"],
        "fdr_number": fdr["fdr_number"],
        "account_number": fdr["account_number"],
        "branch_ifsc": fdr["branch_ifsc"],
        "branch_name": fdr.get("branch_name", "Main Branch"),
        "account_holders": fdr.get("account_holders", []),
        "principal_amount": fdr["principal_amount"],
        "currency": fdr.get("currency", "INR"),
        "deposit_date": fdr.get("deposit_date"),
        "maturity_date": fdr.get("maturity_date"),
        "interest_rate": fdr.get("interest_rate", 7.10),
        "is_lien_marked": fdr["is_lien_marked"],
        "lien_holder": fdr.get("lien_holder"),
        "lien_reference_number": fdr.get("lien_reference_number"),
        "auto_renewal": fdr.get("auto_renewal", True),
        "amount_matched": amount_matched,
        "message": "FDR is active and verified with bank ledger."
    }


@app.post("/api/v1/cbs/mark-lien")
def mark_lien(req: MarkLienRequest):
    global metric_liens_marked
    res = execute_digital_lien_encumbrance(
        bank_code=req.bank_code,
        fdr_number=req.fdr_number,
        lien_in_favor_of=req.lien_in_favor_of,
        aicte_order_number=req.aicte_order_number
    )
    metric_liens_marked += 1
    return res


@app.post("/api/v1/cbs/release-lien")
def release_lien(req: ReleaseLienRequest):
    global metric_liens_released
    res = process_statutory_lien_revocation(
        bank_code=req.bank_code,
        fdr_number=req.fdr_number,
        lien_reference_number=req.lien_reference_number,
        noc_reference_number=req.noc_reference_number
    )
    metric_liens_released += 1
    return res


@app.post("/api/v1/cbs/nesl/verify-mt760")
def verify_nesl_mt760_payload(req: NeSLMT760VerificationRequest):
    """
    Validates National E-Governance Services Ltd (NeSL) SFMS MT760 digital bank guarantee
    payload or statutory electronic lien confirmation.
    """
    global metric_nesl_verifications
    metric_nesl_verifications += 1

    fdr = MOCK_CBS_LEDGER.get(req.fdr_or_bg_number)
    fdr_present = fdr is not None

    return {
        "status": "AUTHENTIC_SFMS_MT760",
        "sfms_message_id": req.sfms_message_id,
        "fdr_or_bg_number": req.fdr_or_bg_number,
        "issuing_bank_ifsc": req.issuing_bank_ifsc,
        "guarantee_amount": req.guarantee_amount,
        "beneficiary": req.beneficiary_name,
        "nesl_digital_token": f"NESL-CERT-{uuid.uuid4().hex[:16].upper()}",
        "cbs_ledger_matched": fdr_present,
        "verified_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "regulatory_compliance": "RBI Master Direction on Guarantees & SFMS MT760 Protocols"
    }


@app.post("/api/v1/cbs/webhook/dispatch")
def webhook_dispatch(req: WebhookDispatchRequest):
    global metric_webhook_dispatches
    metric_webhook_dispatches += 1
    return {
        "dispatched": True,
        "event_id": str(uuid.uuid4()),
        "event_type": req.event_type,
        "fdr_number": req.fdr_number,
        "timestamp": time.time(),
        "status": "DELIVERED_TO_KAFKA_AND_FDR_SERVICE"
    }


@app.get("/api/v1/cbs/fdr/{fdr_number}")
def get_cbs_fdr(fdr_number: str):
    fdr = MOCK_CBS_LEDGER.get(fdr_number)
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found in CBS")
    return fdr


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
