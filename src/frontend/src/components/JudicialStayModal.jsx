import React, { useState } from 'react';
import { usePortal } from '../context/AppContext';
import { judicialInjunctionService } from '../services/api';
import CurrencyDisplay from './common/CurrencyDisplay';
import {
  Gavel,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  FileText,
  Lock,
  Unlock,
  RefreshCw,
  Building
} from 'lucide-react';

export default function JudicialStayModal() {
  const { 
    stayModalOpen, 
    handleCloseStayModal, 
    stayModalTargetFdr, 
    handleFdrUpdated, 
    refreshPortalData,
    fdrs
  } = usePortal();

  const [selectedTargetId, setSelectedTargetId] = useState(stayModalTargetFdr?.id || fdrs[0]?.id);
  const targetFdr = fdrs.find(f => f.id === selectedTargetId) || stayModalTargetFdr || fdrs[0];

  const [courtName, setCourtName] = useState('High Court of Judicature at Allahabad (Lucknow Bench)');
  const [stayOrderRef, setStayOrderRef] = useState('WP(C)/9421/2023');
  const [frozenReason, setFrozenReason] = useState('Interim stay granted in Trustee management succession dispute. Statutory encashment or rollover frozen pending final hearing.');
  const [injunctionLevel, setInjunctionLevel] = useState('HIGH_COURT_INJUNCTION');
  const [vacationRef, setVacationRef] = useState('REVOCATION-HC-VACATED-2026-118');

  const [isInjecting, setIsInjecting] = useState(false);
  const [isVacating, setIsVacating] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!stayModalOpen) return null;

  const isAlreadyFrozen = targetFdr?.status === 'DISPUTE_FROZEN';

  // Inject High Court Stay Order
  const injectJudicialStayDecree = async (e) => {
    e.preventDefault();
    if (!targetFdr) return;
    setIsInjecting(true);
    setSuccessMessage(null);

    try {
      const res = judicialInjunctionService.applyStayOrder(targetFdr.id, {
        courtName,
        stayOrderRef,
        orderDate: new Date().toISOString().split('T')[0],
        frozenReason,
        injunctionLevel,
        frozenBy: 'Registrar General, High Court'
      });

      handleFdrUpdated(res.fdr);
      setSuccessMessage(`Deposit ${targetFdr.fdrNumber} successfully frozen under High Court order.`);
      await refreshPortalData();
    } finally {
      setIsInjecting(false);
    }
  };

  // Vacate Stay Order
  const vacateJudicialInjunctionOrder = async () => {
    if (!targetFdr) return;
    setIsVacating(true);
    setSuccessMessage(null);

    try {
      const res = judicialInjunctionService.vacateStayOrder(
        targetFdr.id,
        vacationRef,
        'REGIONAL_DIRECTOR_AICTE'
      );

      handleFdrUpdated(res.fdr);
      setSuccessMessage(`Stay order vacated. Deposit ${targetFdr.fdrNumber} restored to ACTIVE_LOCKED status.`);
      await refreshPortalData();
    } finally {
      setIsVacating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-tactile-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950 text-red-400 border border-red-800">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Court Stay & Judicial Injunction Control
              </h2>
              <p className="text-[11px] text-slate-400">
                Simulate mandatory statutory freeze under Article 226 of the Constitution of India.
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseStayModal}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Deposit Selector */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <label className="block text-slate-400 font-semibold font-mono">
            Target Pledged Deposit:
          </label>
          <select
            value={selectedTargetId}
            onChange={(e) => {
              setSelectedTargetId(e.target.value);
              setSuccessMessage(null);
            }}
            className="w-full px-3 py-1.5 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg border border-slate-700"
          >
            {fdrs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fdrNumber} ({f.bankCode}) — ₹{f.principalAmount.toLocaleString('en-IN')} — [{f.status}]
              </option>
            ))}
          </select>

          {targetFdr && (
            <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400">
              <span>Institution: {targetFdr.institutionName}</span>
              <span className={isAlreadyFrozen ? "text-red-400 font-bold" : "text-emerald-400"}>
                CURRENT: {targetFdr.status}
              </span>
            </div>
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Branch: If Already Frozen -> Show Injunction Details & Vacation Control */}
        {isAlreadyFrozen ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-700/80 text-red-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Active Judicial Restraint Order</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900 text-red-200 border border-red-600 font-bold">
                  {targetFdr.stayOrder?.injunctionLevel || "HIGH_COURT_INJUNCTION"}
                </span>
              </div>

              <div className="text-xs space-y-1 font-mono">
                <div><strong>Court:</strong> {targetFdr.stayOrder?.courtName}</div>
                <div><strong>Writ Petition Ref:</strong> {targetFdr.stayOrder?.stayOrderRef}</div>
                <div><strong>Order Date:</strong> {targetFdr.stayOrder?.orderDate}</div>
                <div><strong>Grounds:</strong> {targetFdr.stayOrder?.frozenReason}</div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-red-800 text-[11px] text-red-300">
                ⚠ All core banking payouts, rollovers, and lien revocations are strictly blocked by the system until a certified vacation order is verified.
              </div>
            </div>

            {/* Vacation Action Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="font-semibold text-xs text-white">
                Vacate Injunction Order (Upon Legal Cell NOC)
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Court Vacation Order / Dismissal Reference
                </label>
                <input
                  type="text"
                  value={vacationRef}
                  onChange={(e) => setVacationRef(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg border border-slate-700"
                />
              </div>

              <button
                onClick={vacateJudicialInjunctionOrder}
                disabled={isVacating}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-xs shadow-tactile transition font-mono flex items-center justify-center gap-2"
              >
                {isVacating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Legal Vacation...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Vacate Stay Order & Unfreeze Deposit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Form: Inject New Stay Order */
          <form onSubmit={injectJudicialStayDecree} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Competent Judicial Authority / Court
              </label>
              <input
                type="text"
                required
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-slate-200 rounded-lg border border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Stay Order / Petition Reference
                </label>
                <input
                  type="text"
                  required
                  value={stayOrderRef}
                  onChange={(e) => setStayOrderRef(e.target.value)}
                  placeholder="WP(C)/9421/2023"
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Injunction Tier
                </label>
                <select
                  value={injunctionLevel}
                  onChange={(e) => setInjunctionLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700"
                >
                  <option value="HIGH_COURT_INJUNCTION">High Court Writ Stay</option>
                  <option value="SUPREME_COURT_SLP">Supreme Court SLP Stay</option>
                  <option value="CBI_VIGILANCE_FREEZE">CBI / Vigilance Order</option>
                  <option value="DISTRICT_CIVIL_COURT">District Court Injunction</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Specific Injunction Mandate & Legal Reason
              </label>
              <textarea
                rows={3}
                required
                value={frozenReason}
                onChange={(e) => setFrozenReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-lg border border-slate-700 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseStayModal}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-750"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isInjecting}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-tactile transition flex items-center gap-1.5"
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>{isInjecting ? "Freezing Deposit..." : "Enforce Injunction Freeze"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
