import React, { useState } from 'react';
import { usePortal } from '../context/AppContext';
import CurrencyDisplay from './common/CurrencyDisplay';
import StatusBadge from './common/StatusBadge';
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  CheckCircle2,
  BellRing,
  FileText,
  Building,
  ArrowRight,
  ShieldAlert,
  Sliders
} from 'lucide-react';

export default function MaturityEscalation() {
  const { fdrs, handleFdrUpdated, refreshPortalData } = usePortal();

  // Find deposits that have approaching maturity (e.g. Canara Bank FDR maturing in 2026)
  const [selectedFdrId, setSelectedFdrId] = useState('fdr-can-003');
  const targetFdr = fdrs.find(f => f.id === selectedFdrId) || fdrs[0];

  const [rolloverYears, setRolloverYears] = useState(3);
  const [isDispatchingNotice, setIsDispatchingNotice] = useState(false);
  const [noticeDispatched, setNoticeDispatched] = useState(false);
  const [isExecutingRollover, setIsExecutingRollover] = useState(false);
  const [rolloverSuccess, setRolloverSuccess] = useState(false);

  // Calculate days remaining to maturity
  const calculateDaysRemaining = (maturityDateStr) => {
    if (!maturityDateStr) return 0;
    const target = new Date(maturityDateStr);
    const now = new Date();
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = targetFdr ? calculateDaysRemaining(targetFdr.maturityDate) : 0;

  // Escalation Horizon Stages
  const stages = [
    {
      id: 'T-90',
      title: 'T-90 Horizon Notice',
      desc: 'Statutory 90-day advance notice dispatched to Registered Institution & Bank Branch.',
      days: 90,
      active: daysRemaining <= 90,
      completed: true,
      timestamp: '2026-08-22'
    },
    {
      id: 'T-60',
      title: 'T-60 Bureau Escalation',
      desc: 'Second notice; regional office officer alert generated if institution has not opted for release or rollover.',
      days: 60,
      active: daysRemaining <= 60,
      completed: daysRemaining <= 60,
      timestamp: '2026-09-21'
    },
    {
      id: 'T-30',
      title: 'T-30 Mandatory Rollover Directive',
      desc: 'Mandatory automatic rollover instruction dispatched to Scheduled Commercial Bank CBS to preserve collateral.',
      days: 30,
      active: daysRemaining <= 30,
      completed: false,
      timestamp: 'Pending T-30 Trigger'
    }
  ];

  // Dispatch Institutional Renewal Notice
  const dispatchInstitutionalRenewalNotice = async () => {
    setIsDispatchingNotice(true);
    await new Promise(r => setTimeout(r, 700));
    setNoticeDispatched(true);
    setIsDispatchingNotice(false);
  };

  // Reconcile Core Banking Maturity Schedule / Execute Auto-Rollover
  const reconcileCoreBankingMaturitySchedule = async () => {
    if (!targetFdr) return;
    setIsExecutingRollover(true);
    await new Promise(r => setTimeout(r, 900));

    // Calculate new maturity date
    const currentMaturity = new Date(targetFdr.maturityDate);
    currentMaturity.setFullYear(currentMaturity.getFullYear() + rolloverYears);
    const newMaturityStr = currentMaturity.toISOString().split('T')[0];

    const updated = {
      ...targetFdr,
      maturityDate: newMaturityStr,
      renewalCount: (targetFdr.renewalCount || 0) + 1,
      status: 'ACTIVE_LOCKED',
      isAutoRenewalEnabled: true
    };

    handleFdrUpdated(updated);
    setIsExecutingRollover(false);
    setRolloverSuccess(true);
    await refreshPortalData();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarClock className="w-6 h-6 text-amber-400" />
            <span>Maturity Tranche Horizon & Auto-Rollover Monitor</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated T-90, T-60, and T-30 maturity tracking calendar to prevent inadvertent collateral lapse or unauthorized branch payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>1 DEPOSIT AT T-90 WINDOW</span>
          </span>
        </div>
      </div>

      {/* Target Deposit Selection Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Select Inspected FDR:
          </label>
          <select
            value={selectedFdrId}
            onChange={(e) => {
              setSelectedFdrId(e.target.value);
              setNoticeDispatched(false);
              setRolloverSuccess(false);
            }}
            className="px-3 py-1.5 bg-slate-950 text-slate-200 font-mono text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer min-w-[280px]"
          >
            {fdrs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fdrNumber} ({f.bankCode}) — Maturing: {f.maturityDate} — ₹{f.principalAmount.toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        {targetFdr && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-400">Days to Maturity:</span>
            <span className={`px-2.5 py-0.5 rounded font-bold text-sm ${
              daysRemaining <= 30
                ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse-dot'
                : daysRemaining <= 90
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {daysRemaining > 0 ? `${daysRemaining} DAYS` : 'MATURED'}
            </span>
          </div>
        )}
      </div>

      {/* Horizon Stages Visual Countdown Progression */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Statutory Maturity Escalation Pipeline (T-Minus Schedule)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              className={`p-4 rounded-xl border relative transition ${
                stage.active
                  ? 'bg-amber-950/40 border-amber-600/80 text-amber-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                  {stage.id}
                </span>
                {stage.completed ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    DISPATCHED
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-slate-500">
                    PENDING
                  </span>
                )}
              </div>

              <div className="mt-3 font-semibold text-xs text-white">
                {stage.title}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {stage.desc}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Timeline Status</span>
                <span className="text-slate-300">{stage.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Automated Notification Dispatcher & Rollover Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Notification History & Dispatcher (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-400" />
                <span>Multi-Channel Institutional Advisory Dispatch</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">SMS / EMAIL / NIC</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Issues official regulatory warning to the institution trustees to either initiate statutory Affidavit-6 liquidation or execute formal deposit rollover.
            </p>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
              <div className="text-slate-400">
                <strong>Recipient:</strong> {targetFdr?.institutionName}
              </div>
              <div className="text-slate-400">
                <strong>Branch Nodal:</strong> {targetFdr?.branchIfsc} ({targetFdr?.bankName})
              </div>
              <div className="text-slate-400">
                <strong>Principal Value:</strong> ₹{targetFdr?.principalAmount?.toLocaleString('en-IN')}
              </div>
            </div>

            <button
              onClick={dispatchInstitutionalRenewalNotice}
              disabled={isDispatchingNotice || noticeDispatched}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:bg-slate-850 text-slate-200 font-semibold text-xs border border-slate-700 shadow-tactile transition"
            >
              {isDispatchingNotice ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting SMS & Email via NIC Gateway...</span>
                </>
              ) : noticeDispatched ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Official Notice Dispatched via NIC (Ref: ADV-2026-99)</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dispatch Formal T-90 Renewal Notice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Rollover Execution Directive (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Statutory Auto-Rollover Directive Execution</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">CBS EXTENSION</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When an institution fails to liquidate or close a compliant deposit, AICTE regulations require extending the deposit to maintain continuous joint encumbrance.
            </p>

            {/* Extension Term Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Select Rollover Extension Tenure:
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setRolloverYears(3)}
                  className={`py-2 px-3 rounded-lg border text-center transition ${
                    rolloverYears === 3
                      ? 'bg-blue-900/60 border-blue-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  3 Years (+36 Months)
                </button>
                <button
                  type="button"
                  onClick={() => setRolloverYears(5)}
                  className={`py-2 px-3 rounded-lg border text-center transition ${
                    rolloverYears === 5
                      ? 'bg-blue-900/60 border-blue-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  5 Years (+60 Months)
                </button>
              </div>
            </div>

            <button
              onClick={reconcileCoreBankingMaturitySchedule}
              disabled={isExecutingRollover}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold text-xs shadow-tactile transition"
            >
              {isExecutingRollover ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Notarizing Extension in CBS & Ledger...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Execute {rolloverYears}-Year Rollover in CBS</span>
                </>
              )}
            </button>

            {rolloverSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-700 text-emerald-200 font-mono text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Maturity Successfully Extended</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  New Maturity Date: {targetFdr?.maturityDate} (Renewal #{targetFdr?.renewalCount})
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
