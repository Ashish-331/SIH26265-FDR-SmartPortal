import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  Clock, 
  FileCheck, 
  Gavel, 
  CheckCircle2, 
  Building2, 
  RefreshCw, 
  FileSignature, 
  AlertOctagon,
  Sparkles
} from 'lucide-react';

const STATUS_CONFIG = {
  ACTIVE_LOCKED: {
    label: "ACTIVE LOCKED",
    bg: "bg-emerald-950/70 border-emerald-700/60 text-emerald-300",
    icon: Lock,
    dot: "bg-emerald-400"
  },
  LIEN_CONFIRMED: {
    label: "LIEN CONFIRMED",
    bg: "bg-blue-950/70 border-blue-600/60 text-blue-300",
    icon: ShieldCheck,
    dot: "bg-blue-400"
  },
  DISPUTE_FROZEN: {
    label: "DISPUTE FROZEN",
    bg: "bg-red-950/80 border-red-700/80 text-red-300 shadow-glow-crimson",
    icon: Gavel,
    dot: "bg-red-500 animate-pulse-dot"
  },
  MATURITY_NOTICE_SENT: {
    label: "T-90 NOTICE SENT",
    bg: "bg-amber-950/80 border-amber-600/70 text-amber-300",
    icon: AlertTriangle,
    dot: "bg-amber-400"
  },
  BANK_VERIFICATION_PENDING: {
    label: "CBS VERIFICATION PENDING",
    bg: "bg-slate-800 border-slate-600 text-slate-300",
    icon: Building2,
    dot: "bg-slate-400"
  },
  AFFIDAVIT6_VERIFIED: {
    label: "AFFIDAVIT-6 SIGNED",
    bg: "bg-indigo-950/70 border-indigo-600/60 text-indigo-300",
    icon: FileSignature,
    dot: "bg-indigo-400"
  },
  NO_DUES_CLEARED: {
    label: "NO DUES CLEARED",
    bg: "bg-teal-950/70 border-teal-600/60 text-teal-300",
    icon: CheckCircle2,
    dot: "bg-teal-400"
  },
  REGIONAL_OFFICE_RECOMMENDED: {
    label: "RO RECOMMENDED",
    bg: "bg-sky-950/70 border-sky-600/60 text-sky-300",
    icon: FileCheck,
    dot: "bg-sky-400"
  },
  HQ_APPROVED: {
    label: "HQ APPROVED",
    bg: "bg-emerald-950/80 border-emerald-500 text-emerald-200",
    icon: ShieldCheck,
    dot: "bg-emerald-300"
  },
  LIEN_REVOKED: {
    label: "LIEN REVOKED",
    bg: "bg-purple-950/70 border-purple-600/60 text-purple-300",
    icon: RefreshCw,
    dot: "bg-purple-400"
  },
  REFUNDED_OR_CLOSED: {
    label: "REFUNDED / CLOSED",
    bg: "bg-slate-900 border-slate-700 text-slate-400",
    icon: CheckCircle2,
    dot: "bg-slate-500"
  },
  SUBMITTED: {
    label: "SUBMITTED",
    bg: "bg-blue-950/40 border-blue-800 text-blue-300",
    icon: Clock,
    dot: "bg-blue-400"
  },
  DRAFT: {
    label: "DRAFT",
    bg: "bg-slate-800 border-slate-600 text-slate-400",
    icon: FileText,
    dot: "bg-slate-400"
  },
  OCR_EXTRACTED: {
    label: "OCR EXTRACTED",
    bg: "bg-violet-950/50 border-violet-700 text-violet-300",
    icon: Sparkles,
    dot: "bg-violet-400"
  },
  FORENSIC_VALIDATED: {
    label: "FORENSIC VALIDATED",
    bg: "bg-emerald-950/60 border-emerald-600 text-emerald-300",
    icon: ShieldCheck,
    dot: "bg-emerald-400"
  },
  AUTO_ROLLOVER_PENDING: {
    label: "AUTO ROLLOVER PENDING",
    bg: "bg-fuchsia-950/70 border-fuchsia-600/60 text-fuchsia-300",
    icon: RefreshCw,
    dot: "bg-fuchsia-400"
  },
  RELEASE_INITIATED: {
    label: "RELEASE INITIATED",
    bg: "bg-sky-950/60 border-sky-600 text-sky-300",
    icon: Clock,
    dot: "bg-sky-400"
  },
  FORFEITED: {
    label: "ENCASHED / FORFEITED",
    bg: "bg-rose-950 border-rose-800 text-rose-300",
    icon: AlertOctagon,
    dot: "bg-rose-500"
  },
  // Backward compatibility aliases
  ACTIVE: {
    label: "ACTIVE LOCKED",
    bg: "bg-emerald-950/70 border-emerald-700/60 text-emerald-300",
    icon: Lock,
    dot: "bg-emerald-400"
  },
  PENDING_BANK_VERIFICATION: {
    label: "CBS VERIFICATION PENDING",
    bg: "bg-slate-800 border-slate-600 text-slate-300",
    icon: Building2,
    dot: "bg-slate-400"
  },
  RELEASED: {
    label: "REFUNDED / CLOSED",
    bg: "bg-slate-900 border-slate-700 text-slate-400",
    icon: CheckCircle2,
    dot: "bg-slate-500"
  },
  LIQUIDATED_BY_AICTE: {
    label: "ENCASHED / FORFEITED",
    bg: "bg-rose-950 border-rose-800 text-rose-300",
    icon: AlertOctagon,
    dot: "bg-rose-500"
  },
  LIEN_MARKED: {
    label: "LIEN CONFIRMED",
    bg: "bg-blue-950/70 border-blue-600/60 text-blue-300",
    icon: ShieldCheck,
    dot: "bg-blue-400"
  }
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || "UNKNOWN",
    bg: "bg-slate-800 border-slate-700 text-slate-300",
    icon: Clock,
    dot: "bg-slate-400"
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono uppercase font-semibold border rounded-full ${config.bg} ${
      isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{config.label}</span>
    </span>
  );
}
