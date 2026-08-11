CREATE TABLE saved_recommendations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    name VARCHAR(60) NOT NULL,
    meeting_date DATE NULL,
    meeting_time TIME NULL,
    result_type VARCHAR(20) NOT NULL,
    payload MEDIUMTEXT NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    origin_names TEXT NOT NULL,
    station_lines VARCHAR(500) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_saved_recommendations_member_created (member_id, created_at),
    KEY idx_saved_recommendations_member_date (member_id, meeting_date),
    CONSTRAINT fk_saved_recommendations_member
        FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
);
