-- ============================================================================
-- AICTE Smart FDR & Security Deposit Portal (SIH Problem Statement 26265)
-- Production-Grade PostgreSQL 16 Relational Schema, Models & Security Architecture
-- ============================================================================
-- Author: Principal Data & Database Architect
-- System Version: 1.0.0
-- Database Engine: PostgreSQL 16.x
-- Description: Complete executable DDL specification including custom ENUMs,
--              relational tables, foreign key constraints, partial and GIN indexes,
--              cryptographic hash chaining trigger for audit immutability,
--              monthly range partitioning, Row-Level Security (RLS), and comprehensive
--              column-level data dictionary comments.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- 2. ENUMERATION TYPES
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE institution_type AS ENUM (
        'CENTRAL_UNIVERSITY',
        'STATE_UNIVERSITY',
        'DEEMED_UNIVERSITY',
        'GOVERNMENT',
        'GOVERNMENT_AIDED',
        'SELF_FINANCED_PRIVATE',
        'STANDALONE_INSTITUTE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE bank_tier AS ENUM (
        'PUBLIC_SECTOR_SCHEDULED',
        'PRIVATE_SCHEDULED',
        'FOREIGN_SCHEDULED',
        'REGIONAL_RURAL',
        'NON_SCHEDULED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE fdr_status AS ENUM (
        -- Ingestion & Inspection States (03_LLD Section 1.1)
        'DRAFT',
        'SUBMITTED',
        'OCR_EXTRACTED',
        'FORENSIC_VALIDATED',
        
        -- Banking Verification & Lien Marking
        'PENDING_BANK_VERIFICATION',
        'BANK_VERIFICATION_PENDING',
        'LIEN_CONFIRMED',
        'ACTIVE',
        'ACTIVE_LOCKED',
        
        -- Servicing & Rollover
        'MATURED',
        'MATURITY_NOTICE_SENT',
        'RENEWAL_REQUESTED',
        'ROLLOVER_IN_PROGRESS',
        'AUTO_ROLLOVER_PENDING',
        
        -- Release & Multi-Bureau Clearances
        'RELEASE_REQUESTED',
        'RELEASE_INITIATED',
        'AFFIDAVIT6_VERIFIED',
        'NO_DUES_CLEARED',
        'REGIONAL_OFFICE_RECOMMENDED',
        'HQ_APPROVED',
        'LIEN_REVOKED',
        'RELEASED',
        'REFUNDED_OR_CLOSED',
        
        -- Enforcement, Legal Freeze & Terminal Forfeiture
        'DISPUTE_FROZEN',
        'LIQUIDATED_BY_AICTE',
        'FORFEITED',
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE lien_status AS ENUM (
        'NOT_MARKED',
        'LIEN_REQUESTED',
        'LIEN_CONFIRMED',
        'LIEN_REVOKED',
        'LIEN_INVOKED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM (
        'FDR_RECEIPT',
        'BANK_CONFIRMATION_LETTER',
        'LIEN_ACKNOWLEDGEMENT',
        'AFFIDAVIT_6',
        'STATE_DTE_NO_OBJECTION',
        'FACULTY_SALARY_CLEARANCE',
        'COURT_ORDER',
        'PFMS_DISBURSEMENT_ADVICE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'QUERY_RAISED',
        'ESCALATED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE escalation_level AS ENUM (
        'L1_REGIONAL_OFFICE',
        'L2_HQ_FINANCE',
        'L3_ADVISER_APPROVAL',
        'L4_MEMBER_SECRETARY'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'INSERT',
        'UPDATE',
        'DELETE',
        'VERIFY_OCR',
        'MARK_LIEN',
        'REVOKE_LIEN',
        'APPROVE_RELEASE',
        'DISBURSE_PFMS',
        'ROLLOVER_INITIATED',
        'TAMPER_ALERT'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_channel AS ENUM (
        'EMAIL',
        'SMS',
        'WHATSAPP',
        'PORTAL_DASHBOARD',
        'API_WEBHOOK'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_dispatch_status AS ENUM (
        'PENDING',
        'SENT',
        'FAILED',
        'ACKNOWLEDGED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 3. UTILITY TRIGGER FUNCTION: updated_at AUTOMATION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 4. TABLE DEFINITIONS
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 4.1. Table: institutions
-- Description: Core technical institute profile registered under AICTE mandate.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aicte_permanent_id VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    institution_type institution_type NOT NULL,
    trust_society_name VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    regional_office_id VARCHAR(50) NOT NULL,
    pan VARCHAR(10) NOT NULL,
    gstin VARCHAR(15),
    contact_details JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT uq_institutions_aicte_permanent_id UNIQUE (aicte_permanent_id),
    CONSTRAINT chk_institutions_pan_format CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    CONSTRAINT chk_institutions_gstin_format CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
    CONSTRAINT chk_institutions_contact_schema CHECK (
        contact_details ? 'principal_email' AND
        contact_details ? 'principal_mobile' AND
        contact_details ? 'office_address'
    )
);

CREATE TRIGGER trg_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.2. Table: banks
-- Description: Scheduled commercial banks authorized to issue security deposits.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(150) NOT NULL,
    bank_code VARCHAR(20) NOT NULL,
    ifsc_prefix VARCHAR(4) NOT NULL,
    bank_tier bank_tier NOT NULL,
    api_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cbs_gateway_url VARCHAR(255),
    is_scheduled_bank BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT uq_banks_bank_name UNIQUE (bank_name),
    CONSTRAINT uq_banks_bank_code UNIQUE (bank_code),
    CONSTRAINT chk_banks_ifsc_prefix CHECK (ifsc_prefix ~ '^[A-Z]{4}$')
);

CREATE TRIGGER trg_banks_updated_at
    BEFORE UPDATE ON banks
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.3. Table: bank_branches
-- Description: Specific physical/virtual bank branch holding the FDR escrow.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    branch_address TEXT NOT NULL,
    nodal_officer_email VARCHAR(150) NOT NULL,
    nodal_officer_mobile VARCHAR(15) NOT NULL,
    is_sftp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT fk_bank_branches_bank FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE RESTRICT,
    CONSTRAINT uq_bank_branches_ifsc UNIQUE (ifsc_code),
    CONSTRAINT chk_bank_branches_ifsc CHECK (ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
    CONSTRAINT chk_bank_branches_email CHECK (nodal_officer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT chk_bank_branches_mobile CHECK (nodal_officer_mobile ~ '^\+?[0-9]{10,14}$')
);

CREATE TRIGGER trg_bank_branches_updated_at
    BEFORE UPDATE ON bank_branches
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.4. Table: fdrs
-- Description: Fixed Deposit Receipts pledged in joint name with AICTE.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fdrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL,
    bank_branch_id UUID NOT NULL,
    fdr_number VARCHAR(50) NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) NOT NULL,
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    lock_in_years INTEGER NOT NULL DEFAULT 8,
    status fdr_status NOT NULL DEFAULT 'DRAFT',
    lien_status lien_status NOT NULL DEFAULT 'NOT_MARKED',
    joint_holder_name VARCHAR(255) NOT NULL DEFAULT 'Regional Officer, AICTE',
    auto_renewal_flag BOOLEAN NOT NULL DEFAULT TRUE,
    current_balance NUMERIC(15, 2) NOT NULL,
    maturity_amount NUMERIC(15, 2),
    renewal_count INTEGER NOT NULL DEFAULT 0,
    parent_fdr_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT fk_fdrs_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fdrs_branch FOREIGN KEY (bank_branch_id) REFERENCES bank_branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fdrs_parent FOREIGN KEY (parent_fdr_id) REFERENCES fdrs(id) ON DELETE SET NULL,
    CONSTRAINT uq_branch_fdr_number UNIQUE (bank_branch_id, fdr_number),
    CONSTRAINT chk_fdrs_principal_positive CHECK (principal_amount > 0),
    CONSTRAINT chk_fdrs_interest_rate_range CHECK (interest_rate >= 0.00 AND interest_rate <= 25.00),
    CONSTRAINT chk_fdrs_dates_chronology CHECK (maturity_date > issue_date),
    CONSTRAINT chk_fdrs_lock_in_years CHECK (lock_in_years BETWEEN 1 AND 25),
    CONSTRAINT chk_fdrs_current_balance CHECK (current_balance >= 0),
    CONSTRAINT chk_fdrs_renewal_count CHECK (renewal_count >= 0)
);

CREATE TRIGGER trg_fdrs_updated_at
    BEFORE UPDATE ON fdrs
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.5. Table: fdr_documents
-- Description: Scanned FDR receipts, affidavits, and bank NOCs with OCR payloads.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fdr_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL,
    document_type document_type NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    file_hash_sha256 VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    ocr_extracted_payload JSONB,
    forensic_tamper_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_tampered BOOLEAN GENERATED ALWAYS AS (forensic_tamper_score >= 0.75) STORED,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT fk_fdr_documents_fdr FOREIGN KEY (fdr_id) REFERENCES fdrs(id) ON DELETE CASCADE,
    CONSTRAINT uq_fdr_documents_s3_key UNIQUE (s3_key),
    CONSTRAINT chk_fdr_documents_sha256 CHECK (file_hash_sha256 ~ '^[a-fA-F0-9]{64}$'),
    CONSTRAINT chk_fdr_documents_file_size CHECK (file_size > 0 AND file_size <= 52428800), -- 50 MB limit
    CONSTRAINT chk_fdr_documents_tamper_score CHECK (forensic_tamper_score >= 0.0 AND forensic_tamper_score <= 1.0)
);

-- ----------------------------------------------------------------------------
-- 4.6. Table: lien_records
-- Description: Legal lien notation records, CBS confirmations, and NeSL tokens.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lien_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL,
    lien_reference_number VARCHAR(100) NOT NULL,
    lien_marked_date TIMESTAMPTZ,
    lien_revoked_date TIMESTAMPTZ,
    lien_status lien_status NOT NULL DEFAULT 'LIEN_REQUESTED',
    bank_acknowledgement_doc_id UUID,
    nesl_transaction_id VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT fk_lien_records_fdr FOREIGN KEY (fdr_id) REFERENCES fdrs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lien_records_doc FOREIGN KEY (bank_acknowledgement_doc_id) REFERENCES fdr_documents(id) ON DELETE SET NULL,
    CONSTRAINT uq_lien_records_ref_number UNIQUE (lien_reference_number),
    CONSTRAINT uq_lien_records_nesl_tx UNIQUE (nesl_transaction_id),
    CONSTRAINT chk_lien_revocation_chronology CHECK (
        lien_revoked_date IS NULL OR (lien_marked_date IS NOT NULL AND lien_revoked_date >= lien_marked_date)
    )
);

CREATE TRIGGER trg_lien_records_updated_at
    BEFORE UPDATE ON lien_records
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.7. Table: maturity_alerts
-- Description: Automated timeline notifications (T-90, T-60, T-30, etc.) and escalations.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maturity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    trigger_date DATE NOT NULL,
    target_recipient VARCHAR(255) NOT NULL,
    channel alert_channel NOT NULL DEFAULT 'EMAIL',
    dispatch_status alert_dispatch_status NOT NULL DEFAULT 'PENDING',
    escalation_level escalation_level NOT NULL DEFAULT 'L1_REGIONAL_OFFICE',
    dispatch_timestamp TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    failure_reason TEXT,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT fk_maturity_alerts_fdr FOREIGN KEY (fdr_id) REFERENCES fdrs(id) ON DELETE CASCADE,
    CONSTRAINT chk_maturity_alerts_retry_count CHECK (retry_count >= 0)
);

-- ----------------------------------------------------------------------------
-- 4.8. Table: release_requests
-- Description: 3-Tier governance workflow for FDR release, closure, or refund.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS release_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL,
    request_number VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    affidavit6_doc_id UUID NOT NULL,
    no_dues_state_dte_doc_id UUID NOT NULL,
    no_dues_faculty_doc_id UUID NOT NULL,
    regional_office_status approval_status NOT NULL DEFAULT 'PENDING',
    regional_office_remarks TEXT,
    regional_officer_id UUID,
    regional_office_action_at TIMESTAMPTZ,
    hq_finance_status approval_status NOT NULL DEFAULT 'PENDING',
    hq_finance_remarks TEXT,
    hq_finance_officer_id UUID,
    hq_finance_action_at TIMESTAMPTZ,
    member_secretary_status approval_status NOT NULL DEFAULT 'PENDING',
    member_secretary_remarks TEXT,
    member_secretary_id UUID,
    member_secretary_action_at TIMESTAMPTZ,
    pfms_payment_ref VARCHAR(100),
    amount_approved NUMERIC(15, 2),
    status fdr_status NOT NULL DEFAULT 'RELEASE_REQUESTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT fk_release_requests_fdr FOREIGN KEY (fdr_id) REFERENCES fdrs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_release_requests_affidavit6 FOREIGN KEY (affidavit6_doc_id) REFERENCES fdr_documents(id) ON DELETE RESTRICT,
    CONSTRAINT fk_release_requests_dte_noc FOREIGN KEY (no_dues_state_dte_doc_id) REFERENCES fdr_documents(id) ON DELETE RESTRICT,
    CONSTRAINT fk_release_requests_faculty_noc FOREIGN KEY (no_dues_faculty_doc_id) REFERENCES fdr_documents(id) ON DELETE RESTRICT,
    CONSTRAINT uq_release_requests_number UNIQUE (request_number),
    CONSTRAINT chk_release_requests_amount CHECK (amount_approved IS NULL OR amount_approved >= 0)
);

CREATE TRIGGER trg_release_requests_updated_at
    BEFORE UPDATE ON release_requests
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.9. Table: audit_ledger (Partitioned by Range on created_at)
-- Description: Tamper-evident, cryptographically chained audit log.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_ledger (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action audit_action NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    state_before JSONB,
    state_after JSONB,
    prev_record_hash VARCHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    current_hash VARCHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_audit_ledger PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ----------------------------------------------------------------------------
-- 5. RANGE PARTITION DEFINITIONS FOR audit_ledger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m01 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m02 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m03 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m04 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m05 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m06 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m07 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m08 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m09 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m10 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m11 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2026m12 PARTITION OF audit_ledger
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2027m01 PARTITION OF audit_ledger
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2027m02 PARTITION OF audit_ledger
    FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_y2027m03 PARTITION OF audit_ledger
    FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_ledger_default PARTITION OF audit_ledger DEFAULT;

-- ----------------------------------------------------------------------------
-- 6. CRYPTOGRAPHIC HASH CHAINING TRIGGER & VERIFICATION ENGINE
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_audit_ledger_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
    v_prev_hash VARCHAR(64);
    v_genesis_hash CONSTANT VARCHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
    v_payload TEXT;
BEGIN
    -- Transaction-level advisory lock serializes hash chain computation across concurrent workers
    PERFORM pg_advisory_xact_lock(hashtext('audit_ledger_chain_lock'));

    -- Guarantee monotonic, immutable timestamping
    IF NEW.created_at IS NULL THEN
        NEW.created_at := clock_timestamp();
    END IF;

    -- Fetch the hash of the immediate predecessor record across all partitions
    SELECT current_hash INTO v_prev_hash
    FROM audit_ledger
    ORDER BY id DESC
    LIMIT 1;

    IF v_prev_hash IS NULL THEN
        NEW.prev_record_hash := v_genesis_hash;
    ELSE
        NEW.prev_record_hash := v_prev_hash;
    END IF;

    -- Canonical serialization of row state (deterministic hashing)
    v_payload := CONCAT_WS('|',
        NEW.entity_type,
        NEW.entity_id::TEXT,
        NEW.action::TEXT,
        NEW.actor_id::TEXT,
        NEW.actor_role,
        NEW.ip_address::TEXT,
        COALESCE(NEW.state_before::TEXT, '{}'),
        COALESCE(NEW.state_after::TEXT, '{}'),
        NEW.prev_record_hash,
        to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    );

    -- Compute SHA-256 cryptographic digest
    NEW.current_hash := encode(digest(v_payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_ledger_hash_chain
    BEFORE INSERT ON audit_ledger
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_ledger_hash_chain();

-- Immutability enforcement: Block UPDATE and DELETE on audit ledger completely
CREATE OR REPLACE FUNCTION fn_prevent_audit_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AICTE Audit Ledger is strictly append-only. UPDATE and DELETE actions are cryptographically forbidden.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_ledger_immutable
    BEFORE UPDATE OR DELETE ON audit_ledger
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_audit_ledger_mutation();

-- Stored Function: Cryptographic Integrity Verification Tool
CREATE OR REPLACE FUNCTION fn_verify_audit_ledger_integrity(
    p_start_id BIGINT DEFAULT 1,
    p_end_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    records_checked BIGINT,
    failed_at_id BIGINT,
    error_message TEXT
) AS $$
DECLARE
    r RECORD;
    v_expected_prev_hash VARCHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
    v_recomputed_hash VARCHAR(64);
    v_payload TEXT;
    v_count BIGINT := 0;
BEGIN
    FOR r IN
        SELECT * FROM audit_ledger
        WHERE id >= p_start_id
          AND (p_end_id IS NULL OR id <= p_end_id)
        ORDER BY id ASC
    LOOP
        v_count := v_count + 1;

        -- Validate backward chain linkage
        IF v_count > 1 THEN
            IF r.prev_record_hash <> v_expected_prev_hash THEN
                RETURN QUERY SELECT
                    FALSE,
                    v_count,
                    r.id,
                    format('Hash chain broken at ID %s. Expected prev_hash: %s, Found: %s',
                           r.id, v_expected_prev_hash, r.prev_record_hash);
                RETURN;
            END IF;
        END IF;

        -- Recompute SHA-256 over row payload
        v_payload := CONCAT_WS('|',
            r.entity_type,
            r.entity_id::TEXT,
            r.action::TEXT,
            r.actor_id::TEXT,
            r.actor_role,
            r.ip_address::TEXT,
            COALESCE(r.state_before::TEXT, '{}'),
            COALESCE(r.state_after::TEXT, '{}'),
            r.prev_record_hash,
            to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
        );
        v_recomputed_hash := encode(digest(v_payload, 'sha256'), 'hex');

        -- Validate current hash integrity
        IF r.current_hash <> v_recomputed_hash THEN
            RETURN QUERY SELECT
                FALSE,
                v_count,
                r.id,
                format('Hash mismatch at ID %s. Recorded: %s, Recomputed: %s',
                       r.id, r.current_hash, v_recomputed_hash);
            RETURN;
        END IF;

        v_expected_prev_hash := r.current_hash;
    END LOOP;

    RETURN QUERY SELECT
        TRUE,
        v_count,
        NULL::BIGINT,
        'Audit ledger hash chain is cryptographically intact and unbroken.'::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- 7. AUTOMATED PARTITION PROVISIONING PROCEDURE
-- ----------------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE sp_create_audit_ledger_monthly_partition(
    p_year INT,
    p_month INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_part_name TEXT;
    v_start_date TEXT;
    v_end_date TEXT;
    v_sql TEXT;
BEGIN
    v_part_name := format('audit_ledger_y%sm%s', p_year, lpad(p_month::text, 2, '0'));
    v_start_date := format('%s-%s-01 00:00:00+00', p_year, lpad(p_month::text, 2, '0'));
    
    IF p_month = 12 THEN
        v_end_date := format('%s-01-01 00:00:00+00', p_year + 1);
    ELSE
        v_end_date := format('%s-%s-01 00:00:00+00', p_year, lpad((p_month + 1)::text, 2, '0'));
    END IF;

    v_sql := format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_ledger FOR VALUES FROM (%L) TO (%L);',
        v_part_name, v_start_date, v_end_date
    );

    EXECUTE v_sql;
    RAISE NOTICE 'Partition % created for range % to %', v_part_name, v_start_date, v_end_date;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. COMPREHENSIVE INDEXING STRATEGY
-- ----------------------------------------------------------------------------

-- 8.1. Foreign Key B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_bank_branches_bank_id ON bank_branches (bank_id);
CREATE INDEX IF NOT EXISTS idx_fdrs_institution_id ON fdrs (institution_id);
CREATE INDEX IF NOT EXISTS idx_fdrs_bank_branch_id ON fdrs (bank_branch_id);
CREATE INDEX IF NOT EXISTS idx_fdrs_parent_fdr_id ON fdrs (parent_fdr_id) WHERE parent_fdr_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fdr_documents_fdr_id ON fdr_documents (fdr_id);
CREATE INDEX IF NOT EXISTS idx_lien_records_fdr_id ON lien_records (fdr_id);
CREATE INDEX IF NOT EXISTS idx_lien_records_doc_id ON lien_records (bank_acknowledgement_doc_id) WHERE bank_acknowledgement_doc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maturity_alerts_fdr_id ON maturity_alerts (fdr_id);
CREATE INDEX IF NOT EXISTS idx_release_requests_fdr_id ON release_requests (fdr_id);

-- 8.2. Partial Indexes for High-Velocity Queries
-- Pending bank verification queue
CREATE INDEX IF NOT EXISTS idx_fdrs_pending_bank_verification
    ON fdrs (bank_branch_id, created_at ASC)
    WHERE status = 'PENDING_BANK_VERIFICATION';

-- Active FDRs monitored for maturity escalation (T-90 days window)
CREATE INDEX IF NOT EXISTS idx_fdrs_active_maturity_tracking
    ON fdrs (maturity_date ASC, institution_id)
    WHERE status IN ('ACTIVE', 'RENEWAL_REQUESTED');

-- Forensic tamper detection alerts (high tamper probability)
CREATE INDEX IF NOT EXISTS idx_fdr_documents_tamper_alert
    ON fdr_documents (forensic_tamper_score DESC, fdr_id)
    WHERE forensic_tamper_score >= 0.75;

-- Pending maturity dispatch notifications queue
CREATE INDEX IF NOT EXISTS idx_maturity_alerts_pending_dispatch
    ON maturity_alerts (trigger_date ASC, channel)
    WHERE dispatch_status = 'PENDING';

-- Active 3-tier release approvals queue
CREATE INDEX IF NOT EXISTS idx_release_requests_workflow_pending
    ON release_requests (regional_office_status, hq_finance_status, member_secretary_status)
    WHERE status = 'RELEASE_REQUESTED';

-- 8.3. GIN Inverted Indexes for High-Density JSONB & Unstructured Payloads
CREATE INDEX IF NOT EXISTS idx_fdr_documents_ocr_payload_gin
    ON fdr_documents USING GIN (ocr_extracted_payload);

CREATE INDEX IF NOT EXISTS idx_institutions_contact_details_gin
    ON institutions USING GIN (contact_details);

CREATE INDEX IF NOT EXISTS idx_audit_ledger_state_after_gin
    ON audit_ledger USING GIN (state_after);

-- 8.4. Audit Ledger Partition Indexes
CREATE INDEX IF NOT EXISTS idx_audit_ledger_entity_lookup
    ON audit_ledger (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_ledger_actor_lookup
    ON audit_ledger (actor_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lien_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maturity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_ledger ENABLE ROW LEVEL SECURITY;

-- 9.1. Policies for institutions
CREATE POLICY p_institutions_admin_auditor ON institutions
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) IN ('aicte_admin', 'auditor')
    );

CREATE POLICY p_institutions_regional_officer ON institutions
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'regional_officer'
        AND regional_office_id = current_setting('app.current_regional_office_id', true)
    );

CREATE POLICY p_institutions_institution_self ON institutions
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'institution_user'
        AND id = NULLIF(current_setting('app.current_institution_id', true), '')::UUID
    );

-- 9.2. Policies for fdrs
CREATE POLICY p_fdrs_admin_auditor ON fdrs
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) IN ('aicte_admin', 'auditor')
    );

CREATE POLICY p_fdrs_regional_officer ON fdrs
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'regional_officer'
        AND institution_id IN (
            SELECT i.id FROM institutions i
            WHERE i.regional_office_id = current_setting('app.current_regional_office_id', true)
        )
    );

CREATE POLICY p_fdrs_institution_user ON fdrs
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'institution_user'
        AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')::UUID
    );

CREATE POLICY p_fdrs_bank_nodal ON fdrs
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'bank_nodal_officer'
        AND bank_branch_id = NULLIF(current_setting('app.current_bank_branch_id', true), '')::UUID
    );

-- 9.3. Policies for fdr_documents
CREATE POLICY p_fdr_documents_admin_auditor ON fdr_documents
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) IN ('aicte_admin', 'auditor')
    );

CREATE POLICY p_fdr_documents_institution ON fdr_documents
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'institution_user'
        AND fdr_id IN (
            SELECT f.id FROM fdrs f
            WHERE f.institution_id = NULLIF(current_setting('app.current_institution_id', true), '')::UUID
        )
    );

CREATE POLICY p_fdr_documents_bank_nodal ON fdr_documents
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'bank_nodal_officer'
        AND fdr_id IN (
            SELECT f.id FROM fdrs f
            WHERE f.bank_branch_id = NULLIF(current_setting('app.current_bank_branch_id', true), '')::UUID
        )
    );

-- 9.4. Policies for release_requests
CREATE POLICY p_release_requests_admin ON release_requests
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) IN ('aicte_admin', 'hq_finance', 'member_secretary')
    );

CREATE POLICY p_release_requests_ro ON release_requests
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'regional_officer'
        AND fdr_id IN (
            SELECT f.id FROM fdrs f
            JOIN institutions i ON f.institution_id = i.id
            WHERE i.regional_office_id = current_setting('app.current_regional_office_id', true)
        )
    );

CREATE POLICY p_release_requests_institution ON release_requests
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'institution_user'
        AND fdr_id IN (
            SELECT f.id FROM fdrs f
            WHERE f.institution_id = NULLIF(current_setting('app.current_institution_id', true), '')::UUID
        )
    );

-- 9.5. Policies for audit_ledger (Append-only / Selective Read)
CREATE POLICY p_audit_ledger_auditor_select ON audit_ledger
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) IN ('aicte_admin', 'auditor')
    );

CREATE POLICY p_audit_ledger_system_insert ON audit_ledger
    FOR INSERT
    WITH CHECK (TRUE);

-- ----------------------------------------------------------------------------
-- 10. SYSTEM DATA DICTIONARY COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE institutions IS 'Master registry of technical educational institutions authorized by AICTE.';
COMMENT ON COLUMN institutions.id IS 'Globally unique system identifier for the institution.';
COMMENT ON COLUMN institutions.aicte_permanent_id IS 'Immutable unique AICTE identifier assigned during institutional inception.';
COMMENT ON COLUMN institutions.name IS 'Legal trade name of the technical institution.';
COMMENT ON COLUMN institutions.institution_type IS 'Statutory category (Central, State, Private, Deemed, etc.).';
COMMENT ON COLUMN institutions.trust_society_name IS 'Sponsoring Trust or Society registered under Societies Registration Act.';
COMMENT ON COLUMN institutions.state IS 'State or Union Territory location of institutional campus.';
COMMENT ON COLUMN institutions.regional_office_id IS 'AICTE Regional Office code having jurisdictional oversight.';
COMMENT ON COLUMN institutions.pan IS 'Permanent Account Number of the Trust/Society.';
COMMENT ON COLUMN institutions.gstin IS 'Goods and Services Tax Identification Number if registered.';
COMMENT ON COLUMN institutions.contact_details IS 'JSON payload containing principal name, official email, phone, and address.';
COMMENT ON COLUMN institutions.is_active IS 'Operational flag denoting whether the institute holds active AICTE approval.';

COMMENT ON TABLE banks IS 'Scheduled commercial banks approved for escrow security deposit placement.';
COMMENT ON COLUMN banks.id IS 'Primary key UUID for the financial institution.';
COMMENT ON COLUMN banks.bank_name IS 'Full legal name of the banking enterprise.';
COMMENT ON COLUMN banks.bank_code IS 'Normalized alphanumeric shorthand identifier.';
COMMENT ON COLUMN banks.ifsc_prefix IS 'First 4 characters of RBI assigned IFSC codes for this bank.';
COMMENT ON COLUMN banks.bank_tier IS 'RBI regulatory classification tier.';
COMMENT ON COLUMN banks.api_enabled IS 'Indicates whether CBS direct API integration is live.';
COMMENT ON COLUMN banks.cbs_gateway_url IS 'Base URL endpoint for bank core banking verification API.';
COMMENT ON COLUMN banks.is_scheduled_bank IS 'Affirmation of inclusion in RBI Second Schedule.';

COMMENT ON TABLE bank_branches IS 'Branch location maintaining physical and ledger jurisdiction over deposit receipts.';
COMMENT ON COLUMN bank_branches.id IS 'Branch UUID identifier.';
COMMENT ON COLUMN bank_branches.bank_id IS 'Foreign key reference to parent bank institution.';
COMMENT ON COLUMN bank_branches.ifsc_code IS '11-character unique Reserve Bank of India IFSC code.';
COMMENT ON COLUMN bank_branches.branch_name IS 'Descriptive physical name of branch locality.';
COMMENT ON COLUMN bank_branches.branch_address IS 'Complete postal address of the bank branch.';
COMMENT ON COLUMN bank_branches.nodal_officer_email IS 'Official banking email of the designated AICTE nodal officer.';
COMMENT ON COLUMN bank_branches.nodal_officer_mobile IS 'Direct telephone contact for verification inquiries.';

COMMENT ON TABLE fdrs IS 'Security deposit fixed deposit receipts pledged in joint name with AICTE.';
COMMENT ON COLUMN fdrs.id IS 'Unique identifier for the fixed deposit record.';
COMMENT ON COLUMN fdrs.institution_id IS 'Foreign key link to issuing educational institution.';
COMMENT ON COLUMN fdrs.bank_branch_id IS 'Foreign key link to branch issuing and holding deposit.';
COMMENT ON COLUMN fdrs.fdr_number IS 'Unique account/receipt number designated by the bank.';
COMMENT ON COLUMN fdrs.principal_amount IS 'Initial principal sum deposited in Indian Rupees (INR).';
COMMENT ON COLUMN fdrs.interest_rate IS 'Contractual annualized percentage yield.';
COMMENT ON COLUMN fdrs.issue_date IS 'Calendar date on which the deposit became effective.';
COMMENT ON COLUMN fdrs.maturity_date IS 'Calendar date of contractual maturity.';
COMMENT ON COLUMN fdrs.lock_in_years IS 'Statutory lock-in duration (standard 8-10 years).';
COMMENT ON COLUMN fdrs.status IS 'Current operational lifecycle stage.';
COMMENT ON COLUMN fdrs.lien_status IS 'AICTE statutory lien notation state.';
COMMENT ON COLUMN fdrs.joint_holder_name IS 'AICTE representative title appearing on bank certificate.';
COMMENT ON COLUMN fdrs.auto_renewal_flag IS 'Enforces contractual auto-rollover on maturity if true.';
COMMENT ON COLUMN fdrs.current_balance IS 'Current accrued balance including compounded interest.';
COMMENT ON COLUMN fdrs.maturity_amount IS 'Projected or confirmed payout sum upon maturity.';
COMMENT ON COLUMN fdrs.renewal_count IS 'Cumulative rollover occurrences over asset lifetime.';
COMMENT ON COLUMN fdrs.parent_fdr_id IS 'Recursive pointer to ancestor FDR in rollover lineage.';

COMMENT ON TABLE fdr_documents IS 'Digital documentary evidence, certificates, affidavits and forensic OCR metadata.';
COMMENT ON COLUMN fdr_documents.id IS 'Primary key UUID for stored artifact.';
COMMENT ON COLUMN fdr_documents.fdr_id IS 'Foreign key relationship to parent FDR.';
COMMENT ON COLUMN fdr_documents.document_type IS 'Classification of documentary evidence.';
COMMENT ON COLUMN fdr_documents.s3_key IS 'Unique cloud object storage pointer.';
COMMENT ON COLUMN fdr_documents.file_hash_sha256 IS 'SHA-256 binary cryptographic checksum for tamper proofing.';
COMMENT ON COLUMN fdr_documents.mime_type IS 'Standard Internet Media Type of the file.';
COMMENT ON COLUMN fdr_documents.file_size IS 'Byte count of stored document binary.';
COMMENT ON COLUMN fdr_documents.ocr_extracted_payload IS 'Structured JSON extraction from OCR pipeline.';
COMMENT ON COLUMN fdr_documents.forensic_tamper_score IS 'Computed anomaly score (0.0=authentic, 1.0=fraudulent).';
COMMENT ON COLUMN fdr_documents.is_tampered IS 'Computed virtual column flagging tamper probability (>= 0.75).';
COMMENT ON COLUMN fdr_documents.verified_at IS 'Timestamp of human or automated forensic clearance.';
COMMENT ON COLUMN fdr_documents.verified_by IS 'UUID of officer or system agent validating artifact.';

COMMENT ON TABLE lien_records IS 'Formal bank lien notations and NeSL electronic registry entries.';
COMMENT ON COLUMN lien_records.id IS 'Lien entry primary key identifier.';
COMMENT ON COLUMN lien_records.fdr_id IS 'Target FDR subjected to legal lien.';
COMMENT ON COLUMN lien_records.lien_reference_number IS 'Official bank CBS lien registration reference.';
COMMENT ON COLUMN lien_records.lien_marked_date IS 'Timestamp when bank CBS locked collateral.';
COMMENT ON COLUMN lien_records.lien_revoked_date IS 'Timestamp when lien notation was formally rescinded.';
COMMENT ON COLUMN lien_records.lien_status IS 'State of encumbrance in favor of AICTE.';
COMMENT ON COLUMN lien_records.bank_acknowledgement_doc_id IS 'Link to formal signed bank acknowledgement letter.';
COMMENT ON COLUMN lien_records.nesl_transaction_id IS 'NeSL National E-Governance Services Ltd transaction token.';

COMMENT ON TABLE maturity_alerts IS 'Automated cron-triggered notification dispatch events.';
COMMENT ON COLUMN maturity_alerts.id IS 'Alert record primary key identifier.';
COMMENT ON COLUMN maturity_alerts.fdr_id IS 'Target FDR approaching maturity horizon.';
COMMENT ON COLUMN maturity_alerts.alert_type IS 'Threshold indicator (T_MINUS_90, T_MINUS_60, etc.).';
COMMENT ON COLUMN maturity_alerts.trigger_date IS 'Scheduled execution date for the alert.';
COMMENT ON COLUMN maturity_alerts.target_recipient IS 'Designated notification endpoint (email, phone, webhook).';
COMMENT ON COLUMN maturity_alerts.channel IS 'Communication protocol utilized for dispatch.';
COMMENT ON COLUMN maturity_alerts.dispatch_status IS 'Execution state of outbound dispatch.';
COMMENT ON COLUMN maturity_alerts.escalation_level IS 'Administrative hierarchy tier responsible for action.';

COMMENT ON TABLE release_requests IS 'Multi-tier institutional request for deposit liquidation or return.';
COMMENT ON COLUMN release_requests.id IS 'Release request primary key identifier.';
COMMENT ON COLUMN release_requests.fdr_id IS 'Target FDR proposed for liquidation/release.';
COMMENT ON COLUMN release_requests.request_number IS 'Human-readable sequential tracking number.';
COMMENT ON COLUMN release_requests.reason IS 'Institutional justification for closure/release.';
COMMENT ON COLUMN release_requests.affidavit6_doc_id IS 'Mandatory notarized AICTE Affidavit 6 legal clearance.';
COMMENT ON COLUMN release_requests.no_dues_state_dte_doc_id IS 'State Directorate of Technical Education No Objection Certificate.';
COMMENT ON COLUMN release_requests.no_dues_faculty_doc_id IS 'Faculty salary settlement and student clearance affidavit.';
COMMENT ON COLUMN release_requests.regional_office_status IS 'First-tier Regional Officer review outcome.';
COMMENT ON COLUMN release_requests.hq_finance_status IS 'Second-tier HQ Finance Bureau audit outcome.';
COMMENT ON COLUMN release_requests.member_secretary_status IS 'Final statutory clearance by Member Secretary, AICTE.';
COMMENT ON COLUMN release_requests.pfms_payment_ref IS 'Public Financial Management System treasury disbursement token.';
COMMENT ON COLUMN release_requests.amount_approved IS 'Final cleared refund amount in INR.';

COMMENT ON TABLE audit_ledger IS 'Immutable, cryptographically chained transactional event ledger.';
COMMENT ON COLUMN audit_ledger.id IS 'Monotonically incrementing sequence ID.';
COMMENT ON COLUMN audit_ledger.entity_type IS 'Target schema entity name (e.g., fdrs, lien_records).';
COMMENT ON COLUMN audit_ledger.entity_id IS 'Target entity UUID.';
COMMENT ON COLUMN audit_ledger.action IS 'Specific state transformation executed.';
COMMENT ON COLUMN audit_ledger.actor_id IS 'UUID of authenticated subject enacting change.';
COMMENT ON COLUMN audit_ledger.actor_role IS 'Security role context at moment of execution.';
COMMENT ON COLUMN audit_ledger.ip_address IS 'Originating IPv4 or IPv6 network address.';
COMMENT ON COLUMN audit_ledger.user_agent IS 'Client software application user-agent header.';
COMMENT ON COLUMN audit_ledger.state_before IS 'Full JSON representation of record prior to mutation.';
COMMENT ON COLUMN audit_ledger.state_after IS 'Full JSON representation of record post mutation.';
COMMENT ON COLUMN audit_ledger.prev_record_hash IS 'SHA-256 digest of previous audit record creating unbreakable chain.';
COMMENT ON COLUMN audit_ledger.current_hash IS 'SHA-256 cryptographic digest of current row payload and prev_record_hash.';
COMMENT ON COLUMN audit_ledger.signature IS 'Digital signature / HMAC verifying transaction authenticity.';
COMMENT ON COLUMN audit_ledger.created_at IS 'Immutable UTC timestamp of ledger entry insertion.';

COMMIT;
