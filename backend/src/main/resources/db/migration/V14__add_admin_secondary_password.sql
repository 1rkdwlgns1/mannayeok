ALTER TABLE members
    ADD COLUMN admin_secondary_password_hash VARCHAR(255) NULL AFTER token_version,
    ADD COLUMN admin_secondary_password_set_at DATETIME(6) NULL AFTER admin_secondary_password_hash;
