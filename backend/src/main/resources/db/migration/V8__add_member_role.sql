ALTER TABLE members
    ADD COLUMN role VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'USER' AFTER token_version;

UPDATE members
SET role = 'ADMIN'
WHERE LOWER(email) = '1rkdwlgns1@naver.com';
