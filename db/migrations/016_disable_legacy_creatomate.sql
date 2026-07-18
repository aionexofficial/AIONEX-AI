BEGIN;

INSERT INTO automation_settings(key,value)
VALUES('scheduler','{"paused":true,"reason":"legacy_creatomate_disabled"}'::jsonb)
ON CONFLICT(key) DO UPDATE
SET value=EXCLUDED.value,updated_at=NOW();

UPDATE scheduled_jobs
SET status='cancelled',last_error='Legacy Creatomate automation disabled.',locked_at=NULL,locked_by=NULL,updated_at=NOW()
WHERE job_type IN ('hourly.pipeline','story.daily')
  AND status IN ('queued','running','retry','manual');

UPDATE story_settings
SET value=value||'{"renderingEnabled":false,"publishingEnabled":false,"dryRun":true,"previewOnly":true,"emergencyPause":true}'::jsonb,
    updated_by='migration:016_disable_legacy_creatomate',updated_at=NOW()
WHERE key='engine';

DELETE FROM provider_circuit_breakers WHERE provider='creatomate';

COMMIT;
