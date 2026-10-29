"""
SIH Problem Statement 26265: Streamline of security deposit / FDR portal for AICTE
Audit Service (Cryptographic Ledger & Merkle Verification API)
File: src/audit-service/main.py
"""

import os
import json
import time
import asyncio
from typing import Dict, Any, List, Optional, Set
from fastapi import FastAPI, HTTPException, Request, status, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from merkle import HashLedgerEngine, MerkleTree, compute_cryptographic_sha256_digest

app = FastAPI(
    title="AICTE FDR Audit & Merkle Ledger Service",
    description="Tamper-evident cryptographic ledger maintaining chained state transitions, Section 65B certificates, and Merkle roots for FDR records.",
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

# Global in-memory ledger instance
ledger = HashLedgerEngine()

# Active SSE subscriber queues for real-time ledger event streaming
audit_event_subscribers: Set[asyncio.Queue] = set()

# Metrics counters
metric_events_recorded = 0
metric_verifications_performed = 0
metric_tamper_alerts = 0
start_time = time.time()


class AuditRecordRequest(BaseModel):
    record_id: str = Field(..., description="UUID or ID of the entity (FDR, Lien, etc.)")
    entity_name: str = Field(..., description="Target table or domain entity (e.g. fdr_records)")
    action_type: str = Field(..., description="Action (e.g. SUBMITTED, LIEN_MARKED, NOC_RELEASED)")
    actor_id: str = Field(..., description="User ID, Bank ID, or background worker")
    payload: Dict[str, Any] = Field(..., description="Event payload snapshot")


class MerkleProofVerificationRequest(BaseModel):
    target_hash: str = Field(..., description="SHA-256 hash of the target block or state")
    proof: List[Dict[str, str]] = Field(..., description="Ordered list of sibling hashes with direction")
    expected_root: str = Field(..., description="Merkle root against which inclusion is verified")


def broadcast_live_ledger_block(block_dict: Dict[str, Any]):
    """Dispatches newly appended ledger block to all active SSE subscribers."""
    for subscriber_queue in list(audit_event_subscribers):
        try:
            subscriber_queue.put_nowait(block_dict)
        except Exception:
            audit_event_subscribers.discard(subscriber_queue)


@app.get("/health")
def health_check():
    valid, err = ledger.verify_cryptographic_ledger_tamper_evidence()
    return {
        "status": "UP" if valid else "DEGRADED",
        "service": "audit-service",
        "uptime_seconds": int(time.time() - start_time),
        "chain_length": len(ledger.chain),
        "ledger_intact": valid,
        "error": err,
        "active_sse_streams": len(audit_event_subscribers)
    }


@app.get("/metrics")
def metrics_endpoint():
    """Prometheus exposition format metrics"""
    uptime = time.time() - start_time
    valid, _ = ledger.verify_cryptographic_ledger_tamper_evidence()
    return (
        f"# HELP aicte_audit_events_total Total number of audit events recorded\n"
        f"# TYPE aicte_audit_events_total counter\n"
        f"aicte_audit_events_total {metric_events_recorded}\n"
        f"# HELP aicte_audit_verifications_total Total verification checks executed\n"
        f"# TYPE aicte_audit_verifications_total counter\n"
        f"aicte_audit_verifications_total {metric_verifications_performed}\n"
        f"# HELP aicte_audit_tamper_alerts_total Total tamper anomalies detected\n"
        f"# TYPE aicte_audit_tamper_alerts_total counter\n"
        f"aicte_audit_tamper_alerts_total {metric_tamper_alerts}\n"
        f"# HELP aicte_audit_chain_length Current height of the cryptographic hash chain\n"
        f"# TYPE aicte_audit_chain_length gauge\n"
        f"aicte_audit_chain_length {len(ledger.chain)}\n"
        f"# HELP aicte_audit_ledger_status Boolean status 1 for intact, 0 for broken\n"
        f"# TYPE aicte_audit_ledger_status gauge\n"
        f"aicte_audit_ledger_status {1 if valid else 0}\n"
        f"# HELP aicte_audit_uptime_seconds Process uptime\n"
        f"# TYPE aicte_audit_uptime_seconds gauge\n"
        f"aicte_audit_uptime_seconds {uptime:.1f}\n"
    )


@app.post("/api/v1/audit/record", status_code=status.HTTP_201_CREATED)
def record_event(req: AuditRecordRequest):
    global metric_events_recorded
    block = ledger.append_audit_event_record(
        record_id=req.record_id,
        entity_name=req.entity_name,
        action_type=req.action_type,
        actor_id=req.actor_id,
        payload=req.payload
    )
    metric_events_recorded += 1

    # Broadcast block to live SSE listeners
    broadcast_live_ledger_block(block.to_dict())

    return {
        "success": True,
        "block_height": block.block_height,
        "block_hash": block.current_block_hash,
        "previous_hash": block.previous_block_hash,
        "merkle_root": ledger.compute_composite_merkle_root()
    }


@app.get("/api/v1/audit/chain")
def get_audit_chain(
    record_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    action_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Retrieves paginated audit chain with optional domain filters."""
    filtered_blocks = ledger.chain
    if record_id:
        filtered_blocks = [b for b in filtered_blocks if b.record_id == record_id]
    if entity_name:
        filtered_blocks = [b for b in filtered_blocks if b.entity_name.lower() == entity_name.lower()]
    if action_type:
        filtered_blocks = [b for b in filtered_blocks if b.action_type.upper() == action_type.upper()]
    if actor_id:
        filtered_blocks = [b for b in filtered_blocks if actor_id.lower() in b.actor_id.lower()]

    blocks = [b.to_dict() for b in filtered_blocks[offset:offset + limit]]
    return {
        "total_blocks": len(filtered_blocks),
        "total_chain_height": len(ledger.chain),
        "limit": limit,
        "offset": offset,
        "blocks": blocks
    }


@app.get("/api/v1/audit/verify")
def verify_audit_chain():
    """Mathematically validates complete SHA-256 hash chaining and payload integrity."""
    global metric_verifications_performed, metric_tamper_alerts
    metric_verifications_performed += 1
    valid, err = ledger.verify_cryptographic_ledger_tamper_evidence()
    if not valid:
        metric_tamper_alerts += 1
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cryptographic integrity violation: {err}"
        )
    return {
        "status": "SECURE",
        "chain_length": len(ledger.chain),
        "merkle_root": ledger.compute_composite_merkle_root(),
        "verification_timestamp": time.time(),
        "message": "All blocks pass SHA-256 parent hash linkage and content integrity verification."
    }


@app.get("/api/v1/audit/merkle-root")
def get_merkle_root():
    return {
        "merkle_root": ledger.compute_composite_merkle_root(),
        "block_count": len(ledger.chain)
    }


@app.get("/api/v1/audit/proof/{record_id}")
def get_inclusion_proof(record_id: str):
    """Derives Merkle binary inclusion proof for the target record."""
    matching_block = None
    for b in reversed(ledger.chain):
        if b.record_id == record_id:
            matching_block = b
            break

    if not matching_block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No audit block found for record_id {record_id}"
        )

    tree = ledger.get_merkle_tree()
    proof = tree.derive_merkle_binary_inclusion_proof(matching_block.current_block_hash)
    if proof is None:
        raise HTTPException(status_code=500, detail="Failed to construct Merkle proof")

    return {
        "record_id": record_id,
        "block_height": matching_block.block_height,
        "block_hash": matching_block.current_block_hash,
        "merkle_root": tree.root_hash,
        "proof": proof,
        "verified": MerkleTree.verify_proof(matching_block.current_block_hash, proof, tree.root_hash)
    }


@app.post("/api/v1/audit/verify-proof")
def verify_external_proof(req: MerkleProofVerificationRequest):
    """Verifies arbitrary Merkle tree inclusion proof against an expected root."""
    is_valid = MerkleTree.verify_merkle_binary_inclusion_proof(
        target_hash=req.target_hash,
        proof=req.proof,
        expected_root=req.expected_root
    )
    return {
        "verified": is_valid,
        "target_hash": req.target_hash,
        "expected_root": req.expected_root,
        "status": "PROOF_VALID" if is_valid else "PROOF_INVALID"
    }


@app.get("/api/v1/audit/certificate/{record_id}")
def generate_evidentiary_certificate(record_id: str):
    """Generates Section 65B Indian Evidence Act compliant digital certificate."""
    cert = ledger.generate_section65b_evidentiary_certificate(record_id)
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record '{record_id}' not found in audit ledger."
        )
    return cert


@app.get("/api/v1/audit/stream")
async def stream_audit_ledger_events(request: Request):
    """
    Server-Sent Events (SSE) streaming endpoint broadcasting live cryptographic
    ledger blocks, Merkle root updates, and block height transitions in real-time.
    """
    subscriber_queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    audit_event_subscribers.add(subscriber_queue)

    async def event_generator():
        try:
            # Yield initial connection handshake
            init_payload = {
                "event": "CONNECTED",
                "current_block_height": len(ledger.chain),
                "merkle_root": ledger.compute_composite_merkle_root(),
                "timestamp": time.time()
            }
            yield f"event: connected\ndata: {json.dumps(init_payload)}\n\n"

            # Yield recent blocks (up to 3) so client UI initializes immediately
            recent_blocks = [b.to_dict() for b in ledger.chain[-3:]]
            for block_item in recent_blocks:
                yield f"event: block\ndata: {json.dumps(block_item)}\n\n"

            # Live event listening loop
            while True:
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next block event with periodic heartbeat timeout
                    block_data = await asyncio.wait_for(subscriber_queue.get(), timeout=10.0)
                    yield f"event: block\ndata: {json.dumps(block_data)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat keep-alive frame
                    heartbeat_data = {
                        "event": "HEARTBEAT",
                        "block_count": len(ledger.chain),
                        "merkle_root": ledger.compute_composite_merkle_root(),
                        "timestamp": time.time()
                    }
                    yield f"event: heartbeat\ndata: {json.dumps(heartbeat_data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            audit_event_subscribers.discard(subscriber_queue)

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)
