import React, { useState } from 'react';
import { usePortal } from '../context/AppContext';
import { releaseWorkflowService } from '../services/api';
import CurrencyDisplay from './common/CurrencyDisplay';
import StatusBadge from './common/StatusBadge';
import {
  ShieldCheck,
  FileSignature,
  Fingerprint,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  FileCheck2,
  Lock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Send
} from 'lucide-react';

export default function ReleaseWorkflow() {
  const { fdrs, currentRole, handleFdrUpdated, refreshPortalData } = usePortal();

  // Find candidate FDR (e.g. AXIS-FDR-331199 or user selected)
  const [selectedFdrId, setSelectedFdrId] = useState(
    fdrs.find(f => f.status === 'AFFIDAVIT6_VERIFIED')?.id || fdrs[0]?.id || 'fdr-axis-006'
  );
  const targetFdr = fdrs.find(f => f.id === selectedFdrId) || fdrs[0];

  // Aadhaar e-Sign Modal State
  const [aadhaarModalOpen, setAadhaarModalOpen] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('548192834920');
  const [aadhaarOtp, setAadhaarOtp] = useState('892104');
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const [aadhaarSuccess, setAadhaarSuccess] = useState(false);

  // Class 3 DSC Modal State
  const [dscModalOpen, setDscModalOpen] = useState(false);
  const [dscTokenSerial, setDscTokenSerial] = useState('DSC-NIC-2026-CLASS3-09881');
  const [dscPin, setDscPin] = useState('****');
  const [isSigningDsc, setIsSigningDsc] = useState(false);
  const [dscSuccess, setDscSuccess] = useState(false);

  // Remittance PFMS state
  const [pfmsUtr, setPfmsUtr] = useState(null);
  const [isDisbursingPfms, setIsDisbursingPfms] = useState(false);

  // Multi-Bureau Sign-Off Update
  const updateBureauSignoffStatus = async (bureau, newStatus) => {
    if (!targetFdr) return;
    const officerMap = {
      approvalBureau: 'Dr. R. K. Sharma (Director Approval)',
      financeBureau: 'Shri S. V. Nair (Finance Officer)',
      legalBureau: 'Adv. Preeti Sen (Legal Cell Head)'
    };

    const res = releaseWorkflowService.updateBureauStatus(
      targetFdr.id,
      bureau,
      newStatus,
      officerMap[bureau],
      `Verified statutory clearance records for ${bureau}.`
    );

    handleFdrUpdated(res.fdr);
    await refreshPortalData();
  };

  // Execute Aadhaar e-Sign Undertaking
  const verifyAadhaarEsignUndertaking = async () => {
    setIsVerifyingAadhaar(true);
    try {
      const res = await releaseWorkflowService.completeAadhaarEsign(
        targetFdr.id,
        "Dr. Arvind Chokshi (Chairman Trustee)",
        `XXXXXXXX${aadhaarNumber.slice(-4)}`
      );
      handleFdrUpdated(res.fdr);
      setAadhaarSuccess(true);
      setTimeout(() => {
        setAadhaarModalOpen(false);
        setAadhaarSuccess(false);
      }, 1500);
      await refreshPortalData();
    } finally {
      setIsVerifyingAadhaar(false);
    }
  };

  // Execute Class 3 DSC Sign-off
  const executeClass3DscSignoff = async () => {
    setIsSigningDsc(true);
    try {
      const roleTitle = currentRole === 'Member Secretary' ? 'Member Secretary, AICTE' : 'Regional Director, AICTE';
      const officerName = currentRole === 'Member Secretary' ? 'Prof. Rajive Kumar' : 'Dr. B. K. Patel';

      const res = await releaseWorkflowService.completeDscSign(
        targetFdr.id,
        officerName,
        roleTitle,
        dscTokenSerial
      );
      handleFdrUpdated(res.fdr);
      setDscSuccess(true);
      setTimeout(() => {
        setDscModalOpen(false);
        setDscSuccess(false);
      }, 1500);
      await refreshPortalData();
    } finally {
      setIsSigningDsc(false);
    }
  };

  // Simulate PFMS Remittance Disbursement
  const dispatchPfmsLiquidationAdvice = async () => {
    setIsDisbursingPfms(true);
    await new Promise(r => setTimeout(r, 1000));
    const generatedUtr = `PFMS-INR-${Date.now().toString().slice(-9)}`;
    setPfmsUtr(generatedUtr);

    const updated = {
      ...targetFdr,
      status: 'REFUNDED_OR_CLOSED',
      pfmsUtr: generatedUtr
    };
    handleFdrUpdated(updated);
    setIsDisbursingPfms(false);
    await refreshPortalData();
  };

  const bureauClearance = targetFdr?.bureauClearance || {
    approvalBureau: { status: 'PENDING' },
    financeBureau: { status: 'PENDING' },
    legalBureau: { status: 'PENDING' }
  };

  const allBureausCleared = 
    bureauClearance.approvalBureau?.status === 'CLEARED' &&
    bureauClearance.financeBureau?.status === 'CLEARED' &&
    bureauClearance.legalBureau?.status === 'CLEARED';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <span>Multi-Bureau Release Pipeline & Digital Affidavit-6</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Statutory 3-tier clearance (Approval, Finance, Legal), Aadhaar e-Sign v2.1 institutional affidavit, and Class 3 DSC token release.
          </p>
        </div>

        {/* Selected Role Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            SIGNING AS: <strong className="text-blue-400">{currentRole.toUpperCase()}</strong>
          </span>
        </div>
      </div>

      {/* Target FDR Selector */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Candidate Deposit for Release:
          </label>
          <select
            value={selectedFdrId}
            onChange={(e) => setSelectedFdrId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[300px]"
          >
            {fdrs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fdrNumber} ({f.bankCode}) — ₹{f.principalAmount.toLocaleString('en-IN')} — {f.status}
              </option>
            ))}
          </select>
        </div>

        {targetFdr && (
          <div className="flex items-center gap-3">
            <StatusBadge status={targetFdr.status} />
          </div>
        )}
      </div>

      {/* 3 Steps Pipeline Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1: Institutional Digital Affidavit-6 */}
        <div className={`p-5 rounded-xl border shadow-tactile space-y-3 ${
          targetFdr?.affidavit6Signed
            ? 'bg-emerald-950/40 border-emerald-600/70'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
              STEP 01
            </span>
            {targetFdr?.affidavit6Signed ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED
              </span>
            ) : (
              <span className="text-[11px] font-mono text-amber-400">PENDING ESIGN</span>
            )}
          </div>

          <div className="font-semibold text-xs text-white flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-indigo-400" />
            <span>Digital Affidavit-6 Undertaking</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Statutory undertaking on non-judicial e-stamp certifying zero faculty salary arrears and full student fee compliance.
          </p>

          <div className="pt-2">
            {targetFdr?.affidavit6Signed ? (
              <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300">
                <div>Signed: {targetFdr.affidavit6Signed.signerName}</div>
                <div>Aadhaar: {targetFdr.affidavit6Signed.aadhaarMasked}</div>
              </div>
            ) : (
              <button
                onClick={() => setAadhaarModalOpen(true)}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-tactile flex items-center justify-center gap-1.5"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Execute Aadhaar e-Sign v2.1</span>
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Multi-Bureau Clearance Matrix */}
        <div className={`p-5 rounded-xl border shadow-tactile space-y-3 ${
          allBureausCleared
            ? 'bg-emerald-950/40 border-emerald-600/70'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
              STEP 02
            </span>
            {allBureausCleared ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ALL CLEARED
              </span>
            ) : (
              <span className="text-[11px] font-mono text-amber-400">IN REVIEW</span>
            )}
          </div>

          <div className="font-semibold text-xs text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-400" />
            <span>Multi-Bureau No-Dues Clearance</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Parallel non-interference verification from AICTE Approval, Finance, and Legal Vigilance cells.
          </p>

          <div className="pt-2 space-y-1.5 font-mono text-[10px]">
            {['approvalBureau', 'financeBureau', 'legalBureau'].map((bur) => {
              const bName = bur === 'approvalBureau' ? 'Approval Bureau' : bur === 'financeBureau' ? 'Finance Bureau' : 'Legal Cell';
              const bStatus = bureauClearance[bur]?.status || 'PENDING';
              return (
                <div key={bur} className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">{bName}</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold ${
                    bStatus === 'CLEARED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {bStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Class 3 DSC Sign & PFMS Settlement */}
        <div className={`p-5 rounded-xl border shadow-tactile space-y-3 ${
          targetFdr?.status === 'REFUNDED_OR_CLOSED'
            ? 'bg-emerald-950/40 border-emerald-600/70'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
              STEP 03
            </span>
            {targetFdr?.status === 'REFUNDED_OR_CLOSED' ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SETTLED
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-500">FINAL APPROVAL</span>
            )}
          </div>

          <div className="font-semibold text-xs text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Class 3 DSC Sign & PFMS Refund</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Member Secretary / Regional Director hardware token cryptographic sign-off issuing irrevocable release NOC.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setDscModalOpen(true)}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-tactile flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign with Class 3 DSC Token</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Bureau Governance Sign-off Control Strip */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-400" />
            <span>Bureau Clearance Management Matrix (Simulate Bureau Actions)</span>
          </h2>
          <span className="text-[10px] font-mono text-slate-500">SECTION 8 COMPLIANCE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Approval Bureau */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-white">1. AICTE Approval Bureau</div>
            <p className="text-[11px] text-slate-400">10-year operational tenure check & course compliance.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => updateBureauSignoffStatus('approvalBureau', 'CLEARED')}
                className="flex-1 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-mono text-[11px]"
              >
                Clear Approval
              </button>
              <button
                onClick={() => updateBureauSignoffStatus('approvalBureau', 'REJECTED')}
                className="py-1.5 px-2.5 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-mono text-[11px]"
              >
                Defect
              </button>
            </div>
          </div>

          {/* Finance Bureau */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-white">2. AICTE Finance Bureau</div>
            <p className="text-[11px] text-slate-400">Verification of regulatory fees, penalty recovery, and audit dues.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => updateBureauSignoffStatus('financeBureau', 'CLEARED')}
                className="flex-1 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-mono text-[11px]"
              >
                Clear Finance
              </button>
              <button
                onClick={() => updateBureauSignoffStatus('financeBureau', 'PENDING_DUES')}
                className="py-1.5 px-2.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 font-mono text-[11px]"
              >
                Hold
              </button>
            </div>
          </div>

          {/* Legal Bureau */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-white">3. AICTE Legal / Vigilance Cell</div>
            <p className="text-[11px] text-slate-400">High Court stays, vigilance investigations, and student fee petitions.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => updateBureauSignoffStatus('legalBureau', 'CLEARED')}
                className="flex-1 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-mono text-[11px]"
              >
                Clear Legal
              </button>
              <button
                onClick={() => updateBureauSignoffStatus('legalBureau', 'FLAGGED_INJUNCTION')}
                className="py-1.5 px-2.5 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-mono text-[11px]"
              >
                Injunction
              </button>
            </div>
          </div>
        </div>

        {/* PFMS Settlement Section */}
        {allBureausCleared && (
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-xs text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All Bureau Clearances Satisfied — Ready for PFMS Remittance</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Public Financial Management System (PFMS) gateway will disburse ₹{targetFdr?.principalAmount?.toLocaleString('en-IN')} to trustee escrow account.
              </p>
            </div>

            <button
              onClick={dispatchPfmsLiquidationAdvice}
              disabled={isDisbursingPfms || targetFdr?.status === 'REFUNDED_OR_CLOSED'}
              className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold text-xs shadow-tactile transition font-mono shrink-0"
            >
              {isDisbursingPfms ? "Transmitting PFMS Advice..." : targetFdr?.status === 'REFUNDED_OR_CLOSED' ? `PFMS SETTLED (${targetFdr.pfmsUtr || 'UTR-DONE'})` : "Execute PFMS Remittance"}
            </button>
          </div>
        )}
      </div>

      {/* Interactive Aadhaar e-Sign Modal */}
      {aadhaarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-tactile-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">UIDAI Aadhaar e-Sign v2.1 Simulator</h3>
              </div>
              <button
                onClick={() => setAadhaarModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                [ESC]
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Authenticate the institutional Affidavit-6 undertaking via UIDAI e-KYC One-Time Password.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Aadhaar Virtual ID (VID) / UID</label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">6-Digit UIDAI OTP</label>
                <input
                  type="text"
                  value={aadhaarOtp}
                  onChange={(e) => setAadhaarOtp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-white font-mono text-center text-lg tracking-widest rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                By clicking authenticate, you legally swear under Section 193 IPC that all statements in Affidavit-6 are true and authentic.
              </div>
            </div>

            {aadhaarSuccess && (
              <div className="p-2.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-mono text-center">
                ✓ Aadhaar e-Sign v2.1 Verified with UIDAI CIDR
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setAadhaarModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-750"
              >
                Cancel
              </button>
              <button
                onClick={verifyAadhaarEsignUndertaking}
                disabled={isVerifyingAadhaar}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-tactile transition"
              >
                {isVerifyingAadhaar ? "Authenticating UIDAI..." : "Authenticate & Sign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class 3 DSC Token Modal */}
      {dscModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-tactile-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Class 3 DSC Crypto Token Sign-Off</h3>
              </div>
              <button
                onClick={() => setDscModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                [ESC]
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographically seal the release order with your hardware USB e-Token (CCA India Licensed CA).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hardware Token Serial Number</label>
                <input
                  type="text"
                  value={dscTokenSerial}
                  onChange={(e) => setDscTokenSerial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Token Cryptographic PIN</label>
                <input
                  type="password"
                  value={dscPin}
                  onChange={(e) => setDscPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-white font-mono text-center text-lg tracking-widest rounded-lg border border-slate-700"
                />
              </div>
            </div>

            {dscSuccess && (
              <div className="p-2.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-mono text-center">
                ✓ SHA-256 Digital Signature Successfully Applied
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDscModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-750"
              >
                Cancel
              </button>
              <button
                onClick={executeClass3DscSignoff}
                disabled={isSigningDsc}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-tactile transition"
              >
                {isSigningDsc ? "Applying Signature..." : "Sign & Approve Release"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
