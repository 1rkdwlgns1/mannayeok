ALTER TABLE members
    ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0 AFTER age_confirmed_at;
