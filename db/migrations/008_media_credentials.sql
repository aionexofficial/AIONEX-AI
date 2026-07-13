BEGIN;
CREATE TABLE IF NOT EXISTS integration_credentials(provider TEXT PRIMARY KEY, encrypted_value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS media_assets(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), upload_id UUID REFERENCES youtube_uploads(id) ON DELETE CASCADE, kind TEXT NOT NULL, mime_type TEXT NOT NULL, data BYTEA, external_url TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(data IS NOT NULL OR external_url IS NOT NULL));
CREATE INDEX IF NOT EXISTS media_assets_upload_idx ON media_assets(upload_id,kind);
COMMIT;
