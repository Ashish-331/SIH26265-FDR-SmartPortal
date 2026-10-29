import React, { useState } from 'react';
import { usePortal } from '../context/AppContext';
import { bankCbsService } from '../services/api';
import CurrencyDisplay from './common/CurrencyDisplay';
import StatusBadge from './common/StatusBadge';
import {
  Landmark,
  ShieldCheck,
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  Activity,
  Cpu,
  RefreshCw,
  ExternalLink,
  Layers
} from 'lucide-react';

export default function BankCbsGateway() {
  const { fdrs, handleFdrUpdated, refreshPortalData } = usePortal();

  // Selected FDR for CBS action
  const [selectedFdrId, setSelectedFdrId] = useState(fdrs[0]?.id || 'fdr-sbi-001');
  const targetFdr = fdrs.find(f => f.id === selectedFdrId) || fdrs[0];

  // Bank CBS Action State
  const [isVerifying, setIsVerifying] = useState(false);
  const [cbsVerifyResult, setCbsVerifyResult] = useState(null);
  const [isMarkingLien, setIsMarkingLien] = useState(false);
  const [lienResult, setLienResult] = useState(null);
  const [isRevokingLien, setIsRevokingLien] = useState(false);
  const [revokeNocRef, setRevokeNocRef] = useState('NOC-AICTE-RELEASE-2026-44');
  const [revokeResult, setRevokeResult] = useState(null);
  const [webhookLog, setWebhookLog] = useState([]);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // SFMS MT760 structured payload preview
  const sfmsPayload = targetFdr ? bankCbsService.generateSfmsMt760Payload(targetFdr) : '';

  // Execute Direct CBS Verification
  const executeDirectCbsVerification = async () => {
    if (!targetFdr) return;
    setIsVerifying(true);
    setCbsVerifyResult(null);
    try {
      const res = await bankCbsService.verifyFdrWithCbs(
        targetFdr.bankCode,
        targetFdr.fdrNumber,
        targetFdr.principalAmount,
        targetFdr.branchIfsc
      );
      setCbsVerifyResult(res.data);
    } catch (err) {
      setCbsVerifyResult({ error: err.message || "CBS node timeout" });
    } finally {
      setIsVerifying(false);
    }
  };

  // Dispatch Statutory Lien Instruction
  const dispatchStatutoryLienInstruction = async () => {
    if (!targetFdr) return;
    setIsMarkingLien(true);
    setLienResult(null);
    try {
      const res = await bankCbsService.markStatutoryLien(
        targetFdr.bankCode,
        targetFdr.fdrNumber,
        "Member Secretary, AICTE New Delhi"
      );
      setLienResult(res.data);

      // Log webhook delivery
      setWebhookLog(prev => [
        {
          id: `wh-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-IN'),
          event: "CBS.LIEN_MARKED.SFMS_MT760",
          fdrNumber: targetFdr.fdrNumber,
          ref: res.data.lienReferenceNumber,
          status: "DELIVERED_200_OK"
        },
        ...prev
      ]);

      await refreshPortalData();
    } catch (err) {
      setLienResult({ error: err.message || "Lien marking failed." });
    } finally {
      setIsMarkingLien(false);
    }
  };

  // Dispatch Lien Revocation Instruction (NOC Required)
  const dispatchLienRevocationInstruction = async () => {
    if (!targetFdr) return;
    setIsRevokingLien(true);
    setRevokeResult(null);
    try {
      const res = await bankCbsService.revokeStatutoryLien(
        targetFdr.bankCode,
        targetFdr.fdrNumber,
        targetFdr.lienReferenceNumber || 'LIEN-REF-DEFAULT',
        revokeNocRef
      );
      setRevokeResult(res.data);

      setWebhookLog(prev => [
        {
          id: `wh-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-IN'),
          event: "CBS.LIEN_REVOKED.NOC_ACK",
          fdrNumber: targetFdr.fdrNumber,
          ref: revokeNocRef,
          status: "DELIVERED_200_OK"
        },
        ...prev
      ]);

      await refreshPortalData();
    } catch (err) {
      setRevokeResult({ error: err.message || "Revocation rejected by CBS." });
    } finally {
      setIsRevokingLien(false);
    }
  };

  // Copy SFMS MT760 to clipboard
  const handleCopySfmsPayload = () => {
    navigator.clipboard.writeText(sfmsPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-emerald-400" />
            <span>Bank CBS & NeSL Electronic Lien Gateway</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Direct Core Banking System integration (SBI, PNB, Canara, HDFC) via SFMS MT760 structured financial messaging protocol.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>SFMS GATEWAY: ACTIVE</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>mTLS 1.3 SECURED</span>
          </span>
        </div>
      </div>

      {/* Target FDR Selector Strip */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Target Deposit Record:
          </label>
          <select
            value={selectedFdrId}
            onChange={(e) => {
              setSelectedFdrId(e.target.value);
              setCbsVerifyResult(null);
              setLienResult(null);
              setRevokeResult(null);
            }}
            className="px-3 py-1.5 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[280px]"
          >
            {fdrs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fdrNumber} — {f.bankCode} (₹{f.principalAmount.toLocaleString('en-IN')}) — {f.status}
              </option>
            ))}
          </select>
        </div>

        {targetFdr && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1 text-slate-400">
              <span>Lien Status:</span>
              <strong className={targetFdr.lienStatus === 'LIEN_CONFIRMED' ? 'text-emerald-400' : 'text-amber-400'}>
                {targetFdr.lienStatus}
              </strong>
            </div>
            <StatusBadge status={targetFdr.status} />
          </div>
        )}
      </div>

      {/* Two Column Grid: CBS Operations & SFMS MT760 Payload Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Direct CBS Commands (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Card 1: Live Core Banking Verification */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>1. Direct CBS Balance & Title Query</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">API: /cbs/verify-fdr</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Dispatches mTLS query to {targetFdr?.bankName}'s core banking gateway to authenticate the principal balance, value date, and joint holders.
            </p>

            <button
              onClick={executeDirectCbsVerification}
              disabled={isVerifying}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:bg-slate-800 text-slate-100 font-semibold text-xs border border-slate-700 shadow-tactile transition"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Querying {targetFdr?.bankCode} Core Banking Server...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Execute Direct CBS Query ({targetFdr?.bankCode})</span>
                </>
              )}
            </button>

            {/* CBS Query Result Preview */}
            {cbsVerifyResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                  <span>✓ {cbsVerifyResult.cbsStatus || "AUTHENTIC_ACTIVE"}</span>
                  <span className="text-[10px] text-slate-500">200 OK</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Account: {cbsVerifyResult.accountNumber} | Branch: {cbsVerifyResult.branchName}
                </div>
                <div className="text-[11px] text-slate-400">
                  Principal: ₹{cbsVerifyResult.principalAmount?.toLocaleString('en-IN')} @ {cbsVerifyResult.interestRate}%
                </div>
                <div className="text-[10px] text-slate-500">
                  Liquidation Blocked: {cbsVerifyResult.liquidationBlocked ? "YES (Liened)" : "NO (Free)"}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Mark Irrevocable Statutory Lien */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>2. Mark Irrevocable Statutory Lien</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">API: /cbs/mark-lien</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enforces statutory lien in favor of <strong>Member Secretary, AICTE New Delhi</strong>. Automatically freezes premature liquidation in the bank's core deposit ledger.
            </p>

            <button
              onClick={dispatchStatutoryLienInstruction}
              disabled={isMarkingLien || targetFdr?.lienStatus === 'LIEN_CONFIRMED'}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs shadow-tactile transition"
            >
              {isMarkingLien ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Locking Lien in {targetFdr?.bankCode} CBS...</span>
                </>
              ) : targetFdr?.lienStatus === 'LIEN_CONFIRMED' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lien Irrevocably Locked ({targetFdr.lienReferenceNumber})</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm Statutory Lien in CBS</span>
                </>
              )}
            </button>

            {lienResult && !lienResult.error && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-200 font-mono text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lien Successfully Registered in CBS</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Ref: {lienResult.lienReferenceNumber}
                </div>
                <div className="text-[10px] text-slate-400">
                  SFMS Ack: {lienResult.sfmsAckNumber}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Revoke Lien (Only With Valid AICTE NOC) */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-amber-400" />
                <span>3. Revoke Statutory Lien (NOC Verification)</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">API: /cbs/release-lien</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                AICTE Clearance NOC Reference
              </label>
              <input
                type="text"
                value={revokeNocRef}
                onChange={(e) => setRevokeNocRef(e.target.value)}
                placeholder="NOC-AICTE-RELEASE-2026-..."
                className="w-full px-3 py-1.5 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={dispatchLienRevocationInstruction}
              disabled={isRevokingLien || targetFdr?.lienStatus !== 'LIEN_CONFIRMED'}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:bg-slate-850 disabled:text-slate-600 text-amber-300 font-semibold text-xs border border-amber-800/60 transition shadow-tactile"
            >
              {isRevokingLien ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying AICTE DSC & Revoking...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Transmit Lien Revocation to Bank CBS</span>
                </>
              )}
            </button>

            {revokeResult && (
              <div className="p-3 rounded-lg bg-purple-950/60 border border-purple-700 text-purple-200 font-mono text-xs">
                {revokeResult.message || "Lien released in Core Banking System."}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SFMS MT760 Structured Payload Viewer & Webhook Telemetry (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* SFMS MT760 Structured Raw Payload */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  SFMS MT760 Payload Inspector
                </span>
              </div>

              <button
                onClick={handleCopySfmsPayload}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 transition"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedPayload ? "COPIED" : "COPY MT760"}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Structured Society for Worldwide Interbank Financial Telecommunication / Structured Financial Messaging System payload dispatched to RBI/NeSL escrow clearinghouse.
            </p>

            {/* Terminal Window */}
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-400 whitespace-pre-wrap overflow-x-auto leading-relaxed select-all">
              {sfmsPayload}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
              <span>Standard: SFMS MT760 v3.2</span>
              <span>Enc: SHA-256 with PKCS#7</span>
            </div>
          </div>

          {/* Real-time Webhook Dispatches */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  CBS Webhook Inbound Telemetry
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">KAFKA MIRROR</span>
            </div>

            <div className="space-y-2">
              {webhookLog.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 font-mono">
                  Trigger an action above (CBS verify or Mark Lien) to inspect real-time webhook payload receipts.
                </div>
              ) : (
                webhookLog.map((wh) => (
                  <div
                    key={wh.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2">
                        <span>{wh.event}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {wh.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        FDR: {wh.fdrNumber} | Ref: {wh.ref}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500">{wh.timestamp}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
