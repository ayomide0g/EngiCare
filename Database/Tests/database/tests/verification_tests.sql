-- ============================================================================
-- EngiCare Database Verification & Smoke Tests
-- Not: Hata testi blokları kısıtların çalıştığını doğrulamak içindir.
-- Bu bloklar çalıştırıldığında PostgreSQL'in hata döndürmesi beklenir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tablo, Primary Key ve Foreign Key Doğrulaması
-- ----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'reports', 'report_attachments', 'timeline_entries', 'comments')
ORDER BY table_name;

SELECT
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'reports', 'report_attachments', 'timeline_entries', 'comments')
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type, kcu.column_name;

-- ----------------------------------------------------------------------------
-- 2. Örnek Veri Ekleme (INSERT) ve Birleştirerek Okuma (SELECT)
-- ----------------------------------------------------------------------------
WITH inserted_users AS (
    INSERT INTO users (full_name, email, password_hash, role, department)
    VALUES
        ('Test Reporter', 'verify.reporter@engicare.local', '$2a$10$verify_hash_1', 'REPORTER', 'IT_INFRASTRUCTURE'),
        ('Test Engineer', 'verify.engineer@engicare.local', '$2a$10$verify_hash_2', 'ENGINEER', 'HVAC')
    RETURNING id, email
),
rep AS (
    SELECT id FROM inserted_users WHERE email = 'verify.reporter@engicare.local'
),
eng AS (
    SELECT id FROM inserted_users WHERE email = 'verify.engineer@engicare.local'
),
inserted_report AS (
    INSERT INTO reports (
        title,
        description,
        category,
        building,
        department,
        status,
        priority,
        reporter_id,
        assignee_id
    )
    SELECT
        'Test Altyapı Raporu',
        'Şema doğrulama testi için oluşturulmuş örnek kayıt.',
        'HVAC',
        'ENGINEERING_BLOCK_A',
        'HVAC',
        'OPEN',
        'HIGH',
        rep.id,
        eng.id
    FROM rep, eng
    RETURNING id, reference_number
),
inserted_attachment AS (
    INSERT INTO report_attachments (
        report_id,
        uploaded_by,
        file_name,
        file_url,
        mime_type,
        file_size_bytes
    )
    SELECT
        inserted_report.id,
        rep.id,
        'test_evidence.png',
        'https://example.com/test_evidence.png',
        'image/png',
        102400
    FROM inserted_report, rep
    RETURNING id
),
inserted_timeline AS (
    INSERT INTO timeline_entries (
        report_id,
        actor_id,
        action_type,
        old_value,
        new_value,
        note
    )
    SELECT
        inserted_report.id,
        rep.id,
        'REPORT_CREATED',
        NULL,
        'OPEN',
        'Test raporu oluşturuldu.'
    FROM inserted_report, rep
    RETURNING id
)
INSERT INTO comments (report_id, author_id, content)
SELECT
    inserted_report.id,
    eng.id,
    'Test yorumu eklendi.'
FROM inserted_report, eng;

SELECT
    r.reference_number,
    r.title,
    r.category,
    r.building,
    r.status,
    r.priority,
    u_rep.full_name AS reporter_name,
    u_ass.full_name AS assignee_name,
    ra.file_name AS attachment_name,
    te.action_type AS timeline_action,
    c.content AS comment_text
FROM reports r
JOIN users u_rep ON r.reporter_id = u_rep.id
LEFT JOIN users u_ass ON r.assignee_id = u_ass.id
LEFT JOIN report_attachments ra ON ra.report_id = r.id
LEFT JOIN timeline_entries te ON te.report_id = r.id
LEFT JOIN comments c ON c.report_id = r.id
WHERE r.title = 'Test Altyapı Raporu';

-- ----------------------------------------------------------------------------
-- 3. Kısıt Hata Testleri (İstenirse ayrı ayrı çalıştırılıp hata teyit edilir)
-- ----------------------------------------------------------------------------
-- [CHECK Hatası Beklenir] Geçersiz category/priority değeri:
-- INSERT INTO reports (title, description, category, building, priority, reporter_id)
-- SELECT 'Hatali', 'Test', 'INVALID_CATEGORY', 'MAIN_BUILDING', 'INVALID_PRIORITY', id
-- FROM users LIMIT 1;

-- [FOREIGN KEY Hatası Beklenir] Olmayan report_id / author_id ile yorum ekleme:
-- INSERT INTO comments (report_id, author_id, content)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     '00000000-0000-0000-0000-000000000002',
--     'Gecersiz foreign key testi'
-- );

-- ----------------------------------------------------------------------------
-- 4. Test Verilerini Temizleme (DELETE)
-- ----------------------------------------------------------------------------
DELETE FROM reports
WHERE reporter_id IN (
    SELECT id FROM users
    WHERE email IN ('verify.reporter@engicare.local', 'verify.engineer@engicare.local')
);

DELETE FROM users
WHERE email IN ('verify.reporter@engicare.local', 'verify.engineer@engicare.local');