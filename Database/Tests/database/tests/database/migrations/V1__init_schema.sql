-- ============================================================================
-- EngiCare Initial PostgreSQL Schema
-- Tables: users, reports, report_attachments, timeline_entries, comments
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Benzersiz rapor referans numarası üretmek için sequence (Örn: ENG-000001)
CREATE SEQUENCE IF NOT EXISTS report_ref_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- ----------------------------------------------------------------------------
-- 1. users: Kullanıcı hesapları, roller ve departman bilgisi
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'REPORTER'
        CHECK (role IN ('USER', 'REPORTER', 'ENGINEER', 'TECHNICIAN', 'ADMIN')),
    department VARCHAR(100)
        CHECK (department IS NULL OR department IN (
            'ELECTRICAL',
            'MECHANICAL',
            'CIVIL',
            'IT_INFRASTRUCTURE',
            'HVAC',
            'FACILITY_MANAGEMENT',
            'GENERAL'
        )),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. reports: Gönderilen altyapı raporları, durumlar, öncelikler ve atamalar
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(30) NOT NULL UNIQUE
        DEFAULT ('ENG-' || LPAD(nextval('report_ref_seq')::TEXT, 6, '0')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(60) NOT NULL
        CHECK (category IN (
            'ELECTRICAL',
            'PLUMBING',
            'HVAC',
            'STRUCTURAL',
            'NETWORK',
            'SAFETY',
            'OTHER'
        )),
    building VARCHAR(100) NOT NULL
        CHECK (building IN (
            'MAIN_BUILDING',
            'ENGINEERING_BLOCK_A',
            'ENGINEERING_BLOCK_B',
            'LABORATORY_COMPLEX',
            'LIBRARY',
            'DORMITORY',
            'OTHER'
        )),
    department VARCHAR(100)
        CHECK (department IS NULL OR department IN (
            'ELECTRICAL',
            'MECHANICAL',
            'CIVIL',
            'IT_INFRASTRUCTURE',
            'HVAC',
            'FACILITY_MANAGEMENT',
            'GENERAL'
        )),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN (
            'OPEN',
            'ASSIGNED',
            'IN_PROGRESS',
            'RESOLVED',
            'CLOSED',
            'REJECTED'
        )),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. report_attachments: Raporlarla ilişkili dosya referansları ve meta veriler
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT
        CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. timeline_entries: Rapor aktiviteleri ve durum değişiklik kayıtları
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timeline_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(60) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. comments: Raporlara ait yorumlar
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL
        CHECK (LENGTH(TRIM(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- İndeksler (Foreign Key ve sık filtrelenen alanlar)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reports_reference_number ON reports(reference_number);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_assignee_id ON reports(assignee_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_building ON reports(building);
CREATE INDEX IF NOT EXISTS idx_report_attachments_report_id ON report_attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_report_id ON timeline_entries(report_id);
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON comments(report_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);