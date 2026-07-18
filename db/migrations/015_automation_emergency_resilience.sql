BEGIN;

CREATE TABLE IF NOT EXISTS provider_circuit_breakers (
  provider TEXT PRIMARY KEY,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  open_until TIMESTAMPTZ NOT NULL,
  last_alert_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduled_jobs DROP CONSTRAINT IF EXISTS scheduled_jobs_status_check;
ALTER TABLE scheduled_jobs ADD CONSTRAINT scheduled_jobs_status_check
  CHECK(status IN ('queued','running','completed','retry','manual','dead','cancelled'));

ALTER TABLE story_render_jobs DROP CONSTRAINT IF EXISTS story_render_jobs_status_check;
ALTER TABLE story_render_jobs ADD CONSTRAINT story_render_jobs_status_check
  CHECK(status IN ('queued','narrating','rendering','validating','ready','awaiting_billing','failed'));

COMMIT;
