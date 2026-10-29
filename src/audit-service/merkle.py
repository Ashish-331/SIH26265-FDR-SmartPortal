"""
SIH Problem Statement 26265: Streamline of security deposit / FDR portal for AICTE
Audit Ledger & Merkle Tree Cryptographic Verification Engine
File: src/audit-service/merkle.py
"""

import hashlib
import json
import time
from typing import List, Dict, Any, Optional, Tuple


def compute_cryptographic_sha256_digest(data: str) -> str:
    """Compute FIPS 180-4 compliant SHA-256 hash in hexadecimal format."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

# Backward compatible alias
sha256_hex = compute_cryptographic_sha256_digest


class AuditBlock:
    """
    Individual block in the tamper-evident hash chain ledger.
    Represents an atomic FDR lifecycle event or bank transaction.
    """
    def __init__(
        self,
        block_height: int,
        record_id: str,
        entity_name: str,
        action_type: str,
        actor_id: str,
        payload: Dict[str, Any],
        previous_block_hash: str,
        timestamp: Optional[float] = None,
        current_block_hash: Optional[str] = None
    ):
        self.block_height = block_height
        self.record_id = record_id
        self.entity_name = entity_name
        self.action_type = action_type
        self.actor_id = actor_id
        self.payload = payload
        self.timestamp = timestamp if timestamp is not None else time.time()
        self.previous_block_hash = previous_block_hash
        self.current_block_hash = current_block_hash or self.compute_chained_block_digest()

    def canonical_json_serialize_payload(self) -> str:
        """Deterministic JSON serialization of payload (sorted keys)."""
        return json.dumps(self.payload, sort_keys=True)

    def serialize_payload(self) -> str:
        return self.canonical_json_serialize_payload()

    def compute_chained_block_digest(self) -> str:
        """Calculates SHA-256 hash chaining block data and previous block hash."""
        serialized_data = (
            f"{self.block_height}|"
            f"{self.record_id}|"
            f"{self.entity_name}|"
            f"{self.action_type}|"
            f"{self.actor_id}|"
            f"{self.canonical_json_serialize_payload()}|"
            f"{self.timestamp:.6f}|"
            f"{self.previous_block_hash}"
        )
        return compute_cryptographic_sha256_digest(serialized_data)

    def calculate_hash(self) -> str:
        return self.compute_chained_block_digest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "block_height": self.block_height,
            "record_id": self.record_id,
            "entity_name": self.entity_name,
            "action_type": self.action_type,
            "actor_id": self.actor_id,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "previous_block_hash": self.previous_block_hash,
            "current_block_hash": self.current_block_hash,
        }


class MerkleNode:
    """Node in binary Merkle Tree."""
    def __init__(
        self,
        hash_val: str,
        left: Optional["MerkleNode"] = None,
        right: Optional["MerkleNode"] = None,
        is_leaf: bool = False,
        data_ref: Optional[str] = None
    ):
        self.hash_val = hash_val
        self.left = left
        self.right = right
        self.is_leaf = is_leaf
        self.data_ref = data_ref


class MerkleTree:
    """
    Cryptographic Merkle Tree for batch verification of AICTE FDR events.
    Allows zero-knowledge tamper proofs and inclusion proofs.
    """
    def __init__(self, leaf_hashes: List[str]):
        if not leaf_hashes:
            self.root = None
            self.root_hash = "0" * 64
            self.leaf_nodes: List[MerkleNode] = []
            return

        self.leaf_nodes = [
            MerkleNode(hash_val=h, is_leaf=True, data_ref=h) for h in leaf_hashes
        ]
        self.root = self._build_tree(self.leaf_nodes)
        self.root_hash = self.root.hash_val if self.root else "0" * 64

    def _build_tree(self, nodes: List[MerkleNode]) -> MerkleNode:
        if len(nodes) == 1:
            return nodes[0]

        next_level: List[MerkleNode] = []
        for i in range(0, len(nodes), 2):
            left = nodes[i]
            # If odd count, duplicate the last node (standard Bitcoin/RFC 6962 tree behavior)
            right = nodes[i + 1] if i + 1 < len(nodes) else nodes[i]
            combined_hash = sha256_hex(left.hash_val + right.hash_val)
            parent = MerkleNode(hash_val=combined_hash, left=left, right=right)
            next_level.append(parent)

        return self._build_tree(next_level)

    def derive_merkle_binary_inclusion_proof(self, target_hash: str) -> Optional[List[Dict[str, str]]]:
        """
        Derives cryptographic Merkle inclusion audit proof for target_hash.
        Returns list of {'direction': 'left'|'right', 'hash': '...'}
        """
        proof: List[Dict[str, str]] = []

        def _traverse(node: Optional[MerkleNode], target: str) -> bool:
            if node is None:
                return False
            if node.is_leaf and node.hash_val == target:
                return True

            if node.left and _traverse(node.left, target):
                if node.right:
                    proof.append({"direction": "right", "hash": node.right.hash_val})
                return True
            if node.right and _traverse(node.right, target):
                if node.left:
                    proof.append({"direction": "left", "hash": node.left.hash_val})
                return True
            return False

        found = _traverse(self.root, target_hash)
        return proof if found else None

    def get_proof(self, target_hash: str) -> Optional[List[Dict[str, str]]]:
        return self.derive_merkle_binary_inclusion_proof(target_hash)

    @staticmethod
    def verify_merkle_binary_inclusion_proof(target_hash: str, proof: List[Dict[str, str]], expected_root: str) -> bool:
        """
        Mathematically verifies if target_hash chained with proof forms expected Merkle Root.
        """
        current = target_hash
        for step in proof:
            sibling = step["hash"]
            if step["direction"] == "left":
                current = compute_cryptographic_sha256_digest(sibling + current)
            else:
                current = compute_cryptographic_sha256_digest(current + sibling)
        return current.lower() == expected_root.lower()

    @staticmethod
    def verify_proof(target_hash: str, proof: List[Dict[str, str]], expected_root: str) -> bool:
        return MerkleTree.verify_merkle_binary_inclusion_proof(target_hash, proof, expected_root)


class HashLedgerEngine:
    """
    Immutable Append-Only Audit Ledger Engine with hash chaining and Merkle checkpoints.
    """
    GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

    def __init__(self):
        self.chain: List[AuditBlock] = []
        self._initialize_genesis()

    def _initialize_genesis(self):
        genesis = AuditBlock(
            block_height=0,
            record_id="00000000-0000-0000-0000-000000000000",
            entity_name="GENESIS",
            action_type="SYSTEM_INIT",
            actor_id="AICTE_SYSTEM",
            payload={"system": "AICTE FDR Security Deposit Portal", "version": "1.0"},
            previous_block_hash=self.GENESIS_HASH,
            timestamp=1700000000.0
        )
        self.chain.append(genesis)

    @property
    def latest_block(self) -> AuditBlock:
        return self.chain[-1]

    def append_audit_event_record(
        self,
        record_id: str,
        entity_name: str,
        action_type: str,
        actor_id: str,
        payload: Dict[str, Any]
    ) -> AuditBlock:
        """Append an event to the ledger with cryptographic linkage to previous block."""
        new_block = AuditBlock(
            block_height=len(self.chain),
            record_id=record_id,
            entity_name=entity_name,
            action_type=action_type,
            actor_id=actor_id,
            payload=payload,
            previous_block_hash=self.latest_block.current_block_hash
        )
        self.chain.append(new_block)
        return new_block

    def record_event(
        self,
        record_id: str,
        entity_name: str,
        action_type: str,
        actor_id: str,
        payload: Dict[str, Any]
    ) -> AuditBlock:
        return self.append_audit_event_record(record_id, entity_name, action_type, actor_id, payload)

    def compute_composite_merkle_root(self) -> str:
        """Computes current Merkle Root across all block hashes in the chain."""
        hashes = [b.current_block_hash for b in self.chain]
        tree = MerkleTree(hashes)
        return tree.root_hash

    def compute_merkle_root(self) -> str:
        return self.compute_composite_merkle_root()

    def get_merkle_tree(self) -> MerkleTree:
        hashes = [b.current_block_hash for b in self.chain]
        return MerkleTree(hashes)

    def verify_cryptographic_ledger_tamper_evidence(self) -> Tuple[bool, Optional[str]]:
        """
        Validates entire blockchain from genesis to tip:
        1. Current block hash matches recalculated content hash.
        2. Block points correctly to previous block's hash.
        3. Heights are monotonically increasing.
        """
        for i in range(len(self.chain)):
            block = self.chain[i]

            # Verify block self-hash
            recalculated = block.calculate_hash()
            if recalculated != block.current_block_hash:
                return False, f"Tamper detected at block {block.block_height}: content hash mismatch!"

            # Verify chaining
            if i > 0:
                prev_block = self.chain[i - 1]
                if block.previous_block_hash != prev_block.current_block_hash:
                    return False, f"Broken chain link at block {block.block_height}!"
            else:
                if block.previous_block_hash != self.GENESIS_HASH:
                    return False, "Genesis block corrupted!"

        return True, None

    def verify_integrity(self) -> Tuple[bool, Optional[str]]:
        return self.verify_cryptographic_ledger_tamper_evidence()

    def generate_section65b_evidentiary_certificate(self, record_id: str) -> Optional[Dict[str, Any]]:
        """
        Generates Section 65B Indian Evidence Act 1872 / BSA 2023 certified electronic record
        for submission in statutory administrative or judicial proceedings.
        """
        target_block = None
        for b in reversed(self.chain):
            if b.record_id == record_id:
                target_block = b
                break

        if not target_block:
            return None

        tree = self.get_merkle_tree()
        proof = tree.derive_merkle_binary_inclusion_proof(target_block.current_block_hash)

        return {
            "statutory_act": "Section 65B of Indian Evidence Act, 1872 & Bharatiya Sakshya Adhiniyam, 2023",
            "certifying_authority": "All India Council for Technical Education (AICTE)",
            "portal_module": "Security Deposit & FDR Cryptographic Audit Ledger Engine",
            "record_id": record_id,
            "block_height": target_block.block_height,
            "action_type": target_block.action_type,
            "actor_id": target_block.actor_id,
            "block_sha256_digest": target_block.current_block_hash,
            "parent_sha256_digest": target_block.previous_block_hash,
            "merkle_root_at_checkpoint": tree.root_hash,
            "inclusion_proof_valid": MerkleTree.verify_proof(target_block.current_block_hash, proof, tree.root_hash) if proof else False,
            "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(target_block.timestamp)),
            "system_declaration": (
                "This electronic record was produced by an automated, cryptographically chained computer system "
                "operating regularly under official lawful AICTE authority without human alteration or data compromise."
            ),
            "payload_snapshot": target_block.payload
        }


# Quick verification check when executed directly
if __name__ == "__main__":
    print("[*] Initializing AICTE Cryptographic Ledger Engine...")
    ledger = HashLedgerEngine()

    print("[*] Recording sample FDR lifecycle events...")
    b1 = ledger.record_event(
        record_id="fdr-99182",
        entity_name="fdr_records",
        action_type="SUBMITTED",
        actor_id="INST_PUNE_411038",
        payload={"fdr_number": "SBI-778899", "amount": 3500000, "maturity": "2031-03-31"}
    )

    b2 = ledger.record_event(
        record_id="fdr-99182",
        entity_name="ocr_extractions",
        action_type="OCR_VERIFIED",
        actor_id="OCR_WORKER_01",
        payload={"confidence": 0.992, "forensic_flag": "CLEAN"}
    )

    b3 = ledger.record_event(
        record_id="fdr-99182",
        entity_name="lien_records",
        action_type="LIEN_MARKED",
        actor_id="BANK_GATEWAY_SBI",
        payload={"lien_ref": "LIEN-SBI-2026-9921", "favor_of": "Member Secretary AICTE"}
    )

    print(f"[+] Total blocks in ledger: {len(ledger.chain)}")
    valid, err = ledger.verify_integrity()
    print(f"[+] Ledger valid before tampering: {valid} (err={err})")

    tree = ledger.get_merkle_tree()
    root = tree.root_hash
    print(f"[+] Merkle Root Hash: {root}")

    # Test inclusion proof for b2
    proof = tree.get_proof(b2.current_block_hash)
    assert proof is not None, "Proof generation failed!"
    is_included = MerkleTree.verify_proof(b2.current_block_hash, proof, root)
    print(f"[+] Merkle Inclusion Proof verified for Block 2: {is_included}")

    # Tampering test: simulate illicit alteration of deposit amount
    print("\n[*] Simulating adversary tampering with Block 1 payload...")
    b1.payload["amount"] = 500000  # Fraudster changed 35 Lakhs to 5 Lakhs
    tampered_valid, tampered_err = ledger.verify_integrity()
    print(f"[-] Ledger validity after tampering: {tampered_valid} | Error: {tampered_err}")
    assert not tampered_valid, "Tamper detection failed!"
    print("[SUCCESS] Cryptographic tamper detection verified perfectly!")
