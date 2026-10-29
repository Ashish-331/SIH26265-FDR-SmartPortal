import React, { useState } from 'react';
import { usePortal } from '../context/AppContext';
import { ocrForensicService, fdrApiService } from '../services/api';
import CurrencyDisplay from './common/CurrencyDisplay';
import {
  FileScan,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  FileText,
  Sparkles,
  ArrowRight,
  Eye,
  RefreshCw,
  Building,
  Info
} from 'lucide-react';

export default function FdrIngestionOcr() {
  const { refreshPortalData, setCurrentView } = usePortal();

  // Submission Form State
  const [formData, setFormData] = useState({
    aictePermanentId: '1-432567891',
    jointHolderPrimary: 'Maharashtra Institute of Technology & Research (MITR)',
    jointHolderSecondary: 'Regional Officer, WRO AICTE Mumbai',
    bankCode: 'SBI',
    bankName: 'State Bank of India',
    branchIfsc: 'SBIN0000691',
    branchName: 'Pune Industrial Estate Branch',
    fdrNumber: 'SBI-FDR-992288',
    accountNumber: '30291827461',
    principalAmount: '3500000',
    depositDate: '2024-04-01',
    maturityDate: '2032-04-01',
    lockInYears: '8',
    interestRate: '7.15',
    isAutoRenewalEnabled: true
  });

  // OCR & Forensic Inspection State
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [selectedScanPreset, setSelectedScanPreset] = useState('AUTHENTIC_SBI'); // 'AUTHENTIC_SBI' | 'FORGED_TAMPERED'
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Quick Preset Selector
  const handleLoadScanPreset = (presetType) => {
    setSelectedScanPreset(presetType);
    setOcrResult(null);
    setSubmissionSuccess(false);
    setErrorMessage(null);

    if (presetType === 'AUTHENTIC_SBI') {
      setFormData({
        aictePermanentId: '1-432567891',
        jointHolderPrimary: 'Maharashtra Institute of Technology & Research (MITR)',
        jointHolderSecondary: 'Regional Officer, WRO AICTE Mumbai',
        bankCode: 'SBI',
        bankName: 'State Bank of India',
        branchIfsc: 'SBIN0000691',
        branchName: 'Pune Industrial Estate Branch',
        fdrNumber: 'SBI-FDR-992288',
        accountNumber: '30291827461',
        principalAmount: '3500000',
        depositDate: '2024-04-01',
        maturityDate: '2032-04-01',
        lockInYears: '8',
        interestRate: '7.15',
        isAutoRenewalEnabled: true
      });
    } else {
      setFormData({
        aictePermanentId: '1-667788990',
        jointHolderPrimary: 'Private Unregistered Polytechnic Society',
        jointHolderSecondary: 'Unilateral Private Trust (MISSING AICTE)',
        bankCode: 'PNB',
        bankName: 'Punjab National Bank',
        branchIfsc: 'PUNB0019283',
        branchName: 'Suburban Branch',
        fdrNumber: 'PNB-FRAUD-SAMPLE-007',
        accountNumber: '9988112233',
        principalAmount: '100000',
        depositDate: '2024-01-01',
        maturityDate: '2025-01-01',
        lockInYears: '1',
        interestRate: '14.50',
        isAutoRenewalEnabled: false
      });
    }
  };

  // Dispatch OCR Forensic Inspection
  const dispatchForensicOcrInspection = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setOcrResult(null);

    try {
      const response = await ocrForensicService.inspectDocument({
        declaredFdrNumber: formData.fdrNumber,
        declaredAmount: parseFloat(formData.principalAmount),
        declaredBankName: formData.bankName,
        declaredIfsc: formData.branchIfsc,
        declaredInterestRate: parseFloat(formData.interestRate)
      });

      setOcrResult(response.data);
    } catch (err) {
      setErrorMessage("Forensic OCR service failed to analyze document buffer.");
    } finally {
      setIsScanning(false);
    }
  };

  // Submit Verified FDR into Portal
  const handleTrusteeFdrSubmission = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (ocrResult && ocrResult.forensicAnalysis.requiresManualReview) {
      setErrorMessage("Submission blocked: Forensic Tamper Gauge detected adversarial alteration. Please refer to AICTE Vigilance Cell.");
      return;
    }

    try {
      await fdrApiService.submitFdr({
        ...formData,
        principalAmount: parseFloat(formData.principalAmount),
        lockInYears: parseInt(formData.lockInYears),
        interestRate: parseFloat(formData.interestRate)
      });

      setSubmissionSuccess(true);
      await refreshPortalData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to commit FDR submission.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileScan className="w-6 h-6 text-blue-400" />
            <span>FDR Ingestion & Computer Vision Forensic OCR</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated optical extraction, font anomaly detection, photometric jitter verification, and AICTE joint-holder compliance check.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <span className="text-slate-400 px-2">Preset Scenario:</span>
          <button
            onClick={() => handleLoadScanPreset('AUTHENTIC_SBI')}
            className={`px-2.5 py-1 rounded text-xs transition ${
              selectedScanPreset === 'AUTHENTIC_SBI'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Authentic SBI Deposit (₹35L)
          </button>
          <button
            onClick={() => handleLoadScanPreset('FORGED_TAMPERED')}
            className={`px-2.5 py-1 rounded text-xs transition ${
              selectedScanPreset === 'FORGED_TAMPERED'
                ? 'bg-red-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Adversarial Forgery (Tampered)
          </button>
        </div>
      </div>

      {/* Main Grid: Left Upload/Scanner Simulator & Right OCR Extraction Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Scanner & Forensic Gauge (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Simulated Certificate Preview Box */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Certificate Document Scan</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                selectedScanPreset === 'AUTHENTIC_SBI'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-red-950 text-red-300 border-red-800'
              }`}>
                {selectedScanPreset === 'AUTHENTIC_SBI' ? 'AUTHENTIC SCAN' : 'FORGERY SAMPLE'}
              </span>
            </div>

            {/* Document Render Canvas */}
            <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-5 font-mono text-[11px] leading-relaxed select-none overflow-hidden min-h-[300px]">
              {/* Laser Scanning Bar */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500 shadow-glow-blue z-20 animate-laser-scan">
                  <div className="w-full h-8 bg-blue-500/10 blur-sm -mt-4" />
                </div>
              )}

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <span className="text-6xl font-black rotate-[-25deg] text-white">AICTE ESCROW</span>
              </div>

              {/* Bank Header Preview */}
              <div className="border-b border-slate-800 pb-3 mb-3 text-center">
                <div className="font-bold text-sm text-amber-400 tracking-wider uppercase">
                  {formData.bankName}
                </div>
                <div className="text-[10px] text-slate-400">
                  FIXED DEPOSIT RECEIPT / SPECIAL TERM DEPOSIT
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  BRANCH IFSC: {formData.branchIfsc} | {formData.branchName}
                </div>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">FDR NO:</span>
                  <span className="font-bold text-white">{formData.fdrNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ACCOUNT NO:</span>
                  <span>{formData.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PRINCIPAL AMOUNT:</span>
                  <span className="font-bold text-amber-300">₹{parseFloat(formData.principalAmount).toLocaleString('en-IN')}.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VALUE DATE:</span>
                  <span>{formData.depositDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MATURITY DATE:</span>
                  <span>{formData.maturityDate} ({formData.lockInYears} YRS)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">INTEREST RATE:</span>
                  <span>{formData.interestRate}% p.a.</span>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-500 block">JOINT TITLE / LIEN HOLDER:</span>
                  <span className={`block font-semibold mt-0.5 ${
                    selectedScanPreset === 'AUTHENTIC_SBI' ? 'text-emerald-300' : 'text-red-400'
                  }`}>
                    1. {formData.jointHolderPrimary}<br/>
                    2. {formData.jointHolderSecondary}
                  </span>
                </div>
              </div>

              {/* Scan Trigger Button */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={dispatchForensicOcrInspection}
                  disabled={isScanning}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold text-xs transition shadow-tactile"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Running CV Forensics & OCR...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Certificate Forensics</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Computer Vision Forensic Analysis Meter */}
          {ocrResult && (
            <div className={`p-4 rounded-xl border shadow-tactile space-y-3 ${
              ocrResult.forensicAnalysis.requiresManualReview
                ? 'bg-red-950/60 border-red-700 text-red-200'
                : 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                  {ocrResult.forensicAnalysis.requiresManualReview ? (
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Forensic Tamper Assessment</span>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  ocrResult.forensicAnalysis.requiresManualReview
                    ? 'bg-red-900 text-red-200 border-red-600 animate-pulse-dot'
                    : 'bg-emerald-900 text-emerald-200 border-emerald-600'
                }`}>
                  RISK SCORE: {ocrResult.forensicAnalysis.fraudRiskScore}%
                </span>
              </div>

              {/* Key Diagnostic Chips */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">OCR Confidence</span>
                  <span className="font-bold text-white">{(ocrResult.confidenceScore * 100).toFixed(1)}%</span>
                </div>

                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Font Consistency</span>
                  <span className="font-bold text-white">{ocrResult.forensicAnalysis.fontConsistencyScore}%</span>
                </div>

                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Photometric Jitter</span>
                  <span className="font-bold text-white">{ocrResult.forensicAnalysis.photometricJitterRmse} RMSE</span>
                </div>

                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">AICTE Joint Clause</span>
                  <span className={ocrResult.extractedData.jointHolderVerified ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
                    {ocrResult.extractedData.jointHolderVerified ? "DETECTED & VALID" : "MISSING"}
                  </span>
                </div>
              </div>

              {/* Anomalies List */}
              {ocrResult.forensicAnalysis.anomalyList && ocrResult.forensicAnalysis.anomalyList.length > 0 && (
                <div className="pt-2 border-t border-red-800/80 space-y-1 text-xs">
                  <span className="font-bold uppercase text-[10px] text-red-300">Detected Manipulations:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-200">
                    {ocrResult.forensicAnalysis.anomalyList.map((anom, idx) => (
                      <li key={idx}>{anom}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Ingestion Form & Reconciliation Verification (7 cols) */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleTrusteeFdrSubmission}
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-tactile space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                <span>Statutory Fixed Deposit Receipt Declaration</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-400">APH 2024-2027 FORMAT</span>
            </div>

            {submissionSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-sm">FDR Successfully Ingested into Registry</div>
                  <div>Record dispatched to Scheduled Commercial Bank CBS Gateway for irrevocable statutory lien confirmation.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('portfolio')}
                  className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  View in Portfolio &rarr;
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/70 border border-red-700 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Field Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Institution AICTE Permanent ID */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  AICTE Permanent Institute ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.aictePermanentId}
                  onChange={(e) => setFormData({ ...formData, aictePermanentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* FDR Number */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  FDR Certificate Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.fdrNumber}
                  onChange={(e) => setFormData({ ...formData, fdrNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Primary Holder */}
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">
                  Primary Account Holder (Technical Institution / Trust)
                </label>
                <input
                  type="text"
                  required
                  value={formData.jointHolderPrimary}
                  onChange={(e) => setFormData({ ...formData, jointHolderPrimary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Secondary Holder (AICTE Mandated) */}
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                  <span>Mandatory Secondary Joint Holder</span>
                  <span className="text-[10px] text-amber-400 font-mono">APH §7.12 COMPLIANCE</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.jointHolderSecondary}
                  onChange={(e) => setFormData({ ...formData, jointHolderSecondary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-emerald-300 font-medium rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Bank Code */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Scheduled Commercial Bank
                </label>
                <select
                  value={formData.bankCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const names = {
                      SBI: 'State Bank of India',
                      PNB: 'Punjab National Bank',
                      CANARA: 'Canara Bank',
                      HDFC: 'HDFC Bank Ltd',
                      BOB: 'Bank of Baroda',
                      AXIS: 'Axis Bank'
                    };
                    setFormData({
                      ...formData,
                      bankCode: code,
                      bankName: names[code] || `${code} Commercial Bank`
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="SBI">State Bank of India (SBI)</option>
                  <option value="PNB">Punjab National Bank (PNB)</option>
                  <option value="CANARA">Canara Bank</option>
                  <option value="HDFC">HDFC Bank</option>
                  <option value="BOB">Bank of Baroda</option>
                  <option value="AXIS">Axis Bank</option>
                </select>
              </div>

              {/* Branch IFSC */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Branch IFSC Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.branchIfsc}
                  onChange={(e) => setFormData({ ...formData, branchIfsc: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono uppercase rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Principal Amount */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Principal Amount (INR ₹)
                </label>
                <input
                  type="number"
                  required
                  value={formData.principalAmount}
                  onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-white font-mono font-bold rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Interest Rate */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Deposit Date */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Deposit Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.depositDate}
                  onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Maturity Date */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Maturity Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.maturityDate}
                  onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-200 font-mono rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Statutory Auto-Renewal Checkbox */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isAutoRenewalEnabled}
                  onChange={(e) => setFormData({ ...formData, isAutoRenewalEnabled: e.target.checked })}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-white">Enable Statutory Auto-Rollover Clause</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Instructs the Scheduled Commercial Bank to automatically renew the FDR upon maturity for successive 3-year tranches unless AICTE issues an explicit e-Signed NOC.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 font-mono">
                {ocrResult ? "OCR Verified ✓" : "Pre-submission OCR Recommended"}
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-tactile transition"
              >
                <span>Commit Pledged Deposit to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
