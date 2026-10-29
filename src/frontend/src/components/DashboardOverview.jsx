import React from 'react';
import { usePortal } from '../context/AppContext';
import CurrencyDisplay, { formatCroreLakhShort, formatIndianRupees } from './common/CurrencyDisplay';
import StatusBadge from './common/StatusBadge';
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  Gavel,
  Landmark,
  ArrowUpRight,
  Clock,
  Binary,
  Layers,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  ExternalLink
} from 'lucide-react';

export default function DashboardOverview() {
  const { stats, fdrs, setCurrentView, handleOpenDetailDrawer, handleTriggerStayModal } = usePortal();

  const totalAmount = fdrs.reduce((sum, f) => sum + (f.principalAmount || 0), 0);
  const activeLockedCount = fdrs.filter(f => f.status === 'ACTIVE_LOCKED').length;
  const maturityNoticeCount = fdrs.filter(f => f.status === 'MATURITY_NOTICE_SENT').length;
  const frozenCount = fdrs.filter(f => f.status === 'DISPUTE_FROZEN').length;
  const affidavitVerifiedCount = fdrs.filter(f => f.status === 'AFFIDAVIT6_VERIFIED').length;

  // Regional aggregations
  const regionalDistribution = [
    { region: 'WRO Mumbai', count: 1, amount: 3500000, state: 'Maharashtra', share: 12 },
    { region: 'SWRO Bangalore', count: 1, amount: 5000000, state: 'Karnataka', share: 17 },
    { region: 'NWRO Chandigarh', count: 1, amount: 2500000, state: 'Delhi NCR', share: 9 },
    { region: 'SRO Chennai', count: 1, amount: 10000000, state: 'Tamil Nadu', share: 34 },
    { region: 'NRO Kanpur', count: 1, amount: 3500000, state: 'Uttar Pradesh', share: 12 },
    { region: 'CRO Bhopal', count: 1, amount: 4500000, state: 'Gujarat', share: 16 }
  ];

  // Bank Exposure
  const bankDistribution = [
    { bank: 'State Bank of India', code: 'SBI', total: 3500000, share: 12, color: 'bg-blue-500' },
    { bank: 'HDFC Bank Ltd', code: 'HDFC', total: 10000000, share: 34, color: 'bg-indigo-500' },
    { bank: 'Punjab National Bank', code: 'PNB', total: 5000000, share: 17, color: 'bg-amber-500' },
    { bank: 'Axis Bank', code: 'AXIS', total: 4500000, share: 16, color: 'bg-rose-500' },
    { bank: 'Bank of Baroda', code: 'BOB', total: 3500000, share: 12, color: 'bg-orange-500' },
    { bank: 'Canara Bank', code: 'CANARA', total: 2500000, share: 9, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Executive Portfolio Overview</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase">
              STATUTORY ESCROW TELEMETRY
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring of AICTE encumbered fixed deposits, NeSL electronic liens, maturity horizons, and judicial stays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('ingestion')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-tactile transition"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Ingest New FDR</span>
          </button>
          <button
            onClick={() => setCurrentView('cbs')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-400" />
            <span>CBS Gateway</span>
          </button>
        </div>
      </div>

      {/* Top 4 Critical Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pledged Funds */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Encumbered Corpus</span>
            <span className="p-1.5 rounded-md bg-blue-950 text-blue-400 border border-blue-800">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <CurrencyDisplay amount={totalAmount} size="xl" highlight />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>{fdrs.length} Active Joint Deposits</span>
            <span className="font-mono text-emerald-400 font-semibold">100% PLEDGED</span>
          </div>
        </div>

        {/* Card 2: Active Locked Escrows */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Active Confirmed Liens</span>
            <span className="p-1.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {activeLockedCount}
            </span>
            <span className="text-xs text-emerald-400 font-medium">LOCKED TO AICTE</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>SFMS MT760 Verified</span>
            <span className="font-mono text-slate-300">₹{formatCroreLakhShort(8500000)}</span>
          </div>
        </div>

        {/* Card 3: Maturity Horizons (T-90 Alerts) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Maturity Window &lt; 90 Days</span>
            <span className="p-1.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              {maturityNoticeCount}
            </span>
            <span className="text-xs text-amber-400 font-medium">ACTION REQUIRED</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Canara Bank (2026-11-20)</span>
            <button
              onClick={() => setCurrentView('maturity')}
              className="text-amber-400 hover:underline font-mono text-[10px]"
            >
              TRIGGER ROLLOVER &rarr;
            </button>
          </div>
        </div>

        {/* Card 4: Court Stay / Dispute Frozen */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Judicial Injunctions</span>
            <span className="p-1.5 rounded-md bg-red-950 text-red-400 border border-red-800">
              <Gavel className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-red-400 tabular-nums">
              {frozenCount}
            </span>
            <span className="text-xs text-red-400 font-medium">DISPUTE FROZEN</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>High Court WP(C)/9421/2023</span>
            <button
              onClick={() => handleTriggerStayModal(fdrs.find(f => f.status === 'DISPUTE_FROZEN'))}
              className="text-red-400 hover:underline font-mono text-[10px]"
            >
              VIEW ORDER &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section: Regional Distribution & Bank Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Office Allocation */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-400" />
              <span>AICTE Regional Office Jurisdiction Breakdown</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">6 REGIONS</span>
          </div>

          <div className="space-y-3">
            {regionalDistribution.map((item) => (
              <div key={item.region} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.region} ({item.state})</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400">{item.count} deposit</span>
                    <span className="text-white font-semibold">₹{formatCroreLakhShort(item.amount)}</span>
                  </div>
                </div>
                {/* Visual Progress Track */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Commercial Bank Exposure */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Scheduled Commercial Bank Portfolio Exposure</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">RBI REGISTERED</span>
          </div>

          <div className="space-y-3">
            {bankDistribution.map((b) => (
              <div key={b.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {b.code}
                    </span>
                    <span className="font-semibold text-slate-200">{b.bank}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400">{b.share}%</span>
                    <span className="text-white font-semibold">₹{formatCroreLakhShort(b.total)}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.color} rounded-full`}
                    style={{ width: `${b.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Deposit Records Table Preview */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <span>Active Security Deposits Requiring Operational Attention</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live records across maturity horizon, pending verification, court stay, and liquidation queues.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('portfolio')}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            <span>Open Master Registry ({fdrs.length} FDRs)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">FDR Number</th>
                <th className="px-4 py-3">Technical Institution</th>
                <th className="px-4 py-3">Bank & Branch IFSC</th>
                <th className="px-4 py-3 text-right">Principal Amount</th>
                <th className="px-4 py-3">Maturity Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-medium">
              {fdrs.map((fdr) => (
                <tr key={fdr.id} className="hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-blue-300">
                    {fdr.fdrNumber}
                    <div className="text-[10px] text-slate-500 font-mono">
                      ID: {fdr.aictePermanentId}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-200 max-w-[220px]">
                    <div className="truncate font-semibold">{fdr.institutionName}</div>
                    <div className="text-[10px] text-slate-400">
                      Joint: {fdr.jointHolderSecondary}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-300">
                    <div>{fdr.bankName}</div>
                    <div className="text-[10px] text-slate-500">{fdr.branchIfsc}</div>
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-white font-semibold">
                    <CurrencyDisplay amount={fdr.principalAmount} size="md" />
                    <div className="text-[10px] text-slate-500">
                      ROI: {fdr.interestRate}%
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-300">
                    <div>{fdr.maturityDate}</div>
                    <div className="text-[10px] text-slate-500">{fdr.lockInYears} Yrs Lock-in</div>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={fdr.status} />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleOpenDetailDrawer(fdr)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 shadow-tactile transition inline-flex items-center gap-1"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
