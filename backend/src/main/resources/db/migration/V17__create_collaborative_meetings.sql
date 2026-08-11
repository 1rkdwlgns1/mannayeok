CREATE TABLE collaborative_meetings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    owner_member_id BIGINT NOT NULL,
    source_saved_recommendation_id BIGINT NULL,
    invite_code VARCHAR(32) NOT NULL,
    name VARCHAR(60) NOT NULL,
    meeting_date DATE NULL,
    meeting_time TIME NULL,
    result_type VARCHAR(20) NOT NULL,
    payload MEDIUMTEXT NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    station_lines VARCHAR(500) NOT NULL,
    needs_recommendation BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_collaborative_meetings_invite_code (invite_code),
    UNIQUE KEY uk_collaborative_meetings_owner_source (owner_member_id, source_saved_recommendation_id),
    KEY idx_collaborative_meetings_owner (owner_member_id, updated_at),
    CONSTRAINT fk_collaborative_meetings_owner
        FOREIGN KEY (owner_member_id) REFERENCES members (id) ON DELETE CASCADE,
    CONSTRAINT fk_collaborative_meetings_source
        FOREIGN KEY (source_saved_recommendation_id) REFERENCES saved_recommendations (id) ON DELETE SET NULL
);

CREATE TABLE meeting_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    meeting_id BIGINT NOT NULL,
    nickname VARCHAR(20) NOT NULL,
    origin_name VARCHAR(150) NOT NULL,
    origin_address VARCHAR(255) NOT NULL,
    origin_lat DECIMAL(10, 7) NOT NULL,
    origin_lng DECIMAL(10, 7) NOT NULL,
    participant_token_hash CHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_meeting_participants_token_hash (participant_token_hash),
    UNIQUE KEY uk_meeting_participants_meeting_nickname (meeting_id, nickname),
    KEY idx_meeting_participants_meeting_created (meeting_id, created_at),
    CONSTRAINT fk_meeting_participants_meeting
        FOREIGN KEY (meeting_id) REFERENCES collaborative_meetings (id) ON DELETE CASCADE
);
