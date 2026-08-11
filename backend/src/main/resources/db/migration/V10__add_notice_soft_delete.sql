ALTER TABLE notices
    ADD COLUMN deleted_at DATETIME(6) NULL AFTER published_at,
    ADD INDEX idx_notices_deleted_at (deleted_at);
