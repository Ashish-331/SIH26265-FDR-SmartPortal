import React from 'react';
import { usePortal } from '../context/AppContext';
import CurrencyDisplay from './common/CurrencyDisplay';
import StatusBadge from './common/StatusBadge';
import {
  X,
  Lock,
  Landmark,
  FileText,
  ShieldCheck,
  Calendar,
  Building,
  KeyRound,
  FileCheck2,
  ExternalLink,
  Gavel,
  RefreshCw,
  Clock,
  Binary
} from 'lucide-react';

export default function FdrDetailDrawer() {
  const { 
    drawerOpen, 
    handleCloseDetailDrawer, 
    selectedFdr, 
    handleTriggerStayModal,
    setCurrentView 
  } = usePortal();

  if (!drawerOpen || !selectedFdr) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-tactile-lg h-full overflow-y-auto flex flex-col justify-between p-6 space-y-6">
        {/* Drawer Header */}
        <div className="space-y-3 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase font-semibold">
              OFFICIAL AICTE ESCROW RECORD
            </span>

            <button
              onClick={handleCloseDetailDrawer}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                {selectedFdr.fdrNumber}
              </h2>
              <div className="text-xs text-slate-400 mt-0.5">
                PID: {selectedFdr.aictePermanentId} — {selectedFdr.institutionName}
              </div>
            </div>

            <StatusBadge status={selectedFdr.status} size="md" />
          </div>
        </div>

        {/* Core Financial Snapshot */}
        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Encumbered Principal</span>
            <CurrencyDisplay amount={selectedFdr.principalAmount} size="lg" highlight />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Projected Maturity Value</span>
            <CurrencyDisplay amount={selectedFdr.maturityAmount || selectedFdr.principalAmount * 1.6} size="lg" />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Value Date</span>
            <span className="text-white font-bold">{selectedFdr.depositDate}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Maturity Date</span>
            <span className="text-amber-400 font-bold">{selectedFdr.maturityDate}</span>
          </div>
        </div>

        {/* Banking & Lien Particulars */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-400" />
            <span>Scheduled Commercial Bank Particulars</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] divide-y divide-slate-800/60">
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Bank & Branch:</span>
              <span className="text-white font-semibold">{selectedFdr.bankName} ({selectedFdr.branchName})</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Branch IFSC:</span>
              <span className="text-slate-200">{selectedFdr.branchIfsc}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Account Number:</span>
              <span className="text-slate-200">{selectedFdr.accountNumber}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Lien Status:</span>
              <span className={selectedFdr.lienStatus === 'LIEN_CONFIRMED' ? "text-emerald-400 font-bold" : "text-amber-400"}>
                {selectedFdr.lienStatus}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Lien Reference:</span>
              <span className="text-slate-300 font-bold">{selectedFdr.lienReferenceNumber || 'None'}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">SFMS MT760 Ack:</span>
              <span className="text-slate-300">{selectedFdr.sfmsAckNumber || 'PENDING DISPATCH'}</span>
            </div>
          </div>
        </div>

        {/* Statutory Joint Holding Declaration */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>APH §7.12 Joint-Holding Escrow</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">Primary Account Holder:</span>
              <span className="font-semibold text-white">{selectedFdr.jointHolderPrimary}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Secondary Joint Holder (AICTE Mandate):</span>
              <span className="font-semibold text-emerald-400">{selectedFdr.jointHolderSecondary}</span>
            </div>
          </div>
        </div>

        {/* Document Cryptographic Hashes */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-[10px]">
          <div className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-sans text-xs">
            <Binary className="w-4 h-4 text-purple-400" />
            <span>Document Cryptographic Hashes</span>
          </div>

          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 break-all">
            <span className="text-slate-500 block uppercase text-[9px]">Certificate SHA-256</span>
            {selectedFdr.documentHashSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
          </div>

          <div className="flex justify-between text-slate-400 pt-1">
            <span>OCR Confidence: {(selectedFdr.ocrConfidence * 100).toFixed(1)}%</span>
            <span>Forensic Tamper: {selectedFdr.forensicTamperScore || 0.04}</span>
          </div>
        </div>

        {/* Bottom Drawer Quick Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={() => {
              handleCloseDetailDrawer();
              handleTriggerStayModal(selectedFdr);
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-semibold shadow-tactile transition flex items-center justify-center gap-1.5"
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Apply Judicial Freeze</span>
          </button>

          <button
            onClick={() => {
              handleCloseDetailDrawer();
              setCurrentView('cbs');
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-tactile transition flex items-center justify-center gap-1.5"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Manage CBS Lien</span>
          </button>
        </div>
      </div>
    </div>
  );
}
