import React, { useState, useMemo } from 'react';
import { usePortal } from '../context/AppContext';
import CurrencyDisplay from './common/CurrencyDisplay';
import StatusBadge from './common/StatusBadge';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  Lock,
  Layers,
  FileSpreadsheet,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function DepositPortfolio() {
  const { fdrs, handleOpenDetailDrawer, handleTriggerStayModal } = usePortal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('maturityDate'); // 'amount', 'maturityDate', 'fdrNumber'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Filter & Sort Logic
  const filteredAndSortedFdrs = useMemo(() => {
    let items = [...fdrs];

    // Bank filter
    if (selectedBankFilter !== 'ALL') {
      items = items.filter(f => f.bankCode === selectedBankFilter);
    }

    // Status filter
    if (selectedStatusFilter !== 'ALL') {
      items = items.filter(f => f.status === selectedStatusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(f =>
        f.fdrNumber.toLowerCase().includes(q) ||
        f.institutionName.toLowerCase().includes(q) ||
        f.branchIfsc.toLowerCase().includes(q) ||
        f.aictePermanentId.toLowerCase().includes(q) ||
        f.bankName.toLowerCase().includes(q)
      );
    }

    // Sorting
    items.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'amount') {
        comparison = a.principalAmount - b.principalAmount;
      } else if (sortBy === 'maturityDate') {
        comparison = new Date(a.maturityDate) - new Date(b.maturityDate);
      } else if (sortBy === 'fdrNumber') {
        comparison = a.fdrNumber.localeCompare(b.fdrNumber);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [fdrs, selectedBankFilter, selectedStatusFilter, searchQuery, sortBy, sortDirection]);

  // Handle Sort Toggle
  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // CSV Export
  const executeRegistryCsvExport = () => {
    const headers = ["FDR Number", "AICTE Permanent ID", "Technical Institution", "Bank", "Branch IFSC", "Principal (INR)", "Interest Rate", "Deposit Date", "Maturity Date", "Status", "Lien Reference"];
    const rows = filteredAndSortedFdrs.map(f => [
      `"${f.fdrNumber}"`,
      `"${f.aictePermanentId}"`,
      `"${f.institutionName}"`,
      `"${f.bankName}"`,
      `"${f.branchIfsc}"`,
      f.principalAmount,
      f.interestRate,
      f.depositDate,
      f.maturityDate,
      `"${f.status}"`,
      `"${f.lienReferenceNumber || 'NONE'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aicte_fdr_registry_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-400" />
            <span>Master AICTE Security Deposit Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Statutory Fixed Deposit Receipts pledged jointly in favor of AICTE Regional Officers under the Approval Process Handbook.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={executeRegistryCsvExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-tactile transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Universal Search Input */}
          <div className="relative md:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by FDR No, College, IFSC, AICTE Permanent ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 text-slate-200 placeholder-slate-500 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Bank Filter */}
          <div className="relative">
            <select
              value={selectedBankFilter}
              onChange={(e) => setSelectedBankFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
            >
              <option value="ALL">All Scheduled Banks</option>
              <option value="SBI">State Bank of India (SBI)</option>
              <option value="PNB">Punjab National Bank (PNB)</option>
              <option value="CANARA">Canara Bank</option>
              <option value="HDFC">HDFC Bank</option>
              <option value="BOB">Bank of Baroda</option>
              <option value="AXIS">Axis Bank</option>
            </select>
          </div>

          {/* Status Filter (18 Statutory States) */}
          <div className="relative">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
            >
              <option value="ALL">All 18 Lifecycle States</option>
              <optgroup label="1. Ingestion & Inspection">
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="OCR_EXTRACTED">OCR_EXTRACTED</option>
                <option value="FORENSIC_VALIDATED">FORENSIC_VALIDATED</option>
              </optgroup>
              <optgroup label="2. Banking & Lien Marking">
                <option value="BANK_VERIFICATION_PENDING">BANK_VERIFICATION_PENDING</option>
                <option value="LIEN_CONFIRMED">LIEN_CONFIRMED</option>
                <option value="ACTIVE_LOCKED">ACTIVE_LOCKED</option>
              </optgroup>
              <optgroup label="3. Servicing & Rollover">
                <option value="MATURITY_NOTICE_SENT">MATURITY_NOTICE_SENT (T-90)</option>
                <option value="AUTO_ROLLOVER_PENDING">AUTO_ROLLOVER_PENDING</option>
              </optgroup>
              <optgroup label="4. Multi-Bureau Clearance & Release">
                <option value="RELEASE_INITIATED">RELEASE_INITIATED</option>
                <option value="AFFIDAVIT6_VERIFIED">AFFIDAVIT6_VERIFIED</option>
                <option value="NO_DUES_CLEARED">NO_DUES_CLEARED</option>
                <option value="REGIONAL_OFFICE_RECOMMENDED">REGIONAL_OFFICE_RECOMMENDED</option>
                <option value="HQ_APPROVED">HQ_APPROVED</option>
                <option value="LIEN_REVOKED">LIEN_REVOKED</option>
                <option value="REFUNDED_OR_CLOSED">REFUNDED_OR_CLOSED</option>
              </optgroup>
              <optgroup label="5. Enforcement & Judicial">
                <option value="DISPUTE_FROZEN">DISPUTE_FROZEN</option>
                <option value="FORFEITED">FORFEITED</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Filter Badges & Quick Counters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-white font-mono">{filteredAndSortedFdrs.length}</strong> of {fdrs.length} deposits</span>
            {(selectedBankFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedBankFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-blue-400 hover:underline font-mono"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">Encumbered Total:</span>
            <CurrencyDisplay
              amount={filteredAndSortedFdrs.reduce((s, f) => s + (f.principalAmount || 0), 0)}
              size="md"
              highlight
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-tactile overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th
                  onClick={() => handleSortToggle('fdrNumber')}
                  className="px-4 py-3 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>FDR Details</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                <th className="px-4 py-3">Technical Institution & Society</th>
                <th className="px-4 py-3">Scheduled Bank & Branch</th>

                <th
                  onClick={() => handleSortToggle('amount')}
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Principal (INR)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                <th
                  onClick={() => handleSortToggle('maturityDate')}
                  className="px-4 py-3 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Maturity Window</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>

                <th className="px-4 py-3">Lifecycle State</th>
                <th className="px-4 py-3">Lien Reference</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-medium">
              {filteredAndSortedFdrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No Fixed Deposit records matching query.</p>
                    <p className="text-xs text-slate-500">Try adjusting your search terms or bank filter.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedFdrs.map((fdr) => (
                  <tr
                    key={fdr.id}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => handleOpenDetailDrawer(fdr)}
                  >
                    {/* FDR Number */}
                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold text-blue-300 hover:underline">
                        {fdr.fdrNumber}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        A/C: {fdr.accountNumber}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        PID: {fdr.aictePermanentId}
                      </div>
                    </td>

                    {/* Institution */}
                    <td className="px-4 py-3.5 max-w-[240px]">
                      <div className="font-semibold text-slate-200 truncate">
                        {fdr.institutionName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Joint: {fdr.jointHolderSecondary}
                      </div>
                    </td>

                    {/* Bank */}
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      <div className="font-semibold text-slate-200">{fdr.bankName}</div>
                      <div className="text-[10px] text-slate-400">{fdr.branchName}</div>
                      <div className="text-[10px] text-slate-500">IFSC: {fdr.branchIfsc}</div>
                    </td>

                    {/* Principal */}
                    <td className="px-4 py-3.5 text-right font-mono">
                      <CurrencyDisplay amount={fdr.principalAmount} size="md" />
                      <div className="text-[10px] text-slate-400">
                        @ {fdr.interestRate}% p.a.
                      </div>
                    </td>

                    {/* Maturity */}
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      <div className="font-semibold text-white">{fdr.maturityDate}</div>
                      <div className="text-[10px] text-slate-400">
                        Issued: {fdr.depositDate} ({fdr.lockInYears} Yrs)
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={fdr.status} />
                    </td>

                    {/* Lien Reference */}
                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      {fdr.lienReferenceNumber ? (
                        <span className="text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                          {fdr.lienReferenceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetailDrawer(fdr)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 shadow-tactile transition inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
