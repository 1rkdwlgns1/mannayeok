ALTER TABLE members
    ADD COLUMN privacy_agreed_at DATETIME(6) NULL AFTER terms_agreed_at;
