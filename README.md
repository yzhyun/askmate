# 📝 Question App - 질문하기 웹앱

React + PostgreSQL을 사용한 질문-답변 시스템입니다. 사용자가 질문을 등록하고, 대상자별로 필터링하여 답변할 수 있습니다.

## 🏗️ 전체 아키텍처

```
question-app/
├── 🌐 Frontend (React + Vite)
├── ⚙️ Backend (Express + PostgreSQL)
├── ☁️ Deployment (Vercel)
└── 📊 Database (Neon PostgreSQL)
```

## 📂 프로젝트 구조

### 🔧 루트 파일들

```
├── package.json          # 프로젝트 설정 및 의존성
├── vite.config.js        # Vite 빌드 설정
├── vercel.json          # Vercel 배포 설정
├── server.js            # 로컬 개발용 Express 서버
├── schema.sql           # PostgreSQL 데이터베이스 스키마
├── .env.local           # 환경 변수 (Neon PostgreSQL 연결 정보)
└── SETUP.md            # 설정 가이드
```

### 🌐 Frontend (React)

```
src/
├── main.jsx             # React 앱 진입점
├── App.jsx              # 메인 앱 컴포넌트 (라우팅)
├── index.css            # 전역 스타일
├── components/          # React 컴포넌트들
│   ├── QuestionForm.jsx     # 질문 작성 폼
│   ├── QuestionsList.jsx    # 질문 목록 (필터링 기능)
│   └── AnswerPage.jsx       # 답변하기 페이지
└── utils/               # 유틸리티 함수들
    ├── database.js          # PostgreSQL 연결 및 쿼리
    └── questionSaver.js     # 질문 저장/로드 함수
```

### 🔌 Backend API

```
api/                     # Vercel 서버리스 함수들
├── save-question.js     # 질문 저장 API
├── get-questions.js     # 질문 조회 API
├── clear-questions.js   # 질문 삭제 API
└── save-answer.js       # 답변 저장 API
```

### 📁 기타 파일들

```
public/                  # 정적 파일들
├── names.txt           # 질문 대상자 목록
├── question.txt        # (레거시) 질문 저장 파일
└── answer.txt          # (레거시) 답변 저장 파일

scripts/                # 유틸리티 스크립트
└── fileHandler.js      # 파일 처리 스크립트
```

## 🔄 데이터 흐름

### 1. 질문 작성

```
사용자 → QuestionForm → API → PostgreSQL
```

### 2. 질문 조회

```
PostgreSQL → API → QuestionsList → 사용자
```

### 3. 답변 작성

```
사용자 → AnswerPage → API → PostgreSQL
```

## 🛠️ 기술 스택

### Frontend

- **React 18** - UI 프레임워크
- **Vite** - 빌드 도구
- **React Router DOM** - 클라이언트 라우팅
- **CSS3** - 스타일링

### Backend

- **Express.js** - 로컬 개발 서버
- **Vercel Serverless Functions** - 프로덕션 API
- **PostgreSQL** - 데이터베이스
- **Neon** - PostgreSQL 호스팅

### 개발 도구

- **dotenv** - 환경 변수 관리
- **cors** - CORS 설정
- **concurrently** - 동시 서버 실행

## 🚀 실행 방법

### 로컬 개발

```bash
npm install
npm run dev:full    # 프론트엔드 + 백엔드 동시 실행
```

### 개별 실행

```bash
npm run dev         # Vite 개발 서버 (포트 5173)
npm run server      # Express 서버 (포트 3001)
```

## 📊 데이터베이스 스키마

### questions 테이블

- `id` - 기본키
- `author` - 질문 작성자
- `target` - 질문 대상자
- `question` - 질문 내용
- `created_at` - 생성 시간

### answers 테이블

- `id` - 기본키
- `question_id` - 질문 ID (외래키)
- `answerer` - 답변자
- `answer` - 답변 내용
- `created_at` - 생성 시간

## ✨ 주요 기능

1. **질문 작성** - 대상자 선택 및 질문 등록
2. **질문 목록** - 대상자별 필터링
3. **답변 작성** - 질문에 대한 답변 등록
4. **데이터 영속성** - PostgreSQL에 안전하게 저장

## 🌐 페이지 구조

- **`/question`** - 질문 작성 페이지
- **`/answer`** - 답변하기 페이지
- **`/`** - 자동으로 `/question`으로 리다이렉트

## 🔧 설정

### 환경 변수 (.env.local)

```env
POSTGRES_URL=postgresql://username:password@host:port/database
POSTGRES_PRISMA_URL=postgresql://username:password@host:port/database?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://username:password@host:port/database
POSTGRES_USER=username
POSTGRES_HOST=host
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=database
```

## 📦 Vercel 배포

1. GitHub에 코드 푸시
2. Vercel에서 GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포 완료

## 🎯 사용 방법

1. **질문하기**: `/question` 페이지에서 대상자를 선택하고 질문 작성
2. **답변하기**: `/answer` 페이지에서 대상자별로 필터링하여 답변 작성
3. **질문 목록**: 작성된 질문들을 대상자별로 필터링하여 확인

이 구조로 확장 가능하고 유지보수가 쉬운 질문-답변 시스템을 구축했습니다! 🎉
