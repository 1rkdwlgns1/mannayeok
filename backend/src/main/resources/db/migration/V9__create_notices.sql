CREATE TABLE notices (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(120) NOT NULL,
    status VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    summary VARCHAR(500) NOT NULL,
    details TEXT NOT NULL,
    note VARCHAR(500) NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_notices_public_order (published, published_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO notices (title, status, summary, details, note, published, published_at, created_at, updated_at)
VALUES
    ('지하철 경로 조회 오류 조치 안내', 'RESOLVED', '일부 구간에서 지하철 이동시간이 ‘확인 불가’로 표시되는 오류를 조치했습니다.', '공공데이터 조회 과정의 형식 오류를 확인했습니다.\n공식 역 코드를 기준으로 경로를 조회하도록 연결 방식을 개선했습니다.', '추천 알고리즘과 점수 계산식은 변경하지 않았습니다.', TRUE, '2026-08-03 00:00:00.000000', NOW(6), NOW(6)),
    ('만나역 베타 서비스 이용 안내', 'INFO', '만나역은 더 편리하고 정확한 약속역 추천을 위해 베타 서비스로 운영되고 있습니다.', '서비스 이용 중 일부 기능과 화면이 변경될 수 있습니다.\n발견된 오류와 개선 의견은 순차적으로 서비스에 반영합니다.', '이용 중 불편한 점은 문의하기를 통해 알려주세요.', TRUE, '2026-08-01 00:00:00.000000', NOW(6), NOW(6)),
    ('현재 지원 지역 안내', 'INFO', '현재 만나역은 수도권 전철망을 이용할 수 있는 지역의 출발지와 역 추천을 지원합니다.', '수도권 전철역과 주변 지역을 기준으로 검색할 수 있습니다.\n제주도·울릉도·독도는 현재 출발지 검색을 지원하지 않습니다.', '지원 범위는 데이터 제공 상황과 안정성을 확인하며 확대할 예정입니다.', TRUE, '2026-08-01 00:00:00.000000', NOW(6), NOW(6));
