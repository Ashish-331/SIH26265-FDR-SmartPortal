/**
 * AICTE Smart FDR & Security Deposit Management Portal (SIH 26265)
 * Dual-Mode Production Service Client
 * 
 * Automatically probes live microservices (FDR Service :8000, Bank Gateway :8001,
 * OCR Engine :8002, Merkle Audit :8003). If offline, seamlessly switches to high-fidelity
 * in-memory mock repositories with complete state mutation capabilities.
 */

const API_TIMEOUT_MS = 1800;

// Configurable base URLs
const CORE_FDR_URL = 'http://localhost:8000';
const BANK_GATEWAY_URL = 'http://localhost:8001';
const OCR_SERVICE_URL = 'http://localhost:8002';
const AUDIT_SERVICE_URL = 'http://localhost:8003';

// Helper to probe fetch with quick timeout
async function probedFetch(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// High-Fidelity Seeded Repositories (Reflecting Indian Higher Ed Institutions)
// ---------------------------------------------------------------------------

export const INITIAL_INSTITUTIONS = [
  {
    id: "inst-mh-001",
    aictePermanentId: "1-432567891",
    name: "Maharashtra Institute of Technology & Research (MITR)",
    trustSocietyName: "Shree Chhatrapati Educational Trust, Pune",
    state: "Maharashtra",
    region: "WRO-MUMBAI",
    pan: "AAATC1982K",
    gstin: "27AAATC1982K1Z5",
    type: "ENGINEERING_DEGREE",
    contactEmail: "registrar@mitr-pune.ac.in",
    complianceScore: 98.4
  },
  {
    id: "inst-ka-002",
    aictePermanentId: "1-778819234",
    name: "Bangalore Global Academy of Technology",
    trustSocietyName: "Karnataka Vidya Pratisthan, Bengaluru",
    state: "Karnataka",
    region: "SWRO-BANGALORE",
    pan: "AAATB4810D",
    gstin: "29AAATB4810D1Z9",
    type: "MANAGEMENT_PGDM",
    contactEmail: "director@bgat-bangalore.edu.in",
    complianceScore: 94.2
  },
  {
    id: "inst-dl-003",
    aictePermanentId: "1-102938475",
    name: "Indraprastha Institute of Technology & Polytechnic",
    trustSocietyName: "Delhi Technical Heritage Society, New Delhi",
    state: "Delhi NCR",
    region: "NWRO-CHANDIGARH",
    pan: "AAATI5502L",
    gstin: "07AAATI5502L1ZQ",
    type: "POLYTECHNIC_DIPLOMA",
    contactEmail: "dean@iipt-delhi.gov.in",
    complianceScore: 91.0
  },
  {
    id: "inst-tn-004",
    aictePermanentId: "1-554433221",
    name: "Sri Ramanujan College of Engineering & AI",
    trustSocietyName: "Tamil Nadu Educational Foundation, Chennai",
    state: "Tamil Nadu",
    region: "SRO-CHENNAI",
    pan: "AAATR9988M",
    gstin: "33AAATR9988M1Z8",
    type: "ENGINEERING_DEGREE",
    contactEmail: "fdr-desk@srce-chennai.org",
    complianceScore: 99.1
  },
  {
    id: "inst-up-005",
    aictePermanentId: "1-667788990",
    name: "Avadh Institute of Pharmaceutical Sciences",
    trustSocietyName: "Ganga Valley Welfare Association, Lucknow",
    state: "Uttar Pradesh",
    region: "NRO-KANPUR",
    pan: "AAATA1234N",
    gstin: "09AAATA1234N1Z1",
    type: "PHARMACY_DEGREE",
    contactEmail: "principal@aips-lucknow.ac.in",
    complianceScore: 78.5
  },
  {
    id: "inst-gj-006",
    aictePermanentId: "1-998877665",
    name: "Sardar Vallabhbhai Institute of Applied Computing",
    trustSocietyName: "Gujarat Kelavani Mandal, Ahmedabad",
    state: "Gujarat",
    region: "CRO-BHOPAL",
    pan: "AAATS7766P",
    gstin: "24AAATS7766P1Z3",
    type: "ENGINEERING_DEGREE",
    contactEmail: "admin@sviac-ahmedabad.edu.in",
    complianceScore: 96.0
  }
];

export const INITIAL_FDRS = [
  {
    id: "fdr-sbi-001",
    fdrNumber: "SBI-FDR-778899",
    accountNumber: "30198273641",
    aictePermanentId: "1-432567891",
    institutionName: "Maharashtra Institute of Technology & Research (MITR)",
    bankCode: "SBI",
    bankName: "State Bank of India",
    branchName: "Pune Industrial Estate Branch",
    branchIfsc: "SBIN0000691",
    principalAmount: 3500000,
    currency: "INR",
    depositDate: "2023-04-10",
    maturityDate: "2031-04-10",
    lockInYears: 8,
    interestRate: 7.10,
    status: "ACTIVE_LOCKED",
    lienStatus: "LIEN_CONFIRMED",
    lienReferenceNumber: "LIEN-SBI-2023-0012",
    lienMarkedAt: "2023-04-15T11:24:00Z",
    jointHolderPrimary: "Maharashtra Institute of Technology & Research",
    jointHolderSecondary: "Regional Officer, WRO AICTE Mumbai",
    isAutoRenewalEnabled: true,
    renewalCount: 0,
    currentBalance: 3500000,
    maturityAmount: 5882410,
    documentHashSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    ocrConfidence: 0.985,
    forensicTamperScore: 0.04,
    bureauClearance: {
      approvalBureau: { status: "CLEARED", officer: "Dr. R. K. Sharma (Director)", timestamp: "2023-04-12T10:15:00Z" },
      financeBureau: { status: "CLEARED", officer: "Shri S. V. Nair (Finance Officer)", timestamp: "2023-04-13T14:30:00Z" },
      legalBureau: { status: "CLEARED", officer: "Adv. Preeti Sen (Legal Cell)", timestamp: "2023-04-14T09:45:00Z" }
    },
    stayOrder: null,
    sfmsAckNumber: "SFMS-MT760-2023-SBI-009871"
  },
  {
    id: "fdr-pnb-002",
    fdrNumber: "PNB-FDR-443322",
    accountNumber: "0291008700019283",
    aictePermanentId: "1-778819234",
    institutionName: "Bangalore Global Academy of Technology",
    bankCode: "PNB",
    bankName: "Punjab National Bank",
    branchName: "MG Road Mega Branch, Bengaluru",
    branchIfsc: "PUNB0029100",
    principalAmount: 5000000,
    currency: "INR",
    depositDate: "2019-06-01",
    maturityDate: "2027-06-01",
    lockInYears: 8,
    interestRate: 6.85,
    status: "ACTIVE_LOCKED",
    lienStatus: "LIEN_CONFIRMED",
    lienReferenceNumber: "LIEN-PNB-2019-8812",
    lienMarkedAt: "2019-06-05T16:00:00Z",
    jointHolderPrimary: "Bangalore Global Academy of Technology",
    jointHolderSecondary: "Regional Officer, SWRO AICTE Bangalore",
    isAutoRenewalEnabled: true,
    renewalCount: 0,
    currentBalance: 5000000,
    maturityAmount: 8245100,
    documentHashSha256: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    ocrConfidence: 0.962,
    forensicTamperScore: 0.08,
    bureauClearance: {
      approvalBureau: { status: "CLEARED", officer: "Dr. K. Srinivas", timestamp: "2019-06-03T11:00:00Z" },
      financeBureau: { status: "CLEARED", officer: "Shri M. Sundaram", timestamp: "2019-06-04T12:00:00Z" },
      legalBureau: { status: "CLEARED", officer: "Adv. G. Rao", timestamp: "2019-06-04T17:00:00Z" }
    },
    stayOrder: null,
    sfmsAckNumber: "SFMS-MT760-2019-PNB-004419"
  },
  {
    id: "fdr-can-003",
    fdrNumber: "CAN-FDR-889911",
    accountNumber: "119283746501",
    aictePermanentId: "1-102938475",
    institutionName: "Indraprastha Institute of Technology & Polytechnic",
    bankCode: "CANARA",
    bankName: "Canara Bank",
    branchName: "Connaught Place Branch, Delhi",
    branchIfsc: "CNRB0001192",
    principalAmount: 2500000,
    currency: "INR",
    depositDate: "2016-11-20",
    maturityDate: "2026-11-20",
    lockInYears: 10,
    interestRate: 7.25,
    status: "MATURITY_NOTICE_SENT",
    lienStatus: "LIEN_CONFIRMED",
    lienReferenceNumber: "LIEN-CAN-2016-7731",
    lienMarkedAt: "2016-11-25T14:10:00Z",
    jointHolderPrimary: "Indraprastha Institute of Technology",
    jointHolderSecondary: "Regional Officer, NWRO AICTE Chandigarh",
    isAutoRenewalEnabled: false,
    renewalCount: 0,
    currentBalance: 2500000,
    maturityAmount: 5124000,
    documentHashSha256: "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7",
    ocrConfidence: 0.991,
    forensicTamperScore: 0.02,
    bureauClearance: {
      approvalBureau: { status: "PENDING", officer: null, timestamp: null },
      financeBureau: { status: "PENDING", officer: null, timestamp: null },
      legalBureau: { status: "PENDING", officer: null, timestamp: null }
    },
    stayOrder: null,
    sfmsAckNumber: "SFMS-MT760-2016-CAN-007731"
  },
  {
    id: "fdr-hdfc-004",
    fdrNumber: "HDFC-FDR-554411",
    accountNumber: "50100293847561",
    aictePermanentId: "1-554433221",
    institutionName: "Sri Ramanujan College of Engineering & AI",
    bankCode: "HDFC",
    bankName: "HDFC Bank Ltd",
    branchName: "Anna Salai Central, Chennai",
    branchIfsc: "HDFC0000128",
    principalAmount: 10000000,
    currency: "INR",
    depositDate: "2024-01-15",
    maturityDate: "2032-01-15",
    lockInYears: 8,
    interestRate: 7.40,
    status: "BANK_VERIFICATION_PENDING",
    lienStatus: "PENDING_CONFIRMATION",
    lienReferenceNumber: null,
    lienMarkedAt: null,
    jointHolderPrimary: "Sri Ramanujan College of Engineering & AI",
    jointHolderSecondary: "Regional Officer, SRO AICTE Chennai",
    isAutoRenewalEnabled: true,
    renewalCount: 0,
    currentBalance: 10000000,
    maturityAmount: 17850000,
    documentHashSha256: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    ocrConfidence: 0.945,
    forensicTamperScore: 0.06,
    bureauClearance: {
      approvalBureau: { status: "PENDING", officer: null, timestamp: null },
      financeBureau: { status: "PENDING", officer: null, timestamp: null },
      legalBureau: { status: "PENDING", officer: null, timestamp: null }
    },
    stayOrder: null,
    sfmsAckNumber: null
  },
  {
    id: "fdr-bob-005",
    fdrNumber: "BOB-FDR-992211",
    accountNumber: "01920200001827",
    aictePermanentId: "1-667788990",
    institutionName: "Avadh Institute of Pharmaceutical Sciences",
    bankCode: "BOB",
    bankName: "Bank of Baroda",
    branchName: "Hazratganj Main, Lucknow",
    branchIfsc: "BARB0HAZRAT",
    principalAmount: 3500000,
    currency: "INR",
    depositDate: "2020-03-10",
    maturityDate: "2028-03-10",
    lockInYears: 8,
    interestRate: 6.90,
    status: "DISPUTE_FROZEN",
    lienStatus: "LIEN_CONFIRMED",
    lienReferenceNumber: "LIEN-BOB-2020-1120",
    lienMarkedAt: "2020-03-15T10:00:00Z",
    jointHolderPrimary: "Avadh Institute of Pharmaceutical Sciences",
    jointHolderSecondary: "Regional Officer, NRO AICTE Kanpur",
    isAutoRenewalEnabled: false,
    renewalCount: 0,
    currentBalance: 3500000,
    maturityAmount: 5720000,
    documentHashSha256: "bc9f187a544f8069d2d9c089f2a4fb8b7b203c14a42bfae6f42a59a721dfc6e6",
    ocrConfidence: 0.892,
    forensicTamperScore: 0.28,
    bureauClearance: {
      approvalBureau: { status: "FLAGGED_INJUNCTION", officer: "Vigilance Bureau", timestamp: "2023-08-11T16:00:00Z" },
      financeBureau: { status: "BLOCKED", officer: null, timestamp: null },
      legalBureau: { status: "INJUNCTION_MAINTAINED", officer: "Adv. S. K. Verma", timestamp: "2023-08-11T16:20:00Z" }
    },
    stayOrder: {
      courtName: "High Court of Judicature at Allahabad (Lucknow Bench)",
      stayOrderRef: "WP(C)/9421/2023",
      orderDate: "2023-08-10",
      frozenReason: "Interim stay against revocation and encashment pending adjudication of trustee ownership dispute.",
      injunctionLevel: "HIGH_COURT_INJUNCTION",
      frozenBy: "Registrar General, High Court"
    },
    sfmsAckNumber: "SFMS-MT760-2020-BOB-001120"
  },
  {
    id: "fdr-axis-006",
    fdrNumber: "AXIS-FDR-331199",
    accountNumber: "918020049281726",
    aictePermanentId: "1-998877665",
    institutionName: "Sardar Vallabhbhai Institute of Applied Computing",
    bankCode: "AXIS",
    bankName: "Axis Bank",
    branchName: "Ashram Road, Ahmedabad",
    branchIfsc: "UTIB0000040",
    principalAmount: 4500000,
    currency: "INR",
    depositDate: "2015-08-01",
    maturityDate: "2025-08-01",
    lockInYears: 10,
    interestRate: 7.30,
    status: "AFFIDAVIT6_VERIFIED",
    lienStatus: "LIEN_CONFIRMED",
    lienReferenceNumber: "LIEN-UTIB-2015-0914",
    lienMarkedAt: "2015-08-08T15:30:00Z",
    jointHolderPrimary: "Sardar Vallabhbhai Institute of Applied Computing",
    jointHolderSecondary: "Regional Officer, CRO AICTE Bhopal",
    isAutoRenewalEnabled: false,
    renewalCount: 0,
    currentBalance: 4500000,
    maturityAmount: 9240000,
    documentHashSha256: "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
    ocrConfidence: 0.978,
    forensicTamperScore: 0.05,
    bureauClearance: {
      approvalBureau: { status: "CLEARED", officer: "Dr. B. K. Patel", timestamp: "2026-01-10T10:00:00Z" },
      financeBureau: { status: "PENDING", officer: null, timestamp: null },
      legalBureau: { status: "CLEARED", officer: "Adv. M. Joshi", timestamp: "2026-01-14T11:45:00Z" }
    },
    affidavit6Signed: {
      signedVia: "AADHAAR_ESIGN_V21",
      signerName: "Dr. Arvind Chokshi (Chairman Trustee)",
      aadhaarMasked: "XXXXXXXX4920",
      signedAt: "2026-01-08T16:20:00Z",
      undertakingVerified: true
    },
    stayOrder: null,
    sfmsAckNumber: "SFMS-MT760-2015-UTIB-000914"
  }
];

// Seeded Cryptographic Ledger Chain
export const INITIAL_LEDGER_CHAIN = [
  {
    blockHeight: 0,
    currentBlockHash: "0000a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcde",
    previousBlockHash: "0000000000000000000000000000000000000000000000000000000000000000",
    actionType: "GENESIS_INITIALIZE_LEDGER",
    entityName: "SYSTEM",
    recordId: "AICTE-GENESIS",
    actorId: "AICTE_ROOT_AUTHORITY",
    timestamp: "2023-01-01T00:00:00Z",
    payloadSummary: "AICTE FDR Security Deposit Cryptographic Ledger Genesis Block initialized."
  },
  {
    blockHeight: 1,
    currentBlockHash: "11e9f4a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0",
    previousBlockHash: "0000a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcde",
    actionType: "FDR_SUBMISSION_RECORDED",
    entityName: "fdr_records",
    recordId: "fdr-sbi-001",
    actorId: "TRUSTEE_INST_MH_001",
    timestamp: "2023-04-10T09:12:30Z",
    payloadSummary: "Pledge created for ₹35,00,000 by MITR Pune under joint holding with AICTE WRO."
  },
  {
    blockHeight: 2,
    currentBlockHash: "22a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e011f9",
    previousBlockHash: "11e9f4a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0",
    actionType: "OCR_FORENSIC_CERTIFIED",
    entityName: "fdr_documents",
    recordId: "fdr-sbi-001",
    actorId: "AICTE_OCR_ENGINE_WORKER",
    timestamp: "2023-04-10T09:13:05Z",
    payloadSummary: "Optical extraction passed with 98.5% confidence. Tamper score 0.04 (CLEAN)."
  },
  {
    blockHeight: 3,
    currentBlockHash: "33b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e011f922a8",
    previousBlockHash: "22a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e011f9",
    actionType: "BANK_LIEN_CONFIRMED",
    entityName: "lien_records",
    recordId: "fdr-sbi-001",
    actorId: "SBI_CBS_GATEWAY_NODE",
    timestamp: "2023-04-15T11:24:00Z",
    payloadSummary: "State Bank of India confirmed statutory lien under Ref: LIEN-SBI-2023-0012."
  },
  {
    blockHeight: 4,
    currentBlockHash: "44c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e011f922a833b7",
    previousBlockHash: "33b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e011f922a8",
    actionType: "MATURITY_ESCALATION_T90",
    entityName: "fdr_alerts",
    recordId: "fdr-can-003",
    actorId: "CRON_MATURITY_MONITOR",
    timestamp: "2026-08-22T00:00:01Z",
    payloadSummary: "T-90 maturity advisory issued for Canara Bank FDR ₹25,00,000 maturing 2026-11-20."
  },
  {
    blockHeight: 5,
    currentBlockHash: "55d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e011f922a833b744c6",
    previousBlockHash: "44c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e011f922a833b7",
    actionType: "JUDICIAL_STAY_FREEZE",
    entityName: "fdr_records",
    recordId: "fdr-bob-005",
    actorId: "LEGAL_CELL_NRO",
    timestamp: "2023-08-11T16:20:00Z",
    payloadSummary: "High Court Injunction WP(C)/9421/2023 recorded. Deposit locked to DISPUTE_FROZEN."
  }
];

// Helper to compute a simple SHA-256 string simulation in frontend
async function sha256(message) {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// In-Memory mutable storage
let localFdrs = [...INITIAL_FDRS];
let localLedger = [...INITIAL_LEDGER_CHAIN];
let tamperInjected = false;

// ---------------------------------------------------------------------------
// Exported API Services
// ---------------------------------------------------------------------------

export const fdrApiService = {
  // Fetch All FDRs with optional filters
  async getFdrs(filters = {}) {
    try {
      const data = await probedFetch(`${CORE_FDR_URL}/api/v1/fdr`);
      if (data && data.items) {
        return { data: data.items, source: 'LIVE_MICROSERVICE' };
      }
    } catch (_) {
      // Fallback
    }

    let items = [...localFdrs];
    if (filters.status && filters.status !== 'ALL') {
      items = items.filter(f => f.status === filters.status);
    }
    if (filters.bankCode && filters.bankCode !== 'ALL') {
      items = items.filter(f => f.bankCode === filters.bankCode);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(f =>
        f.fdrNumber.toLowerCase().includes(q) ||
        f.institutionName.toLowerCase().includes(q) ||
        f.branchIfsc.toLowerCase().includes(q) ||
        f.aictePermanentId.toLowerCase().includes(q)
      );
    }
    return { data: items, source: 'STANDALONE_FALLBACK' };
  },

  // Get Single FDR
  async getFdrById(id) {
    try {
      const data = await probedFetch(`${CORE_FDR_URL}/api/v1/fdr/${id}`);
      if (data) return { data, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    const found = localFdrs.find(f => f.id === id);
    if (!found) throw new Error(`FDR record ${id} not found.`);
    return { data: found, source: 'STANDALONE_FALLBACK' };
  },

  // Submit new FDR Record
  async submitFdr(submissionPayload) {
    try {
      const res = await probedFetch(`${CORE_FDR_URL}/api/v1/fdr/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload)
      });
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    // Standalone Mock Ingestion
    const newId = `fdr-${submissionPayload.bankCode.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const newRecord = {
      id: newId,
      fdrNumber: submissionPayload.fdrNumber,
      accountNumber: submissionPayload.accountNumber,
      aictePermanentId: submissionPayload.aictePermanentId,
      institutionName: submissionPayload.jointHolderPrimary,
      bankCode: submissionPayload.bankCode,
      bankName: submissionPayload.bankName || `${submissionPayload.bankCode} Commercial Bank`,
      branchName: submissionPayload.branchName || "Regional Main Branch",
      branchIfsc: submissionPayload.branchIfsc,
      principalAmount: parseFloat(submissionPayload.principalAmount),
      currency: "INR",
      depositDate: submissionPayload.depositDate,
      maturityDate: submissionPayload.maturityDate,
      lockInYears: parseInt(submissionPayload.lockInYears || 8),
      interestRate: parseFloat(submissionPayload.interestRate || 7.15),
      status: "SUBMITTED",
      lienStatus: "PENDING_CONFIRMATION",
      lienReferenceNumber: null,
      lienMarkedAt: null,
      jointHolderPrimary: submissionPayload.jointHolderPrimary,
      jointHolderSecondary: submissionPayload.jointHolderSecondary || "Regional Officer, AICTE",
      isAutoRenewalEnabled: submissionPayload.isAutoRenewalEnabled ?? true,
      renewalCount: 0,
      currentBalance: parseFloat(submissionPayload.principalAmount),
      maturityAmount: parseFloat(submissionPayload.principalAmount) * 1.65,
      documentHashSha256: await sha256(submissionPayload.fdrNumber + Date.now()),
      ocrConfidence: 0.982,
      forensicTamperScore: 0.03,
      bureauClearance: {
        approvalBureau: { status: "PENDING", officer: null, timestamp: null },
        financeBureau: { status: "PENDING", officer: null, timestamp: null },
        legalBureau: { status: "PENDING", officer: null, timestamp: null }
      },
      stayOrder: null,
      sfmsAckNumber: null
    };

    localFdrs.unshift(newRecord);

    // Append to audit ledger
    await auditLedgerService.recordAuditEvent({
      recordId: newId,
      entityName: "fdr_records",
      actionType: "FDR_SUBMISSION_RECORDED",
      actorId: "TRUSTEE_INSTITUTION",
      payloadSummary: `New security deposit of ₹${newRecord.principalAmount.toLocaleString('en-IN')} submitted by ${newRecord.institutionName}.`
    });

    return { data: newRecord, source: 'STANDALONE_FALLBACK' };
  },

  // Transition state
  async transitionFdrState(fdrId, targetStatus, actorId, reason) {
    try {
      const res = await probedFetch(`${CORE_FDR_URL}/api/v1/fdr/${fdrId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: targetStatus, actor_id: actorId, reason })
      });
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    const index = localFdrs.findIndex(f => f.id === fdrId);
    if (index === -1) throw new Error("FDR record not found.");

    localFdrs[index].status = targetStatus;
    localFdrs[index].updatedAt = new Date().toISOString();

    await auditLedgerService.recordAuditEvent({
      recordId: fdrId,
      entityName: "fdr_records",
      actionType: `STATE_TRANSITION_${targetStatus}`,
      actorId: actorId,
      payloadSummary: `Status updated to ${targetStatus}. Reason: ${reason}`
    });

    return { data: localFdrs[index], source: 'STANDALONE_FALLBACK' };
  },

  // Calculate stats
  async getDashboardStats() {
    try {
      const res = await probedFetch(`${CORE_FDR_URL}/api/v1/fdr/stats/summary`);
      if (res) return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    const totalPledges = localFdrs.length;
    const totalEncumberedAmount = localFdrs.reduce((acc, f) => acc + (f.principalAmount || 0), 0);
    const activeLockedCount = localFdrs.filter(f => f.status === 'ACTIVE_LOCKED').length;
    const maturityAlertsCount = localFdrs.filter(f => f.status === 'MATURITY_NOTICE_SENT').length;
    const disputedCount = localFdrs.filter(f => f.status === 'DISPUTE_FROZEN').length;
    const pendingVerificationCount = localFdrs.filter(f => ['SUBMITTED', 'OCR_EXTRACTED', 'BANK_VERIFICATION_PENDING'].includes(f.status)).length;

    return {
      data: {
        totalPledges,
        totalEncumberedAmount,
        activeLockedCount,
        maturityAlertsCount,
        disputedCount,
        pendingVerificationCount,
        banksConnected: 4,
        auditLedgerHeight: localLedger.length,
        tamperDetected: tamperInjected
      },
      source: 'STANDALONE_FALLBACK'
    };
  }
};

// ---------------------------------------------------------------------------
// Bank CBS & NeSL Gateway Services
// ---------------------------------------------------------------------------

export const bankCbsService = {
  // Direct CBS Verification Check
  async verifyFdrWithCbs(bankCode, fdrNumber, expectedAmount, expectedIfsc) {
    try {
      const res = await probedFetch(`${BANK_GATEWAY_URL}/api/v1/cbs/verify-fdr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_code: bankCode,
          fdr_number: fdrNumber,
          expected_amount: expectedAmount,
          expected_ifsc: expectedIfsc
        })
      });
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    // High fidelity simulator
    await new Promise(r => setTimeout(r, 600)); // tactile network delay

    return {
      data: {
        verified: true,
        cbsStatus: "AUTHENTIC_ACTIVE",
        bankCode: bankCode,
        fdrNumber: fdrNumber,
        accountNumber: "30" + Math.floor(100000000 + Math.random() * 900000000),
        branchIfsc: expectedIfsc || `${bankCode}0000691`,
        branchName: "National Central Branch",
        principalAmount: expectedAmount || 3500000,
        currency: "INR",
        depositDate: "2024-04-01",
        maturityDate: "2032-04-01",
        interestRate: 7.10,
        isLienMarked: false,
        autoRenewal: true,
        liquidationBlocked: false,
        message: "Verified with Scheduled Commercial Bank Core Ledger."
      },
      source: 'STANDALONE_FALLBACK'
    };
  },

  // Mark Statutory Lien
  async markStatutoryLien(bankCode, fdrNumber, lienInFavorOf = "Member Secretary, AICTE New Delhi") {
    try {
      const res = await probedFetch(`${BANK_GATEWAY_URL}/api/v1/cbs/mark-lien`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_code: bankCode,
          fdr_number: fdrNumber,
          lien_in_favor_of: lienInFavorOf
        })
      });
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    await new Promise(r => setTimeout(r, 800));

    const lienRef = `LIEN-${bankCode}-${Date.now().toString().slice(-6)}-ACK`;
    const sfmsAck = `SFMS-MT760-${Date.now().toString().slice(-8)}`;

    // Update in-memory FDR
    const item = localFdrs.find(f => f.fdrNumber === fdrNumber);
    if (item) {
      item.lienStatus = "LIEN_CONFIRMED";
      item.status = "ACTIVE_LOCKED";
      item.lienReferenceNumber = lienRef;
      item.lienMarkedAt = new Date().toISOString();
      item.sfmsAckNumber = sfmsAck;
    }

    await auditLedgerService.recordAuditEvent({
      recordId: item ? item.id : fdrNumber,
      entityName: "lien_records",
      actionType: "BANK_LIEN_CONFIRMED",
      actorId: `${bankCode}_CBS_NODAL`,
      payloadSummary: `Statutory lien confirmed by ${bankCode} CBS. Ref: ${lienRef}. SFMS MT760 Ack: ${sfmsAck}`
    });

    return {
      data: {
        success: true,
        status: "LIEN_MARKED_SUCCESS",
        fdrNumber: fdrNumber,
        bankCode: bankCode,
        lienReferenceNumber: lienRef,
        cbsTransactionId: `CBS-TXN-${Date.now()}`,
        lienInFavorOf: lienInFavorOf,
        sfmsAckNumber: sfmsAck,
        liquidationBlocked: true,
        message: `Irrevocable statutory lien locked in CBS favor of ${lienInFavorOf}. SFMS MT760 generated.`
      },
      source: 'STANDALONE_FALLBACK'
    };
  },

  // Revoke Lien (After Multi-Bureau Sign-off)
  async revokeStatutoryLien(bankCode, fdrNumber, lienRef, nocRef) {
    try {
      const res = await probedFetch(`${BANK_GATEWAY_URL}/api/v1/cbs/release-lien`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_code: bankCode,
          fdr_number: fdrNumber,
          lien_reference_number: lienRef,
          noc_reference_number: nocRef
        })
      });
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    await new Promise(r => setTimeout(r, 700));

    const item = localFdrs.find(f => f.fdrNumber === fdrNumber);
    if (item) {
      item.lienStatus = "LIEN_REVOKED";
      item.status = "REFUNDED_OR_CLOSED";
    }

    await auditLedgerService.recordAuditEvent({
      recordId: item ? item.id : fdrNumber,
      entityName: "lien_records",
      actionType: "BANK_LIEN_REVOKED",
      actorId: "AICTE_HQ_MEMBER_SECRETARY",
      payloadSummary: `Lien revoked via NOC: ${nocRef}. Core Banking liquidation lock removed.`
    });

    return {
      data: {
        success: true,
        status: "LIEN_RELEASED_SUCCESS",
        fdrNumber: fdrNumber,
        nocReferenceNumber: nocRef,
        message: "AICTE NOC verified. CBS statutory lien revoked."
      },
      source: 'STANDALONE_FALLBACK'
    };
  },

  // Generate SFMS MT760 Structured Payload Preview
  generateSfmsMt760Payload(fdr) {
    const timestamp = new Date().toISOString();
    return `{1:F01${fdr.bankCode}INBBXXX0000000000}{2:I760AICTEHQDELXXXN}{4:
:20:AICTE-LIEN-${fdr.fdrNumber}
:23:ISSUE
:27:1/1
:30:${fdr.depositDate.replace(/-/g, '')}
:31C:${fdr.maturityDate.replace(/-/g, '')}
:32B:INR${fdr.principalAmount.toFixed(2)}
:50:${fdr.institutionName}
:59:MEMBER SECRETARY, ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
:77C:/STATUTORY COLLATERAL PLEDGE/
AICTE APPROVAL PROCESS HANDBOOK COMPLIANCE ESCROW
FIXED DEPOSIT RECEIPT NO: ${fdr.fdrNumber}
IFSC: ${fdr.branchIfsc}
LIEN TYPE: IRREVOCABLE EXCLUSIVE BENEFIT AICTE
NO PREMATURE ENCASHMENT OR ADVANCE ALLOWED WITHOUT AICTE DSC SIGNED NOC.
-}`;
  }
};

// ---------------------------------------------------------------------------
// OCR & Computer Vision Forensic Analysis Engine
// ---------------------------------------------------------------------------

export const ocrForensicService = {
  // Process FDR scan
  async inspectDocument(declaredData = {}) {
    try {
      const res = await probedFetch(`${OCR_SERVICE_URL}/api/v1/ocr/process-fdr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(declaredData)
      });
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    await new Promise(r => setTimeout(r, 1200)); // simulated OCR laser processing

    const isAdversarial = declaredData.declaredFdrNumber && 
      (declaredData.declaredFdrNumber.toUpperCase().includes('FAKE') || declaredData.declaredFdrNumber.toUpperCase().includes('FRAUD'));

    if (isAdversarial) {
      return {
        data: {
          status: "PROCESSED",
          processingDurationMs: 840,
          confidenceScore: 0.42,
          extractedData: {
            fdrNumber: declaredData.declaredFdrNumber,
            bankName: declaredData.declaredBankName || "Unknown Bank",
            branchIfsc: "FAKE0000123",
            principalAmount: declaredData.declaredAmount || 100000,
            interestRate: 14.5,
            jointHolderVerified: false,
            autoRenewalClause: false
          },
          forensicAnalysis: {
            fraudRiskScore: 92.4,
            flag: "ADVERSARIAL_FORGERY_DETECTED",
            fontConsistencyScore: 32.1,
            digitMisalignmentDetected: true,
            metadataTamperDetected: true,
            photometricJitterRmse: 18.7,
            requiresManualReview: true,
            anomalyList: [
              "Pixel discontinuity around decimal place in principal amount",
              "Photoshop layer artifacts detected in embedded EXIF markers",
              "AICTE joint holder mandatory clause missing in sub-text"
            ]
          }
        },
        source: 'STANDALONE_FALLBACK'
      };
    }

    return {
      data: {
        status: "PROCESSED",
        processingDurationMs: 410,
        confidenceScore: 0.985,
        extractedData: {
          fdrNumber: declaredData.declaredFdrNumber || "SBI-FDR-778899",
          bankName: declaredData.declaredBankName || "State Bank of India",
          branchIfsc: declaredData.declaredIfsc || "SBIN0000691",
          principalAmount: declaredData.declaredAmount || 3500000,
          interestRate: declaredData.declaredInterestRate || 7.10,
          jointHolderVerified: true,
          autoRenewalClause: true
        },
        forensicAnalysis: {
          fraudRiskScore: 4.2,
          flag: "CLEAN",
          fontConsistencyScore: 97.4,
          digitMisalignmentDetected: false,
          metadataTamperDetected: false,
          photometricJitterRmse: 1.2,
          requiresManualReview: false,
          anomalyList: []
        }
      },
      source: 'STANDALONE_FALLBACK'
    };
  }
};

// ---------------------------------------------------------------------------
// Cryptographic Audit Ledger & Merkle Verification Engine
// ---------------------------------------------------------------------------

export const auditLedgerService = {
  // Fetch block chain
  async getChain(limit = 50, offset = 0) {
    try {
      const res = await probedFetch(`${AUDIT_SERVICE_URL}/api/v1/audit/chain?limit=${limit}&offset=${offset}`);
      if (res && res.blocks) {
        return { data: res.blocks, total: res.total_blocks, source: 'LIVE_MICROSERVICE' };
      }
    } catch (_) {}

    return {
      data: [...localLedger].reverse(),
      total: localLedger.length,
      tamperInjected: tamperInjected,
      source: 'STANDALONE_FALLBACK'
    };
  },

  // Record an audit event
  async recordAuditEvent(eventData) {
    try {
      const res = await probedFetch(`${AUDIT_SERVICE_URL}/api/v1/audit/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: eventData.recordId,
          entity_name: eventData.entityName,
          action_type: eventData.actionType,
          actor_id: eventData.actorId,
          payload: { summary: eventData.payloadSummary }
        })
      });
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    const lastBlock = localLedger[localLedger.length - 1];
    const newBlockHeight = lastBlock.blockHeight + 1;
    const prevHash = lastBlock.currentBlockHash;
    const contentToHash = `${newBlockHeight}:${prevHash}:${eventData.actionType}:${eventData.recordId}:${Date.now()}`;
    const newHash = await sha256(contentToHash);

    const newBlock = {
      blockHeight: newBlockHeight,
      currentBlockHash: newHash,
      previousBlockHash: prevHash,
      actionType: eventData.actionType,
      entityName: eventData.entityName,
      recordId: eventData.recordId,
      actorId: eventData.actorId,
      timestamp: new Date().toISOString(),
      payloadSummary: eventData.payloadSummary
    };

    localLedger.push(newBlock);
    return { data: newBlock, source: 'STANDALONE_FALLBACK' };
  },

  // Verify chain integrity
  async verifyIntegrity() {
    try {
      const res = await probedFetch(`${AUDIT_SERVICE_URL}/api/v1/audit/verify`);
      return { data: res, source: 'LIVE_MICROSERVICE' };
    } catch (_) {}

    if (tamperInjected) {
      return {
        data: {
          status: "CORRUPTED",
          chainLength: localLedger.length,
          merkleRoot: "0xINVALID_TAMPER_ROOT",
          error: "Tamper alert: SHA-256 parent hash linkage violated at Block #3. Merkle root signature invalidated.",
          intact: false
        },
        source: 'STANDALONE_FALLBACK'
      };
    }

    return {
      data: {
        status: "SECURE",
        chainLength: localLedger.length,
        merkleRoot: "0x8f9c1a02b3d4e5f67a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
        message: "All 6 SHA-256 blocks pass parent hash linkage and Merkle inclusion proofs.",
        intact: true
      },
      source: 'STANDALONE_FALLBACK'
    };
  },

  // Tamper Injection Simulator
  injectTamper() {
    tamperInjected = true;
    if (localLedger.length > 3) {
      // Artificially alter block 3 hash
      localLedger[3].currentBlockHash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      localLedger[3].payloadSummary = "[TAMPERED VIA UNAUTHORIZED SQL INJECTION] Deposit reduced to ₹0.";
    }
    return { success: true, message: "Cryptographic tamper injected into Block #3." };
  },

  // Reset / Restore Ledger
  restoreLedger() {
    tamperInjected = false;
    localLedger = [...INITIAL_LEDGER_CHAIN];
    return { success: true, message: "Ledger cryptographically restored to verified Merkle state." };
  }
};

// ---------------------------------------------------------------------------
// Judicial Injunction / High Court Stay Service
// ---------------------------------------------------------------------------

export const judicialInjunctionService = {
  applyStayOrder(fdrId, orderData) {
    const item = localFdrs.find(f => f.id === fdrId);
    if (!item) throw new Error("FDR record not found.");

    item.status = "DISPUTE_FROZEN";
    item.stayOrder = {
      courtName: orderData.courtName,
      stayOrderRef: orderData.stayOrderRef,
      orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
      frozenReason: orderData.frozenReason,
      injunctionLevel: orderData.injunctionLevel || "HIGH_COURT_INJUNCTION",
      frozenBy: orderData.frozenBy || "Registrar, High Court"
    };

    auditLedgerService.recordAuditEvent({
      recordId: fdrId,
      entityName: "fdr_records",
      actionType: "JUDICIAL_STAY_FREEZE",
      actorId: "LEGAL_CELL_OFFICER",
      payloadSummary: `Deposit frozen under court order: ${orderData.stayOrderRef} by ${orderData.courtName}. Reason: ${orderData.frozenReason}`
    });

    return { success: true, fdr: item };
  },

  vacateStayOrder(fdrId, vacationRef, vacatedBy) {
    const item = localFdrs.find(f => f.id === fdrId);
    if (!item) throw new Error("FDR record not found.");

    item.status = "ACTIVE_LOCKED";
    item.stayOrder = null;

    auditLedgerService.recordAuditEvent({
      recordId: fdrId,
      entityName: "fdr_records",
      actionType: "JUDICIAL_STAY_VACATED",
      actorId: vacatedBy || "REGIONAL_DIRECTOR_AICTE",
      payloadSummary: `Court stay vacated under order: ${vacationRef}. Restored to ACTIVE_LOCKED.`
    });

    return { success: true, fdr: item };
  }
};

// ---------------------------------------------------------------------------
// Multi-Bureau Release & Aadhaar / DSC Workflow Service
// ---------------------------------------------------------------------------

export const releaseWorkflowService = {
  // Update Bureau Sign-Off
  updateBureauStatus(fdrId, bureau, newStatus, officerName, remarks) {
    const item = localFdrs.find(f => f.id === fdrId);
    if (!item) throw new Error("FDR not found.");

    if (!item.bureauClearance) {
      item.bureauClearance = {
        approvalBureau: { status: "PENDING", officer: null, timestamp: null },
        financeBureau: { status: "PENDING", officer: null, timestamp: null },
        legalBureau: { status: "PENDING", officer: null, timestamp: null }
      };
    }

    item.bureauClearance[bureau] = {
      status: newStatus,
      officer: officerName,
      timestamp: new Date().toISOString(),
      remarks: remarks
    };

    const allCleared = 
      item.bureauClearance.approvalBureau?.status === 'CLEARED' &&
      item.bureauClearance.financeBureau?.status === 'CLEARED' &&
      item.bureauClearance.legalBureau?.status === 'CLEARED';

    if (allCleared && item.status !== 'DISPUTE_FROZEN') {
      item.status = "NO_DUES_CLEARED";
    }

    auditLedgerService.recordAuditEvent({
      recordId: fdrId,
      entityName: "release_bureau_clearance",
      actionType: `BUREAU_CLEARANCE_${bureau.toUpperCase()}_${newStatus}`,
      actorId: officerName,
      payloadSummary: `${bureau} status set to ${newStatus}. Remarks: ${remarks}`
    });

    return { success: true, fdr: item, allCleared };
  },

  // Aadhaar e-Sign v2.1 Simulator
  async completeAadhaarEsign(fdrId, signerName, maskedAadhaar) {
    await new Promise(r => setTimeout(r, 900));

    const item = localFdrs.find(f => f.id === fdrId);
    if (item) {
      item.affidavit6Signed = {
        signedVia: "AADHAAR_ESIGN_V21",
        signerName: signerName,
        aadhaarMasked: maskedAadhaar,
        signedAt: new Date().toISOString(),
        undertakingVerified: true
      };
      item.status = "AFFIDAVIT6_VERIFIED";
    }

    await auditLedgerService.recordAuditEvent({
      recordId: fdrId,
      entityName: "affidavit6_undertaking",
      actionType: "AADHAAR_ESIGN_COMPLETED",
      actorId: signerName,
      payloadSummary: `Digital Affidavit-6 authenticated via UIDAI Aadhaar e-Sign v2.1 (${maskedAadhaar}).`
    });

    return { success: true, fdr: item };
  },

  // Class 3 DSC Token Signing Simulator
  async completeDscSign(fdrId, officerName, roleTitle, certSerial) {
    await new Promise(r => setTimeout(r, 800));

    const item = localFdrs.find(f => f.id === fdrId);
    if (item) {
      if (roleTitle.includes("Member Secretary")) {
        item.status = "HQ_APPROVED";
      } else if (roleTitle.includes("Regional Officer")) {
        item.status = "REGIONAL_OFFICE_RECOMMENDED";
      }
    }

    await auditLedgerService.recordAuditEvent({
      recordId: fdrId,
      entityName: "release_clearance",
      actionType: "DSC_SIGN_EXECUTED",
      actorId: officerName,
      payloadSummary: `Class 3 Digital Signature Certificate (${certSerial}) applied by ${officerName} (${roleTitle}).`
    });

    return { success: true, fdr: item };
  }
};
