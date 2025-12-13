-- =============================================
-- MIGRAZIONE 006: File Upload Support
-- Aggiunge supporto per upload file nella Scrivania
-- =============================================

-- Aggiungi colonne per file upload a task_materials
ALTER TABLE task_materials
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_mime_type TEXT;

-- Commenti
COMMENT ON COLUMN task_materials.file_path IS 'Path del file su Supabase Storage';
COMMENT ON COLUMN task_materials.file_size IS 'Dimensione file in bytes';
COMMENT ON COLUMN task_materials.file_mime_type IS 'MIME type del file';

-- Crea bucket storage per file utente (da eseguire anche in Supabase Dashboard)
-- NOTA: Il bucket va creato anche manualmente nella dashboard Supabase:
-- 1. Vai su Storage
-- 2. New Bucket: "user-files"
-- 3. Public: ON (o configura RLS)
-- 4. File size limit: 10MB

-- Policy per permettere agli utenti di uploadare i propri file
-- (Da configurare in Supabase Dashboard > Storage > Policies)

/*
-- Policy INSERT: Gli utenti possono caricare file nella propria cartella
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy SELECT: Gli utenti possono vedere i propri file
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy DELETE: Gli utenti possono eliminare i propri file
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- Index per ricerche
CREATE INDEX IF NOT EXISTS idx_task_materials_file ON task_materials(file_path) WHERE file_path IS NOT NULL;
