# 만나역 백엔드

React/Vite 프런트엔드는 `frontend`에서, Spring Boot 백엔드는 이
디렉터리에서 별도로 관리합니다.

## 현재 범위

- Java 17 / Spring Boot 3.5
- `GET /api/health`
- `GET /api/transit/routes`
- `POST /api/auth/signup`
- `POST /api/auth/email-availability`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PUT /api/members/me/password`
- `DELETE /api/members/me`
- 서울교통공사 최단경로이동정보 API 프록시
- 공공 API의 역별 상세 경로를 화면용 경로 단계로 압축
- MySQL / JPA / Flyway 회원 스키마
- BCrypt 비밀번호 암호화와 JWT 액세스 토큰
- 이메일 비밀번호 재설정과 계정 관리

## 환경변수

`backend/.env.example`을 참고해 DB 접속 정보와 외부 API 키를 설정합니다.
`JWT_SECRET`은 운영 환경에서 32바이트 이상의 임의 문자열로 반드시
교체해야 합니다. 비밀번호와 키는 Git에 커밋하지 마세요.

PowerShell 예시:

```powershell
$env:SUBWAY_API_SERVICE_KEY='발급받은 Decoding 인증키'
$env:FRONTEND_ALLOWED_ORIGINS='http://localhost:5173'
$env:DB_URL='jdbc:mysql://localhost:3306/mannayeok?serverTimezone=Asia/Seoul&characterEncoding=UTF-8'
$env:DB_USERNAME='mannayeok'
$env:DB_PASSWORD='로컬 DB 비밀번호'
$env:JWT_SECRET='32바이트 이상의 임의 문자열'
$env:MAIL_ENABLED='true'
$env:MAIL_USERNAME='mannayeok.help@gmail.com'
$env:MAIL_PASSWORD='Gmail 앱 비밀번호'
$env:MAIL_FROM='mannayeok.help@gmail.com'
$env:FRONTEND_BASE_URL='http://localhost:5173'
```

로컬 개발에서는 `application-local.properties.example`을
`application-local.properties`로 복사한 뒤 실제 값을 입력할 수 있습니다.
이 파일은 Git에서 제외됩니다.

## 실행

```powershell
.\gradlew.bat bootRun
.\gradlew.bat test --no-daemon
.\gradlew.bat bootJar --no-daemon
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

회원가입:

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password1",
  "termsAccepted": true,
  "privacyAccepted": true,
  "ageConfirmed": true
}
```

`/api/members/**` 요청에는 로그인 응답으로 받은 액세스 토큰을 전달합니다.

```http
Authorization: Bearer {accessToken}
```

현재는 Refresh Token 없이 액세스 토큰만 사용합니다. 비밀번호를 변경하거나
회원을 탈퇴하면 기존 액세스 토큰은 더 이상 사용할 수 없습니다.

로그인:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password1"
}
```
