"""
Integration and Unit Tests for AICTE FDR Smart Portal Microservices
File: tests/test_services.py
"""

import os
import sys
import importlib.util
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Ensure audit-service path is present for internal imports like 'from merkle import ...'
sys.path.insert(0, os.path.join(BASE_DIR, "src", "audit-service"))

def load_module_from_file(module_name: str, file_path: str):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

audit_merkle = load_module_from_file("audit_merkle", os.path.join(BASE_DIR, "src", "audit-service", "merkle.py"))
audit_service = load_module_from_file("audit_service", os.path.join(BASE_DIR, "src", "audit-service", "main.py"))
bank_service = load_module_from_file("bank_service", os.path.join(BASE_DIR, "src", "bank-gateway", "main.py"))
ocr_service = load_module_from_file("ocr_service", os.path.join(BASE_DIR, "src", "ocr-service", "main.py"))
fdr_service = load_module_from_file("fdr_service", os.path.join(BASE_DIR, "src", "fdr-service", "main.py"))


# =============================================================================
# 1. AUDIT SERVICE & MERKLE TESTS
# =============================================================================
def test_merkle_tree_and_ledger():
    ledger = audit_merkle.HashLedgerEngine()
    b1 = ledger.record_event(
        record_id="FDR-TEST-001",
        entity_name="fdr_records",
        action_type="SUBMITTED",
        actor_id="COLLEGE-01",
        payload={"amount": 2500000}
    )
    b2 = ledger.record_event(
        record_id="FDR-TEST-001",
        entity_name="lien_records",
        action_type="LIEN_MARKED",
        actor_id="BANK-SBI",
        payload={"lien_ref": "LIEN-001"}
    )

    valid, err = ledger.verify_integrity()
    assert valid is True
    assert err is None

    tree = ledger.get_merkle_tree()
    proof = tree.get_proof(b1.current_block_hash)
    assert proof is not None
    assert audit_merkle.MerkleTree.verify_proof(b1.current_block_hash, proof, tree.root_hash) is True


def test_audit_api_endpoints():
    client = TestClient(audit_service.app)
    
    # Test Health
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "UP"

    # Test Record
    resp = client.post("/api/v1/audit/record", json={
        "record_id": "REC-9999",
        "entity_name": "fdr_records",
        "action_type": "TEST_ACTION",
        "actor_id": "TEST_ACTOR",
        "payload": {"key": "value"}
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert "merkle_root" in data

    # Test Verification
    v_resp = client.get("/api/v1/audit/verify")
    assert v_resp.status_code == 200
    assert v_resp.json()["status"] == "SECURE"

    # Test Proof
    p_resp = client.get("/api/v1/audit/proof/REC-9999")
    assert p_resp.status_code == 200
    assert p_resp.json()["verified"] is True


# =============================================================================
# 2. BANK GATEWAY TESTS
# =============================================================================
def test_bank_gateway_workflow():
    client = TestClient(bank_service.app)

    # Health
    h_resp = client.get("/health")
    assert h_resp.status_code == 200

    # Verify existing FDR
    v_resp = client.post("/api/v1/cbs/verify-fdr", json={
        "bank_code": "SBI",
        "fdr_number": "SBI-FDR-778899"
    })
    assert v_resp.status_code == 200
    assert v_resp.json()["cbs_status"] == "AUTHENTIC"
    assert v_resp.json()["principal_amount"] == 3500000.0

    # Mark Lien
    m_resp = client.post("/api/v1/cbs/mark-lien", json={
        "bank_code": "SBI",
        "fdr_number": "SBI-FDR-778899",
        "lien_in_favor_of": "Member Secretary, AICTE New Delhi",
        "aicte_order_number": "AICTE-TEST-ORD-01"
    })
    assert m_resp.status_code == 200
    lien_ref = m_resp.json()["lien_reference_number"]
    assert lien_ref.startswith("LIEN-SBI-")

    # Duplicate lien marking should fail with 409
    dup_resp = client.post("/api/v1/cbs/mark-lien", json={
        "bank_code": "SBI",
        "fdr_number": "SBI-FDR-778899",
        "aicte_order_number": "AICTE-TEST-ORD-02"
    })
    assert dup_resp.status_code == 409

    # Release Lien
    rel_resp = client.post("/api/v1/cbs/release-lien", json={
        "bank_code": "SBI",
        "fdr_number": "SBI-FDR-778899",
        "lien_reference_number": lien_ref,
        "noc_reference_number": "NOC-2026-TEST",
        "approval_token": "TOKEN_OK"
    })
    assert rel_resp.status_code == 200
    assert rel_resp.json()["status"] == "LIEN_RELEASED_SUCCESS"


# =============================================================================
# 3. OCR & FORENSIC TESTS
# =============================================================================
def test_ocr_and_fraud_detection():
    client = TestClient(ocr_service.app)

    # Clean document
    clean_resp = client.post("/api/v1/ocr/extract-and-verify", json={
        "declared_fdr_number": "SBI-FDR-778899",
        "declared_amount": 3500000.0,
        "declared_bank_name": "SBI"
    })
    assert clean_resp.status_code == 200
    data = clean_resp.json()
    assert data["forensic_analysis"]["flag"] == "CLEAN"
    assert data["forensic_analysis"]["fraud_risk_score"] < 25.0
    assert data["confidence_score"] > 0.90

    # Fraudulent / Tampered document
    fraud_resp = client.post("/api/v1/ocr/extract-and-verify", json={
        "declared_fdr_number": "FAKE-FDR-FRAUD-001",
        "declared_amount": 5000000.0
    })
    assert fraud_resp.status_code == 200
    fdata = fraud_resp.json()
    assert fdata["forensic_analysis"]["fraud_risk_score"] > 70.0
    assert fdata["forensic_analysis"]["digit_misalignment_detected"] is True
    assert fdata["forensic_analysis"]["requires_manual_review"] is True


# =============================================================================
# 4. FDR CORE SERVICE TESTS
# =============================================================================
def test_fdr_core_service():
    client = TestClient(fdr_service.app)

    # Health
    h_resp = client.get("/health")
    assert h_resp.status_code == 200

    # Submit FDR
    sub_resp = client.post("/api/v1/fdr/submit", json={
        "institution_id": "99999999-9999-9999-9999-999999999999",
        "aicte_permanent_id": "1-432567891",
        "bank_code": "SBI",
        "branch_ifsc": "SBIN0000691",
        "fdr_number": "SBI-FDR-889900",
        "account_number": "30198273641",
        "principal_amount": 3500000.0,
        "deposit_date": "2024-04-01",
        "maturity_date": "2029-04-01",
        "interest_rate": 7.10,
        "joint_holder_primary": "Bharat Institute of Technology",
        "joint_holder_secondary": "Member Secretary, AICTE New Delhi"
    })
    assert sub_resp.status_code == 201
    fdr_id = sub_resp.json()["fdr_id"]

    # Detail query
    get_resp = client.get(f"/api/v1/fdr/{fdr_id}")
    assert get_resp.status_code == 200
    current_status = get_resp.json()["fdr"]["status"]
    # Due to background task in TestClient, status has progressed to LIEN_MARKED or SUBMITTED
    assert current_status in ["SUBMITTED", "OCR_VERIFIED", "LIEN_MARKED"]

    # If it reached LIEN_MARKED via background task, transition to AICTE_APPROVED
    if current_status == "LIEN_MARKED":
        t1_resp = client.post(f"/api/v1/fdr/{fdr_id}/transition", json={
            "to_status": "AICTE_APPROVED",
            "actor_id": "AICTE_RO_OFFICER",
            "reason": "CBS lien verified and certificate archived"
        })
        assert t1_resp.status_code == 200
        assert t1_resp.json()["current_status"] == "AICTE_APPROVED"

        # Illegal transition: AICTE_APPROVED -> OCR_PROCESSING should fail
        bad_resp = client.post(f"/api/v1/fdr/{fdr_id}/transition", json={
            "to_status": "OCR_PROCESSING",
            "actor_id": "ADMIN"
        })
        assert bad_resp.status_code == 400
    else:
        # If still in SUBMITTED
        t1_resp = client.post(f"/api/v1/fdr/{fdr_id}/transition", json={
            "to_status": "OCR_PROCESSING",
            "actor_id": "OCR_WORKER",
            "reason": "Manual OCR initiated"
        })
        assert t1_resp.status_code == 200

    # Summary stats
    stats_resp = client.get("/api/v1/fdr/stats/summary")
    assert stats_resp.status_code == 200
    assert stats_resp.json()["total_fdr_count"] >= 2


# =============================================================================
# 5. EDGE CASE TESTS: COURT INJUNCTION & LEGAL FREEZE (DISPUTE_FROZEN)
# =============================================================================
def test_court_injunction_and_dispute_freeze():
    client = TestClient(fdr_service.app)
    fdr_id = "fdr-demo-001"

    # Step 1: Legal Bureau receives High Court Injunction -> Freeze FDR
    freeze_resp = client.post(f"/api/v1/fdr/{fdr_id}/transition", json={
        "to_status": "DISPUTE_FROZEN",
        "actor_id": "AICTE_LEGAL_ADVISOR",
        "reason": "High Court Injunction WP-4412/2026 stay order received"
    })
    assert freeze_resp.status_code == 200
    assert freeze_resp.json()["current_status"] == "DISPUTE_FROZEN"

    # Step 2: Attempt illegal transition to RELEASE_REQUESTED while frozen -> must fail with HTTP 400
    bad_resp = client.post(f"/api/v1/fdr/{fdr_id}/transition", json={
        "to_status": "RELEASE_REQUESTED",
        "actor_id": "COLLEGE_TRUSTEE",
        "reason": "Attempt unauthorized withdrawal during stay"
    })
    assert bad_resp.status_code == 400
    assert "Illegal transition" in bad_resp.json()["detail"]

    # Step 3: High Court vacates stay order -> Legal Bureau unfreezes back to AICTE_APPROVED
    unfreeze_resp = client.post(f"/api/v1/fdr/{fdr_id}/transition", json={
        "to_status": "AICTE_APPROVED",
        "actor_id": "AICTE_LEGAL_ADVISOR",
        "reason": "Court Order Vacated WP-4412/2026; restored to operational status"
    })
    assert unfreeze_resp.status_code == 200
    assert unfreeze_resp.json()["current_status"] == "AICTE_APPROVED"


# =============================================================================
# 6. ENHANCED FEATURES: AUDIT SSE STREAM, SECTION 65B & PROOF VERIFICATION
# =============================================================================
def test_audit_sse_and_certificate():
    client = TestClient(audit_service.app)

    # 1. Section 65B Evidentiary Certificate
    cert_resp = client.get("/api/v1/audit/certificate/REC-9999")
    assert cert_resp.status_code == 200
    cert = cert_resp.json()
    assert "Section 65B" in cert["statutory_act"]
    assert cert["record_id"] == "REC-9999"
    assert "block_sha256_digest" in cert

    # 2. External Proof Verification
    proof_resp = client.get("/api/v1/audit/proof/REC-9999")
    proof_data = proof_resp.json()

    verify_proof_resp = client.post("/api/v1/audit/verify-proof", json={
        "target_hash": proof_data["block_hash"],
        "proof": proof_data["proof"],
        "expected_root": proof_data["merkle_root"]
    })
    assert verify_proof_resp.status_code == 200
    assert verify_proof_resp.json()["verified"] is True
    assert verify_proof_resp.json()["status"] == "PROOF_VALID"

    # 3. Server-Sent Events (SSE) Stream
    with client.stream("GET", "/api/v1/audit/stream") as stream_resp:
        assert stream_resp.status_code == 200
        assert "text/event-stream" in stream_resp.headers["content-type"]
        line_count = 0
        for line in stream_resp.iter_lines():
            line_count += 1
            if line_count > 3:
                break


# =============================================================================
# 7. ENHANCED FEATURES: BANK GATEWAY LIST, FILTERS & NeSL MT760
# =============================================================================
def test_bank_gateway_enhanced_features():
    client = TestClient(bank_service.app)

    # 1. Participating Banks List
    banks_resp = client.get("/api/v1/cbs/banks")
    assert banks_resp.status_code == 200
    banks = banks_resp.json()["banks"]
    assert len(banks) >= 5
    bank_codes = [b["bank_code"] for b in banks]
    assert "SBI" in bank_codes
    assert "PNB" in bank_codes
    assert "HDFC" in bank_codes
    assert "CANARA" in bank_codes
    assert "BOB" in bank_codes

    # 2. Query CBS FDRs with filtering
    query_resp = client.get("/api/v1/cbs/fdrs?bank_code=SBI")
    assert query_resp.status_code == 200
    assert query_resp.json()["total"] >= 1
    for item in query_resp.json()["items"]:
        assert item["bank_code"] == "SBI"

    # 3. NeSL SFMS MT760 Digital Guarantee Verification
    nesl_resp = client.post("/api/v1/cbs/nesl/verify-mt760", json={
        "sfms_message_id": "SFMS-MT760-2026-TEST-01",
        "issuing_bank_ifsc": "SBIN0000691",
        "fdr_or_bg_number": "SBI-FDR-778899",
        "beneficiary_name": "Member Secretary, AICTE New Delhi",
        "guarantee_amount": 3500000.0,
        "digital_signature_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    })
    assert nesl_resp.status_code == 200
    assert nesl_resp.json()["status"] == "AUTHENTIC_SFMS_MT760"
    assert "nesl_digital_token" in nesl_resp.json()


# =============================================================================
# 8. ENHANCED FEATURES: FDR REGIONAL QUERIES, STATUTORY RULES & SSE STREAM
# =============================================================================
def test_fdr_sse_and_regional_queries():
    client = TestClient(fdr_service.app)

    # 1. Institutions Catalog
    inst_resp = client.get("/api/v1/fdr/institutions")
    assert inst_resp.status_code == 200
    assert inst_resp.json()["total"] >= 20

    # 2. All 8 AICTE Regions Summary
    reg_resp = client.get("/api/v1/fdr/regions")
    assert reg_resp.status_code == 200
    regions = reg_resp.json()["regions"]
    region_names = {r["region"] for r in regions}
    expected_regions = {
        "Northern", "North-Western", "Central", "Western",
        "Eastern", "Southern", "South-Western", "South-Central"
    }
    assert expected_regions.issubset(region_names)

    # 3. Statutory Deposit Thresholds
    thresh_resp = client.get("/api/v1/fdr/compliance/thresholds")
    assert thresh_resp.status_code == 200
    assert "ENGINEERING_UG" in thresh_resp.json()["rules"]
    assert thresh_resp.json()["rules"]["ENGINEERING_UG"]["minimum_deposit_inr"] == 3500000.0

    # 4. Deposit Quantum Validation Endpoint
    val_resp = client.post("/api/v1/fdr/validate-quantum", json={
        "principal_amount": 3500000.0,
        "programme_category": "ENGINEERING_UG"
    })
    assert val_resp.status_code == 200
    assert val_resp.json()["is_compliant"] is True

    # 5. Filter FDRs by Region and Status
    fdr_query = client.get("/api/v1/fdr?region=Northern")
    assert fdr_query.status_code == 200
    assert fdr_query.json()["total"] >= 3

    # 6. FDR Server-Sent Events (SSE) Stream
    with client.stream("GET", "/api/v1/fdr/stream") as fdr_stream:
        assert fdr_stream.status_code == 200
        assert "text/event-stream" in fdr_stream.headers["content-type"]
        line_count = 0
        for line in fdr_stream.iter_lines():
            line_count += 1
            if line_count > 3:
                break


# =============================================================================
# 9. ENHANCED FEATURES: OCR BATCH FORENSIC INSPECTION
# =============================================================================
def test_ocr_batch_inspection():
    client = TestClient(ocr_service.app)

    batch_resp = client.post("/api/v1/ocr/batch-inspect", json={
        "documents": [
            {
                "declared_fdr_number": "SBI-FDR-778899",
                "declared_amount": 3500000.0,
                "declared_bank_name": "SBI"
            },
            {
                "declared_fdr_number": "FAKE-FDR-FRAUD-999",
                "declared_amount": 10000000.0
            }
        ]
    })
    assert batch_resp.status_code == 200
    data = batch_resp.json()
    assert data["total_documents_processed"] == 2
    assert data["clean_count"] == 1
    assert data["flagged_count"] == 1
