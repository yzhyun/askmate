# PostgreSQL 설정 가이드

## 1. 로컬 PostgreSQL 설치

### macOS (Homebrew 사용)

```bash
brew install postgresql
brew services start postgresql
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

[PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 다운로드

## 2. 데이터베이스 생성

```bash
# PostgreSQL에 접속
psql postgres

# 데이터베이스 생성
CREATE DATABASE question_app;

# 사용자 생성 (선택사항)
CREATE USER question_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE question_app TO question_user;

# 종료
\q
```

## 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
# 로컬 PostgreSQL 설정
POSTGRES_URL=postgresql://username:password@localhost:5432/question_app
POSTGRES_PRISMA_URL=postgresql://username:password@localhost:5432/question_app?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://username:password@localhost:5432/question_app
POSTGRES_USER=username
POSTGRES_HOST=localhost
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=question_app
```

**주의**: `username`, `password`를 실제 PostgreSQL 사용자 정보로 변경하세요.

## 4. 스키마 실행

```bash
# 스키마 파일 실행
psql -d question_app -f schema.sql
```

## 5. 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev:full
```

## 6. Vercel Postgres 설정 (배포 시)

1. Vercel 대시보드에서 프로젝트 선택
2. Settings → Environment Variables
3. 다음 변수들 추가:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

## 문제 해결

### 연결 오류

- PostgreSQL 서비스가 실행 중인지 확인
- 방화벽 설정 확인
- 사용자 권한 확인

### 스키마 오류

- 데이터베이스가 존재하는지 확인
- 사용자 권한 확인
- 스키마 파일 경로 확인
