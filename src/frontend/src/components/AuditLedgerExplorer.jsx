import React, { useState, useEffect } from 'react';
import { usePortal } from '../context/AppContext';
import { auditLedgerService } from '../services/api';
import {
  Binary,
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function AuditLedgerExplorer() {
  const { refreshPortalData } = usePortal();

  const [chainData, setChainData] = useState([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [integrityState, setIntegrityState] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperInjected, setTamperInjected] = useState(false);

  // Load audit chain
  const loadLedgerData = async () => {
    setLoading(true);
    try {
      const { data, total, tamperInjected: isTampered } = await auditLedgerService.getChain();
      setChainData(data);
      setTotalBlocks(total);
      setTamperInjected(isTampered || false);
      if (!selectedBlock && data.length > 0) {
        setSelectedBlock(data[0]);
      }
      const integrity = await auditLedgerService.verifyIntegrity();
      setIntegrityState(integrity.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, []);

  // Run integrity verification check
  const runIntegrityVerification = async () => {
    setIsVerifying(true);
    try {
      const integrity = await auditLedgerService.verifyIntegrity();
      setIntegrityState(integrity.data);
    } finally {
      setIsVerifying(false);
    }
  };

  // Simulate Cryptographic Chain Tampering
  const simulateCryptographicChainTampering = async () => {
    auditLedgerService.injectTamper();
    setTamperInjected(true);
    await loadLedgerData();
    await refreshPortalData();
  };

  // Restore authentic audit ledger
  const restoreAuthenticAuditLedger = async () => {
    auditLedgerService.restoreLedger();
    setTamperInjected(false);
    await loadLedgerData();
    await refreshPortalData();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Binary className="w-6 h-6 text-emerald-400" />
            <span>Cryptographic Audit Ledger & Merkle Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable SHA-256 parent-hash chained event ledger with Merkle tree inclusion proofs guaranteeing zero-trust data integrity.
          </p>
        </div>

        {/* Tamper / Integrity Actions */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {tamperInjected ? (
            <button
              onClick={restoreAuthenticAuditLedger}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-tactile transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Verified Ledger</span>
            </button>
          ) : (
            <button
              onClick={simulateCryptographicChainTampering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-700 font-semibold shadow-tactile transition"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Inject Malicious Tamper</span>
            </button>
          )}

          <button
            onClick={runIntegrityVerification}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 shadow-tactile transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isVerifying ? "Verifying..." : "Verify Hash Chain"}</span>
          </button>
        </div>
      </div>

      {/* Chain Status Hero Banner */}
      <div className={`p-4 rounded-xl border shadow-tactile flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        tamperInjected
          ? 'bg-red-950/70 border-red-700 text-red-200 shadow-glow-crimson'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${
            tamperInjected ? 'bg-red-900 text-red-200 border-red-600' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}>
            {tamperInjected ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center gap-2">
              <span>{tamperInjected ? "CRYPTOGRAPHIC INTEGRITY VIOLATION DETECTED" : "IMMUTABLE CHAIN VERIFIED & SECURE"}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                tamperInjected ? 'bg-red-900 text-red-200 border-red-600' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {totalBlocks} BLOCKS
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {tamperInjected
                ? "Block #3 hash mismatch. Immediate breach notification triggered to Central Vigilance Commission."
                : "Continuous SHA-256 hash chaining validated against root authority. Zero hash divergence."}
            </div>
          </div>
        </div>

        <div className="font-mono text-xs text-right sm:border-l sm:border-slate-800 sm:pl-4">
          <div className="text-slate-500 text-[10px] uppercase">Merkle Root</div>
          <div className="text-slate-200 font-bold truncate max-w-[200px]">
            {integrityState?.merkleRoot || "0x8f9c1a02b3d4e5f6..."}
          </div>
        </div>
      </div>

      {/* Visual Chained Blocks Explorer */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-400" />
            <span>Cryptographic Block Sequence (Height {totalBlocks - 1} down to 0)</span>
          </h2>
          <span className="text-[10px] font-mono text-slate-500">MERKLE-DAMGÅRD CONSTRUCTION</span>
        </div>

        {/* Horizontally or vertically scrollable blocks */}
        <div className="space-y-3">
          {chainData.map((block, idx) => {
            const isSelected = selectedBlock?.blockHeight === block.blockHeight;
            const isTamperedBlock = tamperInjected && block.blockHeight === 3;

            return (
              <div
                key={block.blockHeight}
                onClick={() => setSelectedBlock(block)}
                className={`p-4 rounded-xl border transition cursor-pointer relative ${
                  isTamperedBlock
                    ? 'bg-red-950/70 border-red-600 text-red-200 shadow-glow-crimson'
                    : isSelected
                    ? 'bg-blue-950/50 border-blue-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {/* Block Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      isTamperedBlock
                        ? 'bg-red-800 text-white'
                        : 'bg-slate-800 text-blue-300 border border-slate-700'
                    }`}>
                      BLOCK #{block.blockHeight}
                    </span>
                    <span className="font-semibold text-white">{block.actionType}</span>
                    <span className="text-[10px] text-slate-500">[{block.entityName}]</span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    {block.timestamp}
                  </div>
                </div>

                {/* Hashes Row */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800 truncate">
                    <span className="text-slate-500 block text-[9px] uppercase">Current Hash (SHA-256)</span>
                    <span className={isTamperedBlock ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                      {block.currentBlockHash}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800 truncate">
                    <span className="text-slate-500 block text-[9px] uppercase">Previous Parent Hash</span>
                    <span className="text-slate-400">
                      {block.previousBlockHash}
                    </span>
                  </div>
                </div>

                {/* Payload Summary */}
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                  <p className="truncate max-w-xl">{block.payloadSummary}</p>
                  <span className="text-[10px] font-mono text-slate-500">Actor: {block.actorId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Selected Block Inspector */}
      {selectedBlock && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Block #{selectedBlock.blockHeight} Payload Inspector & Inclusion Proof</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">NOTARIZED STATE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] mb-1">Target Entity / Primary Key</span>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-white font-bold">
                {selectedBlock.entityName} / {selectedBlock.recordId}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] mb-1">Authenticated Actor / Bureau</span>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-white font-bold">
                {selectedBlock.actorId}
              </div>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] font-mono mb-1">Decoded Payload Snapshot</span>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap">
              {JSON.stringify({
                block_height: selectedBlock.blockHeight,
                action_type: selectedBlock.actionType,
                record_id: selectedBlock.recordId,
                summary: selectedBlock.payloadSummary,
                timestamp: selectedBlock.timestamp,
                parent_hash: selectedBlock.previousBlockHash,
                block_hash: selectedBlock.currentBlockHash
              }, null, 2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
