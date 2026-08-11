ALTER TABLE member_social_accounts
    ADD COLUMN refresh_token_ciphertext TEXT NULL AFTER provider_user_id;

ALTER TABLE oauth_login_tickets
    ADD COLUMN refresh_token_ciphertext TEXT NULL AFTER email;
