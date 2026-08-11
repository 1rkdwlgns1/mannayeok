ALTER TABLE shared_results
    ADD COLUMN expires_at DATETIME(6) NULL AFTER created_at;

UPDATE shared_results
SET expires_at = DATE_ADD(created_at, INTERVAL 30 DAY)
WHERE expires_at IS NULL;

ALTER TABLE shared_results
    MODIFY COLUMN expires_at DATETIME(6) NOT NULL;

CREATE INDEX idx_shared_results_expiry ON shared_results (expires_at);
