-- Generated media is temporary delivery only; user uploads retain NULL expiry.
ALTER TABLE media_assets ADD COLUMN expires_at TEXT;
ALTER TABLE generation_jobs ADD COLUMN output_expires_at TEXT;
CREATE INDEX IF NOT EXISTS idx_assets_expiry ON media_assets(expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_output_expiry ON generation_jobs(output_expires_at);
