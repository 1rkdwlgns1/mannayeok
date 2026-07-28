# 만나역 백엔드

기존 React/Vite 프런트엔드는 저장소 루트에 유지하고, 이 디렉터리에서
Spring Boot 백엔드를 별도로 관리합니다.

## 현재 범위

- Java 17 / Spring Boot 3.5
- `GET /api/health`
- `GET /api/transit/routes`
- 서울교통공사 최단경로이동정보 API 프록시
- 공공 API의 역별 상세 경로를 화면용 경로 단계로 압축
- MySQL 드라이버 준비

회원, 약속, 로그인 및 JPA/Flyway 설정은 다음 단계에서 MySQL 스키마와
인증 방식을 확정한 뒤 추가합니다.

## 환경변수

`SUBWAY_API_SERVICE_KEY`에는 공공데이터포털의 일반 인증키(Decoding)를
설정합니다. 키를 Git에 커밋하지 마세요.

PowerShell 예시:

```powershell
$env:SUBWAY_API_SERVICE_KEY='발급받은 Decoding 인증키'
$env:FRONTEND_ALLOWED_ORIGINS='http://localhost:5173'
```

## 실행

Gradle 7.6.4 이상 또는 8.4 이상이 필요합니다.

```powershell
gradle bootRun
```

## API 예시

```text
GET http://localhost:8080/api/transit/routes?departure=인천역&arrival=가산디지털단지역
```

`departureAt`을 생략하면 서울 기준 현재 시각을 사용합니다. 직접 지정할
경우 ISO 형식으로 전달합니다.

```text
departureAt=2026-07-28T20:10:00
searchType=duration
```
