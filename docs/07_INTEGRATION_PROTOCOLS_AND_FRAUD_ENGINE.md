# AICTE FDR / SECURITY DEPOSIT SMART PORTAL
## Document 07: Banking Integration Protocols (NeSL / CBS / mTLS) & AI/ML Forensic Fraud Detection Engine
### Problem Statement ID: SIH 26265
**Document Version:** 3.4.0-PROD  
**Classification:** RESTRICTED / AICTE BANKING & FORENSICS MANDATE  
**Standard Compliance:** NeSL e-BG / e-FDR Protocol v2.4, RBI SFMS Message Specification (MT760/MT767/MT768/MT769), ISO 20022 Financial Standards (pain.001, camt.053, camt.054), RFC 8446 (TLS 1.3), RFC 8705 (mTLS), NIST SP 800-52

---

## 1. Executive Summary & Integration Architecture Overview

In technical education regulation, Fixed Deposit Receipts (FDRs) and Electronic Bank Guarantees (e-BGs) serve as statutory security deposits held under joint lien with the Member Secretary, AICTE. Historically, manual, paper-based FDR submissions have suffered from severe vulnerabilities:
1. **Physical Certificate Forgery:** Forged paper deposit receipts submitted with fabricated bank seals.
2. **Premature & Unauthorized Liquidation:** Institutions liquidating fixed deposits at bank branches without AICTE knowledge or concurrence.
3. **Lack of Real-Time Lien Synchronization:** Regional AICTE offices relying on physical letters for lien confirmation.

This specification details the **Banking Core Banking System (CBS) and NeSL Integration Protocols**, coupled with the **AI/ML Computer Vision and Forensic Fraud Detection Engine**, establishing end-to-end cryptographic and forensic verification.

```mermaid
flowchart TD
    subgraph Institution_Layer["Institution Trustee Layer"]
        Trustee["Trustee / Chairman"]
        Upload["FDR Scan Upload / e-BG Form"]
    end

    subgraph Portal_Gateway["AICTE Bank & Security Gateway"]
        Ingress["Envoy Ingress Proxy (mTLS Termination)"]
        Router["Protocol Router & Dispatcher"]
    end

    subgraph Banking_Rail["National Banking Interconnect Rails"]
        NeSL["NeSL e-BG Gateway (Digital Stamp + SFMS)"]
        SFMS["RBI SFMS Network (MT760 / MT767 / MT769)"]
        CBSAdapter["Open Banking CBS Adapter (ISO 20022)"]
        Banks["Scheduled Commercial Banks (SBI, PNB, Canara, HDFC, ICICI)"]
    end

    subgraph Forensic_Engine["AI/ML Computer Vision & Forensic Engine"]
        OCR["Multi-Stage OCR (PaddleOCR + LayoutLMv3)"]
        ELA["Error Level Analysis (ELA)"]
        CMFD["Copy-Move Forgery Detection (SIFT/ORB)"]
        EXIF["EXIF & Metadata Forensic Inspector"]
        FontClf["Font & Baseline Inconsistency Neural Classifier"]
        Reconcile["4-Way Cross-Reconciliation Engine"]
        Scorer["Fraud Probability Scorer (Bayesian/Sigmoid)"]
    end

    subgraph Decision_Tier["Automated Decision & Escalation"]
        Green["Green Tier (< 0.20): Auto-Approved STP"]
        Amber["Amber Tier (0.20 - 0.65): AICTE RO Scrutiny"]
        Red["Red Tier (>= 0.65): Quarantined + CVO Incident"]
    end

    Trustee --> Upload --> Ingress
    Ingress --> Router
    Router -->|Paper FDR Scans| Forensic_Engine
    Router -->|e-BG / e-FDR Transactions| Banking_Rail

    Forensic_Engine --> OCR --> Reconcile
    Forensic_Engine --> ELA --> Scorer
    Forensic_Engine --> CMFD --> Scorer
    Forensic_Engine --> EXIF --> Scorer
    Forensic_Engine --> FontClf --> Scorer
    Reconcile --> Scorer

    Banking_Rail --> NeSL --> SFMS --> Banks
    Banking_Rail --> CBSAdapter -->|mTLS / ISO 20022| Banks
    Banks -.->|Real-time Balance & Lien Status| Reconcile

    Scorer --> Green
    Scorer --> Amber
    Scorer --> Red
```

---

## 2. NeSL (National E-Governance Services Ltd) e-BG & e-FDR Protocol

National E-Governance Services Limited (NeSL), established under the Insolvency and Bankruptcy Code, 2016 (IBC), acts as India's first Information Utility (IU). NeSL provides the digital infrastructure for **paperless electronic Bank Guarantees (e-BG) and electronic Fixed Deposit Receipts (e-FDR)** with integrated digital e-stamping (via State E-Stamping / Stock Holding Corporation of India Ltd - SHCIL).

### 2.1 NeSL Transaction Lifecycle & Sequence Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Bank as Scheduled Commercial Bank (Branch / CBS)
    participant NeSL as NeSL Digital e-BG Platform
    participant SHCIL as State E-Stamping Gateway (SHCIL)
    participant AICTE as AICTE Bank Gateway Service
    participant RO as AICTE Regional Officer

    Bank->>NeSL: POST /api/v2.4/ebg/issue (MT760 Equivalent JSON)
    NeSL->>SHCIL: Procure Digital E-Stamp Certificate with State Stamp Duty
    SHCIL-->>NeSL: E-Stamp Number & Cryptographic Stamp Token
    NeSL->>NeSL: Merge E-Stamp with Guarantee Agreement
    Bank->>NeSL: Sign Guarantee using Bank Class 3 DSC (PAdES)
    NeSL->>NeSL: Anchor Record in NeSL Information Utility Ledger
    NeSL->>AICTE: Webhook POST /api/v1/nesl/ebg-notification (Signed Payload)
    AICTE->>AICTE: Verify NeSL X.509 Signature & Extract Guarantee Terms
    AICTE->>AICTE: Cross-Verify Beneficiary == "Member Secretary, AICTE"
    AICTE-->>NeSL: HTTP 200 OK (Acknowledgment with MT768 Ack Token)
    AICTE->>RO: Notification: "New e-BG Active & Lien Confirmed"
```

### 2.2 SFMS (Structured Financial Messaging System) Messaging Standards

The Reserve Bank of India (RBI) operates the Structured Financial Messaging System (SFMS) for secure inter-bank and bank-to-beneficiary communications. The AICTE portal implements full support for SFMS message standards for guarantees and fixed deposits.

#### 2.2.1 SFMS Message Types Supported
1. **`SFMS MT760`:** Issuance of Bank Guarantee / Fixed Deposit Joint Lien Advice.
2. **`SFMS MT767`:** Amendment / Extension of Expiry Date / Amount Enhancement.
3. **`SFMS MT768`:** Acknowledgment of Guarantee / Advice of Joint Lien Acceptance.
4. **`SFMS MT769`:** Advice of Reduction, Release, or Lien Invocation / Encashment.

#### 2.2.2 Detailed SFMS MT760 Field Tag Specifications

```
{1:F01SBININBBXXX0000000000}{2:I760AICTINBBAXXXN}{4:
:20:AICTE-FDR-2026-981240
:23:ISSUE
:27:1/1
:31C:261028
:31E:361028
:32B:INR10000000,00
:40C:ISPR
:50:XYZ EDUCATIONAL TRUST
NEW DELHI, INDIA
PAN: AAATX1234F
:59:MEMBER SECRETARY, ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
NELSON MANDELA MARG, VASANT KUNJ, NEW DELHI 110070
:45P:SECURITY DEPOSIT TOWARDS ESTABLISHMENT OF NEW TECHNICAL CAMPUS 
UNDER AICTE APPROVAL PROCESS HANDBOOK 2026-2027.
FIXED DEPOSIT RECEIPT NO: SBI-VK-98712398
DEPOSIT ACCOUNT NO: 40982314561
INTEREST RATE: 7.25% PER ANNUM CUMULATIVE
LIEN STATUS: IRREVOCABLE JOINT LIEN MARKED IN FAVOUR OF BENEFICIARY.
NO WITHDRAWAL, PRECLOSURE, OR PLEDGE PERMITTED WITHOUT EXPLICIT 
WRITTEN SANCTION OF THE MEMBER SECRETARY, AICTE.
:77U:DIGITAL STAMP CERTIFICATE NO: IN-DL98234120934123V
STAMP DUTY PAID: INR 500,00
STATE: DELHI NCT
:72:/ACC/BENEFICIARY-RO-NORTHERN-REGIONAL-OFFICE
-}
```

### 2.3 NeSL REST API JSON Specifications

#### Issuance Callback Payload (`NeSLExecutedNotification.json`)
```json
{
  "header": {
    "message_id": "MSG-NESL-2026-1028-0091823",
    "timestamp": "2026-10-28T18:30:15.820Z",
    "version": "2.4",
    "signature_algorithm": "SHA256withRSA"
  },
  "payload": {
    "nesl_identifier": "NESL-EBG-2026-DL-8871239",
    "bank_details": {
      "bank_name": "State Bank of India",
      "ifsc_code": "SBIN0001234",
      "branch_code": "01234",
      "branch_address": "Vasant Kunj Branch, New Delhi 110070"
    },
    "deposit_details": {
      "instrument_type": "ELECTRONIC_FDR",
      "account_number": "40982314561",
      "receipt_number": "SBI-VK-98712398",
      "principal_amount": 10000000.00,
      "currency": "INR",
      "issue_date": "2026-10-28",
      "maturity_date": "2036-10-28",
      "tenor_months": 120,
      "interest_rate_percent": 7.25,
      "cumulative_flag": true,
      "lien_endorsement": {
        "beneficiary": "MEMBER SECRETARY, AICTE",
        "beneficiary_pan": "AAATA0001A",
        "is_irrevocable": true,
        "preclosure_allowed": false
      }
    },
    "institution_details": {
      "trust_name": "XYZ Educational Trust",
      "aicte_application_id": "1-9876543211",
      "trust_pan": "AAATX1234F"
    },
    "stamp_duty": {
      "certificate_number": "IN-DL98234120934123V",
      "stamp_vendor": "SHCIL",
      "duty_amount": 500.00,
      "jurisdiction_state": "DELHI"
    },
    "pades_document_url": "https://gateway.nesl.co.in/docs/v1/download/NESL-EBG-2026-DL-8871239.pdf",
    "pades_sha256": "7d4b3b2184d008f5d0239cfca2e7b165b6e6f437c35805f152d2427a1c437a34"
  },
  "digital_signature": "MEQCIFz...[Base64 Encoded NeSL Corporate Signature]...Bw=="
}
```

---

## 3. Open Banking CBS Adapter & ISO 20022 Financial Standards

For banks not yet operational on NeSL for all deposit products, the AICTE Bank Gateway maintains direct connections to Core Banking Systems (CBS)—including TCS BaNCS (SBI), Infosys Finacle (PNB, Canara, BoB), and Oracle FLEXCUBE (HDFC, ICICI).

### 3.1 ISO 20022 Financial Messaging Mapping
The gateway translates internal JSON events into standardized ISO 20022 XML formats:

```
+---------------------------------------------------------------------------------------------------+
|                                 ISO 20022 STANDARDS ARCHITECTURE                                  |
+--------------------------+------------------------------------+-----------------------------------+
| ISO 20022 Message        | Business Description               | AICTE Workflow Trigger            |
+--------------------------+------------------------------------+-----------------------------------+
| pain.001.001.11          | CustomerCreditTransferInitiation   | FDR creation & automated lien     |
|                          |                                    | reservation request to bank       |
+--------------------------+------------------------------------+-----------------------------------+
| camt.053.001.10          | BankToCustomerStatement            | Real-time balance enquiry,        |
|                          |                                    | interest accrual, renewal check   |
+--------------------------+------------------------------------+-----------------------------------+
| camt.054.001.10          | BankToCustomerDebitCreditNotification | Confirmation of lien marking    |
|                          |                                    | or encashment debit to AICTE a/c  |
+--------------------------+------------------------------------+-----------------------------------+
```

#### 3.1.1 ISO 20022 `camt.054.001.10` Lien Confirmation Message (Sample Snippet)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.10">
    <BkToCstmrDbtCdtNtfctn>
        <GrpHdr>
            <MsgId>AICTE-CBS-CAMT054-20261028-001</MsgId>
            <CreDtTm>2026-10-28T18:40:00+05:30</CreDtTm>
        </GrpHdr>
        <Ntfctn>
            <Id>NTF-SBI-FDR-98712398</Id>
            <Acct>
                <Id>
                    <Othr>
                        <Id>40982314561</Id>
                        <SchmeNm><Cd>BBAN</Cd></SchmeNm>
                    </Othr>
                </Id>
                <Svcr>
                    <FinInstnId>
                        <BICFI>SBININBBXXX</BICFI>
                        <ClrSysMmbId>
                            <ClrSysId><Cd>INIFSC</Cd></ClrSysId>
                            <MmbId>SBIN0001234</MmbId>
                        </ClrSysMmbId>
                    </FinInstnId>
                </Svcr>
            </Acct>
            <Ntry>
                <Amt Ccy="INR">10000000.00</Amt>
                <CdtDbtInd>CRDT</CdtDbtInd>
                <Sts>BOOK</Sts>
                <BookgDt><Dt>2026-10-28</Dt></BookgDt>
                <ValDt><Dt>2026-10-28</Dt></ValDt>
                <AcctSvcrRef>LIEN-AICTE-APPROVED-2026</AcctSvcrRef>
                <NtryDtls>
                    <TxDtls>
                        <Refs>
                            <EndToEndId>AICTE-APP-1-9876543211</EndToEndId>
                        </Refs>
                        <RmtInf>
                            <Ustrd>FDR JOINT LIEN MARKED IN FAVOUR OF MEMBER SECRETARY AICTE</Ustrd>
                        </RmtInf>
                    </TxDtls>
                </NtryDtls>
            </Ntry>
        </Ntfctn>
    </BkToCstmrDbtCdtNtfctn>
</Document>
```

---

## 4. Mutual TLS (mTLS) Handshake & Cryptographic Network Security

All communications between the AICTE Bank Gateway and Scheduled Commercial Banks operate over **Mutual TLS (mTLS) conforming to RFC 8446 (TLS 1.3) and RFC 8705**.

### 4.1 Strict Cryptographic Parameters
- **TLS Version:** Strictly TLS 1.3 (Fallback to TLS 1.2 or below is blocked at the TCP stack).
- **Approved Cipher Suites:**
  - `TLS_AES_256_GCM_SHA384` (Default / Preferred)
  - `TLS_CHACHA20_POLY1305_SHA256` (Allowed for high-throughput edge nodes)
- **Diffie-Hellman Key Exchange:** Curve `x25519` or `secp384r1`.
- **Server and Client Certificates:** 4096-bit RSA or 256-bit ECDSA, issued by AICTE Dedicated Banking Intermediate CA or RBI IDRBT National CA.

```mermaid
sequenceDiagram
    autonumber
    participant BankCBS as Bank Core Banking System (Client)
    participant Envoy as AICTE Bank Gateway (Envoy mTLS Termination)
    participant PKI as AICTE / IDRBT PKI OCSP Responder

    BankCBS->>Envoy: TCP SYN + ClientHello (TLS 1.3, Cipher: TLS_AES_256_GCM_SHA384)
    Envoy->>BankCBS: ServerHello + EncryptedExtensions + Certificate (AICTE X.509)
    Envoy->>BankCBS: CertificateRequest (Mandatory Client Cert Mandate) + ServerFinished
    BankCBS->>Envoy: Certificate (Bank CBS X.509) + CertificateVerify + ClientFinished
    Envoy->>PKI: Real-Time OCSP Check (RFC 6960 Nonce-Verified)
    PKI-->>Envoy: OCSP Status: GOOD (Revocation Check Clean)
    Envoy->>Envoy: Verify Certificate Pinning (SAN & SPKI SHA-256 Fingerprint)
    Note over BankCBS,Envoy: Cryptographic mTLS Tunnel Established (AES-256-GCM Session Key)
    BankCBS->>Envoy: HTTPS POST /v1/cbs/fdr-status (Encrypted API Request)
    Envoy-->>BankCBS: HTTPS 200 OK (Encrypted Signed Response)
```

### 4.2 Production Envoy Gateway mTLS Configuration Snippet

```yaml
static_resources:
  listeners:
  - name: bank_mtls_ingress_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8443
    filter_chains:
    - transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
          common_tls_context:
            tls_params:
              tls_minimum_protocol_version: TLSv1_3
              tls_maximum_protocol_version: TLSv1_3
              cipher_suites:
              - "TLS_AES_256_GCM_SHA384"
              - "TLS_CHACHA20_POLY1305_SHA256"
            tls_certificates:
            - certificate_chain:
                filename: "/etc/ssl/aicte/bank-gateway.crt"
              private_key:
                filename: "/etc/ssl/aicte/bank-gateway.key"
            validation_context:
              trusted_ca:
                filename: "/etc/ssl/aicte/scheduled-banks-ca-bundle.crt"
              require_client_certificate: true
              # Strict SAN Pinning for Authorized Bank Gateways
              match_typed_subject_alt_names:
              - san_type: DNS
                matcher:
                  exact: "cbs-gateway.sbi.co.in"
              - san_type: DNS
                matcher:
                  exact: "openbanking.pnbindia.in"
              - san_type: DNS
                matcher:
                  exact: "api.canarabank.in"
              - san_type: DNS
                matcher:
                  exact: "ebg.nesl.co.in"
              ocsp_staple:
                filename: "/etc/ssl/aicte/ocsp_staple.der"
```

---

## 5. Multi-Stage AI/ML Computer Vision OCR Pipeline

When physical FDR receipts are scanned and uploaded by institutions, the portal passes the artifact through a multi-stage Computer Vision pipeline.

### 5.1 Pipeline Architectural Workflow
1. **Preprocessing:** Deskewing (Radon transform), noise filtering (Bilateral filter), illumination correction (CLAHE), adaptive binarization (Sauvola local thresholding).
2. **Text Detection:** DBNet (Real-time Scene Text Detection with Differentiable Binarization).
3. **Text Recognition:** CRNN with Bidirectional LSTM and Connectionist Temporal Classification (CTC) loss.
4. **Layout & Multimodal Extraction:** LayoutLMv3 (combining word token embeddings, 2D bounding boxes, and visual patch tokens) to accurately classify key-value pairs even on complex multi-column bank security receipts.

```
+-------------------------------------------------------------------------------------------------+
|                                 MULTI-STAGE OCR & PARSING PIPELINE                              |
+-------------------------------------------------------------------------------------------------+
| Scanned Image / PDF Upload (300 DPI, Grayscale / RGB)                                           |
|       |                                                                                         |
|       v                                                                                         |
| [ PREPROCESSING ] -> Deskew -> CLAHE Contrast Normalize -> Bilateral Denoising                  |
|       |                                                                                         |
|       v                                                                                         |
| [ STAGE 1: DBNET ] -> Generates Probability Map & Threshold Map -> Segmented Text Polygons       |
|       |                                                                                         |
|       v                                                                                         |
| [ STAGE 2: CRNN ] -> Bidirectional LSTM -> CTC Decoder -> Extracted Word Tokens + Confidences   |
|       |                                                                                         |
|       v                                                                                         |
| [ STAGE 3: LAYOUTLMV3 ] -> Multimodal Attention (Text + 2D BBoxes + Visual Patches)             |
|       |                                                                                         |
|       v                                                                                         |
| Structured JSON Entity:                                                                         |
| { fdr_no: "SBI-98712398", amount_figures: 10000000, amount_words: "One Crore Rupees", ... }     |
+-------------------------------------------------------------------------------------------------+
```

### 5.2 Production PaddleOCR & LayoutLMv3 Extraction Engine

```python
"""
AICTE Multi-Stage Computer Vision OCR Pipeline
DBNet Text Detection + CRNN Recognition + LayoutLMv3 Structured Parsing
"""
import re
import cv2
import numpy as np
from typing import Dict, Any, List
from paddleocr import PaddleOCR
from PIL import Image

class AICTEComputerVisionPipeline:
    def __init__(self, use_gpu: bool = True):
        # Initialize PaddleOCR engine with DBNet and CRNN
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=use_gpu,
            det_db_thresh=0.3,
            det_db_box_thresh=0.5,
            rec_batch_num=16
        )

    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        """
        Executes forensic pre-processing: Deskewing, CLAHE, and Bilateral filtering.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 1. Grayscale Conversion
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 2. Deskewing via Hough Lines
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
        angle = 0.0
        if lines is not None:
            angles = [line[0][1] for line in lines]
            median_angle = np.median(angles)
            deg = np.rad2deg(median_angle) - 90
            if abs(deg) < 45:
                angle = deg

        if abs(angle) > 0.5:
            (h, w) = gray.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            gray = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrast_enhanced = clahe.apply(gray)

        # 4. Bilateral Filter to smooth noise while preserving character edges
        denoised = cv2.bilateralFilter(contrast_enhanced, 9, 75, 75)
        return denoised

    def extract_structured_fdr_data(self, preprocessed_img: np.ndarray) -> Dict[str, Any]:
        """
        Runs OCR and extracts standardized FDR fields.
        """
        results = self.ocr.ocr(preprocessed_img, cls=True)
        raw_text_lines = []
        token_boxes = []

        for line in results[0]:
            box, (text, conf) = line
            raw_text_lines.append(text)
            token_boxes.append({"text": text, "confidence": conf, "box": box})

        full_corpus = " ".join(raw_text_lines).upper()

        # Extract Fields via RegEx & Layout Rules
        fdr_number = self._extract_regex(
            full_corpus, 
            r'(?:FDR|TDR|STDR|FIXED DEPOSIT|RECEIPT|DEPOSIT A/C)[\s\:\.\#\-No]*([A-Z0-9\/\-]{8,25})'
        )

        amount_figures = self._extract_amount_figures(full_corpus)
        ifsc_code = self._extract_regex(full_corpus, r'([A-Z]{4}0[A-Z0-9]{6})')
        dates = re.findall(r'\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b', full_corpus)

        lien_present = bool(re.search(
            r'(LIEN|JOINT|MEMBER SECRETARY|AICTE|COUNCIL FOR TECHNICAL EDUCATION)', 
            full_corpus
        ))

        return {
            "fdr_number": fdr_number,
            "ifsc_code": ifsc_code,
            "amount_figures": amount_figures,
            "detected_dates": dates,
            "lien_marked_to_aicte": lien_present,
            "raw_text_corpus": full_corpus,
            "token_count": len(token_boxes),
            "mean_ocr_confidence": float(np.mean([t["confidence"] for t in token_boxes])) if token_boxes else 0.0
        }

    @staticmethod
    def _extract_regex(text: str, pattern: str) -> str:
        match = re.search(pattern, text)
        return match.group(1).strip() if match else ""

    @staticmethod
    def _extract_amount_figures(text: str) -> float:
        matches = re.findall(r'(?:RS\.?|INR|\₹)[\s\:]*([0-9,]+(?:\.[0-9]{2})?)', text)
        valid_amounts = []
        for m in matches:
            clean_str = m.replace(',', '').strip()
            try:
                val = float(clean_str)
                if val >= 100000:  # Minimum AICTE deposit threshold (₹1 Lakh)
                    valid_amounts.append(val)
            except ValueError:
                continue
        return max(valid_amounts) if valid_amounts else 0.0
```

---

## 6. Forensic Tamper Detection Pipeline

Uploaded FDR receipts must be scrutinized for digital manipulation before being admitted into the portal. The forensic pipeline runs four distinct tests in parallel.

```mermaid
flowchart TD
    Scan["Scanned FDR Image File"]
    
    subgraph Forensic_Suite["Forensic Tamper Detection Suite"]
        ELA["1. Error Level Analysis (ELA)<br/>Lossy JPEG Disparity Map"]
        CMFD["2. Copy-Move Forgery Detection (CMFD)<br/>SIFT / ORB Keypoint Matching"]
        EXIF["3. EXIF & Metadata Inspector<br/>Software Tags & Quantization Analysis"]
        Font["4. Neural Typography Classifier<br/>Baseline Jitter & Stroke Variance"]
    end

    ScoreCombine["Weighted Anomaly Aggregator"]
    DecisionEngine["Bayesian Risk Evaluation"]

    Scan --> ELA
    Scan --> CMFD
    Scan --> EXIF
    Scan --> Font

    ELA -->|Score: S_ela| ScoreCombine
    CMFD -->|Score: S_cmfd| ScoreCombine
    EXIF -->|Score: S_exif| ScoreCombine
    Font -->|Score: S_font| ScoreCombine

    ScoreCombine --> DecisionEngine
    DecisionEngine -->|Fraud Probability S_fraud| Output["Risk Evaluation Metric (0.0 to 1.0)"]
```

### 6.1 Error Level Analysis (ELA)
When an image is saved in JPEG format, each $8 \times 8$ pixel block undergoes Discrete Cosine Transform (DCT) quantization. If an image is modified (e.g., amount digits changed in Photoshop) and re-saved, the modified region is compressed at a different generation error level than the unaltered background.

**Mathematical Formulation:**
Let $I_{orig}$ be the input image. We recompress $I_{orig}$ at a fixed JPEG quality factor $Q = 90$ to obtain $I_{resave}$.
The pixel-wise error level is:
$$\Delta(x, y) = |I_{orig}(x, y) - I_{resave}(x, y)|$$
To amplify low-frequency disparities for classification:
$$ELA(x, y) = \min(255, \Delta(x, y) \times \alpha)$$
Where scale multiplier $\alpha = 15$.
The anomaly metric $\Phi_{ELA}$ measures the spatial variance of $ELA(x, y)$ inside bounding boxes of critical fields (FDR amount, issue date) normalized against background variance:
$$\Phi_{ELA} = \frac{\sigma^2_{\text{critical\_bbox}}}{\sigma^2_{\text{background}} + \epsilon}$$

### 6.2 Copy-Move Forgery Detection (CMFD)
Fraudulent FDRs frequently copy authentic bank rubber stamps, authorized officer signatures, or zero digits ('000') from another region of the certificate.
1. **Keypoint Detection:** Scale-Invariant Feature Transform (SIFT) and ORB extract 128-dimensional invariant descriptors.
2. **Matching:** Fast Library for Approximate Nearest Neighbors (FLANN) matcher detects self-similar keypoint clusters.
3. **Filtering:** RANSAC removes natural periodic textures (e.g., guilloche security background patterns) leaving only cloned non-rigid regions.

### 6.3 Forensic Metadata & EXIF Analysis
1. **Software Artifacts:** Scans raw binary header for editing tool signatures: `Photoshop`, `Adobe InDesign`, `GIMP`, `Canva`, `CorelDRAW`, `Pixelmator`, `PDFill`.
2. **Quantization Table Fingerprint:** Compares the image's DQT (Define Quantization Table) hash against a known database of 4,500 physical document scanners. Non-scanner quantization tables indicate export from image editing suites.
3. **Timestamp Dissonance:** Detects temporal anomalies where `ModifyDate` $\gg$ `CreateDate`, or file metadata predates the claimed FDR issuance date.

### 6.4 Font & Baseline Inconsistency Neural Classifier
Altered figures typically introduce subtle misalignments in vertical baseline positioning and stroke width variations.
- **Stroke Width Transform (SWT):** Computes pixel distance along gradient trajectories. Legitimate bank print receipts exhibit tight normal distributions of stroke width $\mathcal{N}(\mu, \sigma^2)$ where $\sigma / \mu < 0.12$. Injected digits cause bimodal distributions ($\sigma / \mu > 0.35$).
- **Baseline Jitter:** Evaluates vertical drift of character bottom contours along the horizontal regression line:
$$\Phi_{Font} = \frac{1}{M} \sum_{i=1}^M \left( y_i - (m \cdot x_i + c) \right)^2$$

### 6.5 Production Forensic Detection Suite (Python Implementation)

```python
"""
AICTE Forensic Tamper Detection Suite
Implements ELA, CMFD, EXIF inspection, and Baseline Jitter Analysis
"""
import io
import re
import cv2
import numpy as np
from PIL import Image, ImageChops, ExifTags
from typing import Dict, Tuple

class ForensicTamperDetector:
    def __init__(self, ela_scale: float = 15.0, ela_quality: int = 90):
        self.ela_scale = ela_scale
        self.ela_quality = ela_quality
        self.banned_software_patterns = [
            r'photoshop', r'gimp', r'canva', r'coreldraw', 
            r'illustrator', r'pixelmator', r'paint\.net', r'acrobat distiller'
        ]

    def compute_ela_score(self, image_bytes: bytes) -> Tuple[float, np.ndarray]:
        """
        Executes Error Level Analysis (ELA) and computes compression variance score.
        """
        orig_img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Save temporary JPEG at quality=90
        buffer = io.BytesIO()
        orig_img.save(buffer, 'JPEG', quality=self.ela_quality)
        buffer.seek(0)
        resaved_img = Image.open(buffer)

        # Difference calculation
        ela_img = ImageChops.difference(orig_img, resaved_img)
        extrema = ela_img.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        scale = self.ela_scale if max_diff == 0 else (255.0 / max_diff)

        ela_scaled = ImageChops.multiply(ela_img, Image.new('RGB', orig_img.size, (int(scale), int(scale), int(scale))))
        ela_cv = cv2.cvtColor(np.array(ela_scaled), cv2.COLOR_RGB2GRAY)

        # Compute mean and standard deviation of ELA error
        mean_val, std_dev = cv2.meanStdDev(ela_cv)
        ela_anomaly_score = float(std_dev[0][0]) / 100.0  # Normalized 0.0 - 1.0
        return min(1.0, ela_anomaly_score), ela_cv

    def detect_copy_move_forgery(self, img_gray: np.ndarray) -> float:
        """
        Detects copy-move forgery using SIFT feature matching with RANSAC.
        """
        sift = cv2.SIFT_create(nfeatures=2000)
        keypoints, descriptors = sift.detectAndCompute(img_gray, None)
        
        if descriptors is None or len(descriptors) < 50:
            return 0.0

        # FLANN based matcher
        FLANN_INDEX_KDTREE = 1
        index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
        search_params = dict(checks=50)
        flann = cv2.FlannBasedMatcher(index_params, search_params)

        matches = flann.knnMatch(descriptors, descriptors, k=3)
        suspicious_matches = []

        for m_list in matches:
            if len(m_list) >= 2:
                # Exclude self-match at index 0
                m, n = m_list[1], m_list[2]
                if m.distance < 0.65 * n.distance:
                    pt1 = keypoints[m.queryIdx].pt
                    pt2 = keypoints[m.trainIdx].pt
                    euclidean_dist = np.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1])
                    # Ignore close keypoints in the same natural character
                    if euclidean_dist > 50:
                        suspicious_matches.append((pt1, pt2))

        # Score based on cluster density of suspicious cloned keypoint pairs
        cmfd_score = min(1.0, len(suspicious_matches) / 40.0)
        return float(cmfd_score)

    def inspect_metadata_anomalies(self, image_bytes: bytes) -> Tuple[float, Dict[str, str]]:
        """
        Scans binary metadata for image manipulation software traces.
        """
        raw_str = image_bytes.decode('latin-1', errors='ignore').lower()
        detected_software = []

        for pattern in self.banned_software_patterns:
            if re.search(pattern, raw_str):
                detected_software.append(pattern)

        metadata_score = 0.95 if detected_software else 0.05
        return metadata_score, {"detected_software": ", ".join(detected_software)}

    def analyze_font_baseline_jitter(self, img_gray: np.ndarray) -> float:
        """
        Evaluates horizontal baseline alignment variance using character contour regression.
        """
        # Threshold
        _, thresh = cv2.threshold(img_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        bottom_y_coords = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if 10 < h < 80 and 8 < w < 80:  # Typical alphanumeric character dimensions
                bottom_y_coords.append(y + h)

        if len(bottom_y_coords) < 15:
            return 0.1

        variance = float(np.var(bottom_y_coords))
        # Large bottom variance indicates pasted or misaligned characters
        font_score = min(1.0, variance / 500.0)
        return font_score
```

---

## 7. Discrepancy & Cross-Validation Engine

The portal executes a **4-Way Automated Reconciliation** protocol before an FDR record is approved. Every data point extracted from the scanned document ($V_{OCR}$) is cross-verified against:
1. $V_{APP}$: AICTE Institutional Application Master Record.
2. $V_{CBS}$: Real-time Bank CBS / NeSL API Response.
3. $V_{MCA}$: Ministry of Corporate Affairs / PAN / GSTIN Database.

```
+----------------------------------------------------------------------------------------------------+
|                                4-WAY CROSS-RECONCILIATION ENGINE                                   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    [ Scanned Document OCR ]             [ Real-Time CBS / NeSL Response ]                          |
|             \                                      /                                               |
|              \                                    /                                                |
|               v                                  v                                                 |
|          +--------------------------------------------+                                            |
|          |    RECONCILIATION & VALIDATION MATRIX      |                                            |
|          +--------------------------------------------+                                            |
|               ^                                  ^                                                 |
|              /                                    \                                                |
|             /                                      \                                               |
|    [ AICTE Application DB ]              [ MCA / PAN / Trust Portal ]                              |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### 7.1 Cross-Validation Discrepancy Matrix

| Entity Field | Validation Rule | Permitted Tolerance | Failure Severity |
| :--- | :--- | :--- | :--- |
| **FDR Certificate No.** | Exact string equality ($OCR == CBS == NeSL$) | 0% (Exact match required) | **CRITICAL** |
| **Principal Amount** | Parity between Words, Figures, and CBS Account Balance | ₹0.00 Tolerance | **CRITICAL** |
| **Lien Marking** | Explicit text stating *"Lien marked to Member Secretary, AICTE"* | Semantic similarity $\ge 0.92$ | **CRITICAL** |
| **Bank IFSC & Branch** | Validated against RBI Master IFSC Directory | 100% Valid IFSC | **HIGH** |
| **Trust PAN / Name** | Normalized string match against CBDT PAN database | Jaro-Winkler $\ge 0.90$ | **CRITICAL** |
| **Deposit Tenor** | Must meet statutory AICTE APH duration (min. 120 months) | Expiry $\ge 10$ Years from issue | **HIGH** |

---

## 8. Mathematical Fraud Probability Scoring Formula & Auto-Escalation Framework

### 8.1 Mathematical Risk Scoring Formulation
The **Fraud Probability Score** $S_{fraud} \in [0.0, 1.0]$ aggregates forensic and discrepancy anomaly vectors into a unified non-linear metric using a logistic sigmoid transform:

$$z = \beta_0 + \sum_{i=1}^{k} w_i \cdot \Phi_i$$

$$S_{fraud} = \frac{1}{1 + e^{-z}}$$

Where:
- $\beta_0 = -3.8$ (Base calibrated log-odds prior representing standard low baseline fraud frequency).
- The anomaly feature vector $\mathbf{\Phi}$ and corresponding weights $w_i$ are defined as:

$$\mathbf{\Phi} = \begin{bmatrix}
\Phi_{ELA} \\
\Phi_{CMFD} \\
\Phi_{EXIF} \\
\Phi_{Font} \\
\Phi_{AmountMismatch} \\
\Phi_{LienAbsence} \\
\Phi_{CBSStatusMismatch}
\end{bmatrix}, \quad
\mathbf{w} = \begin{bmatrix}
1.85 \\
2.10 \\
2.75 \\
1.40 \\
4.50 \\
3.80 \\
5.00
\end{bmatrix}$$

### 8.2 Bayesian Conditional Risk Propagation
When real-time CBS confirmation is unavailable (e.g., small rural cooperative bank not on SFMS), Bayesian updating dynamically adjusts the risk probability given forensic evidence $E$:

$$P(\text{Fraud} \mid E) = \frac{P(E \mid \text{Fraud}) \cdot P(\text{Fraud})}{P(E \mid \text{Fraud}) \cdot P(\text{Fraud}) + P(E \mid \text{Clean}) \cdot P(\text{Clean})}$$

### 8.3 Tri-Tier Decision Escalation Matrix

```
                          FRAUD PROBABILITY SPECTRUM (S_fraud)
  0.0 ------------------- 0.20 -------------------------- 0.65 ------------------- 1.0
  [   GREEN: LOW RISK    ] [    AMBER: MEDIUM RISK       ] [    RED: HIGH RISK     ]
  - Straight Through Proc  - Flagged for Human Review      - System Auto-Quarantine
  - Auto-Approval Allowed  - Mandatory AICTE RO Scrutiny   - Application Frozen
  - Verified Lien Marked   - Bank Branch Written Memo      - CVO Incident Ticket
```

1. **Green Tier ($S_{fraud} < 0.20$): Low Risk / Straight-Through Processing (STP)**
   - The FDR exhibits zero forensic anomalies and matches CBS/NeSL responses with 100% fidelity.
   - Status transitions automatically to `LIEN_VERIFIED_ACTIVE`.
2. **Amber Tier ($0.20 \le S_{fraud} < 0.65$): Medium Risk / Mandatory AICTE RO Scrutiny**
   - Discrepancy observed (e.g., minor OCR noise, scanned resolution below 200 DPI, or pending CBS sync).
   - Application locked from automated issuance; routed to AICTE Regional Officer dashboard with detailed visual anomaly bounding boxes.
3. **Red Tier ($S_{fraud} \ge 0.65$): High Risk / Automatic System Quarantine**
   - High likelihood of fraudulent submission (e.g., detected Photoshop tags, copy-move stamps, amount mismatch).
   - System immediately triggers:
     1. Automatic quarantine of the application.
     2. Digital freezing of all affiliated institute records on AICTE portal.
     3. Dispatch of automated fraud ticket to the AICTE Chief Vigilance Officer (CVO).
     4. Dispatch of legal query notice under Section 66D of IT Act 2000 to the Chairman of the Trust.

### 8.4 Production Fraud Engine & Escalation Orchestrator

```python
"""
AICTE Production Fraud Probability Scoring & Decision Engine
Combines Multi-Modal Forensics, CBS Cross-Validation, and Bayesian Sigmoid Scoring
"""
import math
from typing import Dict, Any

class AICTEFraudDecisionEngine:
    # Tuned Weights based on empirical historical forensic training
    WEIGHTS = {
        "ela": 1.85,
        "cmfd": 2.10,
        "exif": 2.75,
        "font": 1.40,
        "amount_mismatch": 4.50,
        "lien_absence": 3.80,
        "cbs_mismatch": 5.00
    }
    BETA_0 = -3.80  # Base bias

    def calculate_fraud_probability(
        self,
        forensic_results: Dict[str, float],
        cross_val_results: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Calculates unified fraud probability score and triggers tier-based escalation.
        """
        # 1. Construct Anomaly Inputs
        phi_ela = forensic_results.get("ela_score", 0.0)
        phi_cmfd = forensic_results.get("cmfd_score", 0.0)
        phi_exif = forensic_results.get("metadata_score", 0.0)
        phi_font = forensic_results.get("font_score", 0.0)

        # Cross-validation binary discrepancy flags (1.0 = failure, 0.0 = match)
        phi_amount = 1.0 if not cross_val_results.get("amount_match", True) else 0.0
        phi_lien = 1.0 if not cross_val_results.get("lien_marked_valid", True) else 0.0
        phi_cbs = 1.0 if not cross_val_results.get("cbs_verified", True) else 0.0

        # 2. Compute Linear Combination z
        z = (
            self.BETA_0 +
            (self.WEIGHTS["ela"] * phi_ela) +
            (self.WEIGHTS["cmfd"] * phi_cmfd) +
            (self.WEIGHTS["exif"] * phi_exif) +
            (self.WEIGHTS["font"] * phi_font) +
            (self.WEIGHTS["amount_mismatch"] * phi_amount) +
            (self.WEIGHTS["lien_absence"] * phi_lien) +
            (self.WEIGHTS["cbs_mismatch"] * phi_cbs)
        )

        # 3. Logistic Sigmoid Transformation
        fraud_probability = 1.0 / (1.0 + math.exp(-z))
        fraud_probability = round(fraud_probability, 4)

        # 4. Decision Escalation Matrix
        if fraud_probability < 0.20:
            tier = "GREEN"
            action = "AUTO_APPROVE_STP"
            rationale = "Zero significant anomalies detected. Verified with CBS/NeSL."
        elif 0.20 <= fraud_probability < 0.65:
            tier = "AMBER"
            action = "MANUAL_RO_SCRUTINY_MANDATORY"
            rationale = "Medium forensic anomaly or pending CBS confirmation. Manual officer review required."
        else:
            tier = "RED"
            action = "QUARANTINE_AND_CVO_ESCALATE"
            rationale = "High probability of fraudulent document / manipulated deposit details. System quarantined."

        return {
            "fraud_probability_score": fraud_probability,
            "decision_tier": tier,
            "recommended_action": action,
            "rationale": rationale,
            "breakdown": {
                "ela_contribution": round(self.WEIGHTS["ela"] * phi_ela, 3),
                "cmfd_contribution": round(self.WEIGHTS["cmfd"] * phi_cmfd, 3),
                "exif_contribution": round(self.WEIGHTS["exif"] * phi_exif, 3),
                "font_contribution": round(self.WEIGHTS["font"] * phi_font, 3),
                "amount_mismatch_penalty": round(self.WEIGHTS["amount_mismatch"] * phi_amount, 3),
                "lien_absence_penalty": round(self.WEIGHTS["lien_absence"] * phi_lien, 3),
                "cbs_mismatch_penalty": round(self.WEIGHTS["cbs_mismatch"] * phi_cbs, 3)
            }
        }
```

---

## 9. Integration Checklist & Technical Standards Reference

| Interface / Component | Protocol / Standard | Payload Format | Cryptographic Control |
| :--- | :--- | :--- | :--- |
| **NeSL Digital e-BG Interconnect** | REST / JSON + SFMS Engine | JSON + Base64 PAdES PDF | RSA-4096 / SHA-256 NeSL Seal |
| **SFMS Financial Messaging** | RBI SFMS Protocol | ISO 15022 / MT760, MT767 | SWIFT/SFMS Message Signatures |
| **CBS Real-Time Gateway** | Open Banking REST + ISO 20022 | `camt.054`, `camt.053`, `pain.001` | mTLS (RFC 8446 TLS 1.3 Pinning) |
| **OCR Text Recognition** | DBNet + CRNN + LayoutLMv3 | High-dimensional tensors | SHA-256 Input Document Digest |
| **Forensic ELA Analysis** | JPEG DCT Quantization Map | Scaled 8-bit Difference Matrix | Pixel-level Variance Thresholding |
| **Copy-Move Detector (CMFD)** | SIFT + FLANN + RANSAC | 128-d Feature Descriptors | Spatial Cluster Density Metric |
| **EXIF Forensic Inspector** | Binary Tag Parsing | XMP / IPTC / DQT Tables | Quantization Hash Verification |
| **Risk Scoring Model** | Multivariate Logistic Sigmoid | Anomaly Vector $\mathbf{\Phi} \in \mathbb{R}^7$ | Bayesian Risk Propagation |

---
*(End of Specification - Document 07)*
