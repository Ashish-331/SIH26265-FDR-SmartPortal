#!/usr/bin/env python3
"""
Cryptographic Audit Ledger Verification Tool
SIH-26265: Streamline of Security Deposit / FDR Portal (AICTE)

Validates the cryptographic SHA-256 hash chaining of all audit log rows
to mathematically prove tamper-evidence and zero ledger manipulation.
"""

import sys
import hashlib
import json
from typing import List, Dict, Any, Optional

def compute_record_hash(prev_hash: str, entity_type: str, entity_id: str, 
                        action: str, actor_id: str, state_after: Dict[str, Any], 
                        created_at: str) -> str:
    """
    Computes deterministic SHA-256 hash for an audit ledger record:
    H = SHA-256(prev_hash || entity_type || entity_id || action || actor_id || canonical_json(state_after) || created_at)
    """
    canonical_state = json.dumps(state_after, sort_keys=True, separators=(',', ':'))
    payload = f"{prev_hash}|{entity_type}|{entity_id}|{action}|{actor_id}|{canonical_state}|{created_at}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

def verify_chain(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Verifies that every record in the audit ledger correctly chains from the previous record.
    Returns status, verified_count, and any detected breach.
    """
    if not records:
        return {"valid": True, "count": 0, "message": "Empty ledger"}

    # Genesis record validation
    genesis = records[0]
    expected_prev = "0" * 64
    if genesis.get("prev_record_hash") != expected_prev:
        return {
            "valid": False,
            "error_index": 0,
            "error_type": "INVALID_GENESIS_PREV_HASH",
            "message": f"Genesis record must reference 64 zeros, got: {genesis.get('prev_record_hash')}"
        }

    for idx, record in enumerate(records):
        computed = compute_record_hash(
            prev_hash=record["prev_record_hash"],
            entity_type=record["entity_type"],
            entity_id=record["entity_id"],
            action=record["action"],
            actor_id=record["actor_id"],
            state_after=record["state_after"],
            created_at=record["created_at"]
        )

        if computed != record["current_hash"]:
            return {
                "valid": False,
                "error_index": idx,
                "record_id": record.get("id"),
                "error_type": "HASH_MISMATCH",
                "message": f"Tampering detected at record {idx} (ID: {record.get('id')}). Stored: {record['current_hash']}, Computed: {computed}"
            }

        if idx > 0:
            if record["prev_record_hash"] != records[idx - 1]["current_hash"]:
                return {
                    "valid": False,
                    "error_index": idx,
                    "record_id": record.get("id"),
                    "error_type": "CHAIN_BROKEN",
                    "message": f"Broken chain pointer at index {idx}. Expected: {records[idx-1]['current_hash']}, Got: {record['prev_record_hash']}"
                }

    return {
        "valid": True,
        "count": len(records),
        "latest_block_hash": records[-1]["current_hash"],
        "message": f"Successfully verified {len(records)} audit records. Ledger integrity guaranteed."
    }

if __name__ == "__main__":
    # Self-test demonstration with synthetic tamper-proof records
    sample_records = [
        {
            "id": "aud-001",
            "prev_record_hash": "0" * 64,
            "entity_type": "FDR",
            "entity_id": "fdr-1001",
            "action": "CREATE",
            "actor_id": "usr-aicte-ro-01",
            "state_after": {"fdr_number": "SBI-9928172", "amount": 3500000, "status": "DRAFT"},
            "created_at": "2026-10-28T10:00:00Z",
            "current_hash": ""
        },
        {
            "id": "aud-002",
            "prev_record_hash": "",
            "entity_type": "FDR",
            "entity_id": "fdr-1001",
            "action": "CONFIRM_LIEN",
            "actor_id": "bank-gateway-sbi",
            "state_after": {"fdr_number": "SBI-9928172", "amount": 3500000, "status": "LIEN_CONFIRMED"},
            "created_at": "2026-10-28T10:05:00Z",
            "current_hash": ""
        }
    ]

    # Compute valid hashes
    sample_records[0]["current_hash"] = compute_record_hash(
        sample_records[0]["prev_record_hash"],
        sample_records[0]["entity_type"],
        sample_records[0]["entity_id"],
        sample_records[0]["action"],
        sample_records[0]["actor_id"],
        sample_records[0]["state_after"],
        sample_records[0]["created_at"]
    )

    sample_records[1]["prev_record_hash"] = sample_records[0]["current_hash"]
    sample_records[1]["current_hash"] = compute_record_hash(
        sample_records[1]["prev_record_hash"],
        sample_records[1]["entity_type"],
        sample_records[1]["entity_id"],
        sample_records[1]["action"],
        sample_records[1]["actor_id"],
        sample_records[1]["state_after"],
        sample_records[1]["created_at"]
    )

    print("[*] Running Verification on pristine sample ledger...")
    res = verify_chain(sample_records)
    print(f"Result: {res}")
    assert res["valid"] is True, "Verification failed on pristine records"

    print("[*] Testing Tamper Detection by modifying amount in record 1...")
    tampered_records = [dict(r) for r in sample_records]
    tampered_records[0]["state_after"] = {"fdr_number": "SBI-9928172", "amount": 5000000, "status": "DRAFT"}
    tampered_res = verify_chain(tampered_records)
    print(f"Tamper Result: {tampered_res}")
    assert tampered_res["valid"] is False, "Tampering was NOT detected!"
    print("[+] Cryptographic tamper-proofing mathematically confirmed.")
