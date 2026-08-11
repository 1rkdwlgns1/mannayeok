CREATE TABLE shared_results (
    id BIGINT NOT NULL AUTO_INCREMENT,
    share_code VARCHAR(24) NOT NULL,
    result_type VARCHAR(20) NOT NULL,
    payload MEDIUMTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_shared_results_share_code (share_code)
);
