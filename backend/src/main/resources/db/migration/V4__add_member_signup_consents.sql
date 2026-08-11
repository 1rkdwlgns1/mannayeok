ALTER TABLE members
    ADD COLUMN terms_version VARCHAR(20) NULL AFTER email_verified,
    ADD COLUMN terms_agreed_at DATETIME(6) NULL AFTER terms_version,
    ADD COLUMN age_confirmed_at DATETIME(6) NULL AFTER terms_agreed_at;
