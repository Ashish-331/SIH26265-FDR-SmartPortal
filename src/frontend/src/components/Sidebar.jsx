import React from 'react';
import { usePortal } from '../context/AppContext';
import {
  LayoutDashboard,
  Layers,
  FileScan,
  Landmark,
  CalendarClock,
  ShieldCheck,
  Binary,
  Gavel,
  BookOpenCheck,
  Building
} from 'lucide-react';

export default function Sidebar() {
  const { currentView, setCurrentView, stats, fdrs } = usePortal();

  const disputedCount = fdrs.filter(f => f.status === 'DISPUTE_FROZEN').length;
  const maturityCount = fdrs.filter(f => f.status === 'MATURITY_NOTICE_SENT').length;
  const pendingCount = fdrs.filter(f => ['SUBMITTED', 'BANK_VERIFICATION_PENDING', 'OCR_EXTRACTED'].includes(f.status)).length;
  const releaseCount = fdrs.filter(f => ['RELEASE_INITIATED', 'AFFIDAVIT6_VERIFIED', 'NO_DUES_CLEARED'].includes(f.status)).length;

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Executive Overview',
      subtitle: 'Council Telemetry & Liquidity',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'portfolio',
      label: 'Deposit Portfolio',
      subtitle: 'Master AICTE Lien Registry',
      icon: Layers,
      badge: fdrs.length.toString(),
      badgeColor: 'bg-slate-800 text-slate-300'
    },
    {
      id: 'ingestion',
      label: 'FDR Ingestion & OCR',
      subtitle: 'Forensic Tamper Inspection',
      icon: FileScan,
      badge: pendingCount > 0 ? `${pendingCount} PENDING` : null,
      badgeColor: 'bg-blue-900/80 text-blue-300 border border-blue-700'
    },
    {
      id: 'cbs',
      label: 'Bank CBS & NeSL Gateway',
      subtitle: 'Direct Core Banking & SFMS',
      icon: Landmark,
      badge: '4 BANKS',
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-800'
    },
    {
      id: 'maturity',
      label: 'Maturity & Escalations',
      subtitle: 'T-90/60/30 Rollover Queue',
      icon: CalendarClock,
      badge: maturityCount > 0 ? `${maturityCount} ACTION` : null,
      badgeColor: 'bg-amber-950 text-amber-300 border border-amber-800'
    },
    {
      id: 'release',
      label: 'Release & Affidavit-6',
      subtitle: 'Multi-Bureau DSC / e-Sign',
      icon: ShieldCheck,
      badge: releaseCount > 0 ? `${releaseCount} SIGN-OFF` : null,
      badgeColor: 'bg-indigo-950 text-indigo-300 border border-indigo-800'
    },
    {
      id: 'audit',
      label: 'Cryptographic Ledger',
      subtitle: 'SHA-256 Merkle Explorer',
      icon: Binary,
      badge: stats?.tamperDetected ? 'TAMPER ALERT' : 'SECURE',
      badgeColor: stats?.tamperDetected 
        ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse-dot' 
        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
          Core Operations Framework
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition ${
                isActive
                  ? 'bg-blue-900/40 text-blue-200 border border-blue-700/60 shadow-tactile'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-slate-200'}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Statutory Regulatory Footer Note */}
      <div className="p-3 m-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
          <BookOpenCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>APH Regulation §7.12</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Joint FDR holding with AICTE Regional Officer is statutory. Unilateral liquidation by institution or bank constitutes a cognizable offense under Section 409 IPC.
        </p>
        <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800">
          <span>PORTAL v2.4-PROD</span>
          <span className="text-emerald-400">STATUS: ONLINE</span>
        </div>
      </div>
    </aside>
  );
}
