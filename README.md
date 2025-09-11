# 📝 Question App - 질문하기 웹앱

React + PostgreSQL을 사용한 질문-답변 시스템입니다. 관리자가 회차를 생성하고, 멤버들이 질문을 등록하며, 답변자들이 답변할 수 있는 완전한 웹 애플리케이션입니다.

## 🏗️ 전체 아키텍처

```
question-app/
├── 🌐 Frontend (React + Vite)
├── ⚙️ Backend (Express + Vercel Serverless)
├── ☁️ Deployment (Vercel)
└── 📊 Database (Neon PostgreSQL)
```

## 📂 프로젝트 구조

### 🔧 루트 파일들

```
├── package.json          # 프로젝트 설정 및 의존성
├── vite.config.js        # Vite 빌드 설정
├── vercel.json          # Vercel 배포 설정
├── server.js            # 로컬 개발용 Express 서버 (통합 API)
├── .env.local           # 환경 변수 (Neon PostgreSQL 연결 정보)
├── SETUP.md            # 설정 가이드
└── scripts/
    └── init-database.js  # 데이터베이스 초기화 스크립트
```

### 🌐 Frontend (React)

```
src/
├── main.jsx             # React 앱 진입점
├── App.jsx              # 메인 앱 컴포넌트 (라우팅)
├── index.css            # 전역 스타일
├── components/          # React 컴포넌트들
│   ├── AdminPage.jsx        # 관리자 페이지 (회차/멤버/타겟 관리)
│   ├── QuestionForm.jsx     # 질문 작성 폼
│   ├── QuestionsList.jsx    # 질문 목록 (필터링 기능)
│   ├── AnswerPage.jsx       # 답변하기 페이지
│   ├── AnswerUrlPage.jsx    # 답변 URL 페이지
│   └── ErrorPage.jsx        # 에러 페이지
└── utils/               # 유틸리티 함수들
    ├── database.js          # PostgreSQL 연결 및 쿼리
    ├── questionSaver.js     # 질문 저장/로드 함수
    └── api.js               # 통합 API 호출 유틸리티
```

### 🔌 Backend API (통합 구조)

```
api/                     # Vercel 서버리스 함수들 (12개 제한)
├── admin.js            # 통합 관리자 API (711줄)
├── question.js         # 통합 질문 API
├── answer.js           # 통합 답변 API
└── answer/
    └── [questionId]/
        └── [randomCode].js  # 답변 URL 생성용
```

### 📁 기타 파일들

```
dist/                   # 빌드된 정적 파일들
├── index.html
└── assets/
    ├── index-*.css
    └── index-*.js

node_modules/           # 의존성 패키지들
```

## 🔌 API 리스트

### 📋 통합 API 구조 (Vercel 12개 제한 대응)

#### 1. **관리자 API** (`/api/admin`)
| Action | Method | 기능 | 설명 |
|--------|--------|------|------|
| `login` | GET | 관리자 로그인 | 비밀번호 인증 |
| `set-password` | POST | 관리자 비밀번호 설정 | 초기 비밀번호 설정 |
| `members` | GET/POST/PUT | 멤버 관리 | 조회/추가/비활성화 |
| `targets` | GET/POST | 답변자 관리 | 조회/추가 |
| `rounds` | GET/POST/DELETE | 회차 관리 | 조회/생성/삭제 |
| `passwords` | GET/POST | 답변자 비밀번호 | 조회/설정 |
| `generate-url` | POST | 답변 URL 생성 | 답변자별 URL 생성 |
| `unasked-members` | GET | 질문안함 멤버 | 특정 답변자에게 질문하지 않은 멤버 |
| `current-targets` | GET | 현재 활성 답변자 | 현재 회차의 답변자 목록 |
| `clear-data` | DELETE | 데이터 삭제 | 질문/답변/전체 데이터 삭제 |
| `init-db` | POST | DB 초기화 | 테이블 생성 및 기본 데이터 |

#### 2. **질문 API** (`/api/question`)
| Action | Method | 기능 | 설명 |
|--------|--------|------|------|
| `save` | POST | 질문 저장 | 새 질문 등록 |
| `get` | GET | 질문 조회 | 회차별 질문 목록 |

#### 3. **답변 API** (`/api/answer`)
| Action | Method | 기능 | 설명 |
|--------|--------|------|------|
| `auth` | GET/POST | 답변자 인증 | 비밀번호로 답변자 인증 |
| `save` | POST | 답변 저장 | 질문에 대한 답변 등록 |
| `qa` | GET | Q&A 조회 | 질문과 답변을 함께 조회 |

## 🗄️ 데이터베이스 테이블 구조

### 📊 테이블 목록

#### 1. **rounds** (회차)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | SERIAL | PRIMARY KEY | 회차 ID |
| `round_number` | INTEGER | UNIQUE, NOT NULL | 회차 번호 |
| `title` | VARCHAR(100) | NOT NULL | 회차 제목 |
| `description` | TEXT | | 회차 설명 |
| `is_active` | BOOLEAN | DEFAULT TRUE | 활성 회차 여부 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 시간 |

#### 2. **members** (멤버)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | SERIAL | PRIMARY KEY | 멤버 ID |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | 멤버 이름 |
| `is_active` | BOOLEAN | DEFAULT TRUE | 활성 멤버 여부 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 시간 |

#### 3. **targets** (답변자)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | SERIAL | PRIMARY KEY | 답변자 ID |
| `name` | VARCHAR(50) | NOT NULL | 답변자 이름 |
| `round_id` | INTEGER | REFERENCES rounds(id) | 회차 ID |
| `is_active` | BOOLEAN | DEFAULT TRUE | 활성 답변자 여부 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 시간 |

#### 4. **questions** (질문)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | SERIAL | PRIMARY KEY | 질문 ID |
| `author` | VARCHAR(50) | NOT NULL | 질문 작성자 |
| `target` | VARCHAR(50) | NOT NULL | 질문 대상자 |
| `question` | TEXT | NOT NULL | 질문 내용 |
| `round_id` | INTEGER | REFERENCES rounds(id) | 회차 ID |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 시간 |

#### 5. **answers** (답변)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | SERIAL | PRIMARY KEY | 답변 ID |
| `question_id` | INTEGER | REFERENCES questions(id) | 질문 ID |
| `answerer` | VARCHAR(50) | NOT NULL | 답변자 |
| `answer` | TEXT | NOT NULL | 답변 내용 |
| `round_id` | INTEGER | REFERENCES rounds(id) | 회차 ID |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 시간 |
| UNIQUE(question_id, answerer) | | | 질문당 답변자별 유니크 |

#### 6. **answerer_passwords** (답변자 비밀번호)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | SERIAL | PRIMARY KEY | 비밀번호 ID |
| `answerer_name` | VARCHAR(50) | UNIQUE, NOT NULL | 답변자 이름 |
| `password` | VARCHAR(10) | NOT NULL | 4자리 비밀번호 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 시간 |

#### 7. **admin_auth** (관리자 인증)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | INTEGER | PRIMARY KEY | 관리자 ID (고정값: 1) |
| `password` | VARCHAR(255) | NOT NULL | 관리자 비밀번호 |

## 🔄 시스템 동작 방식

### 1. **관리자 워크플로우**
```
1. 관리자 로그인 (/admin)
2. 새 회차 생성 (회차 번호 자동 증가)
3. 멤버 추가/관리
4. 답변자 추가 (현재 회차에 자동 연결)
5. 답변자별 비밀번호 생성
6. Q&A 조회 및 관리
```

### 2. **질문자 워크플로우**
```
1. 질문 작성 페이지 접속 (/question)
2. 현재 활성 회차의 답변자 목록 확인
3. 답변자 선택 및 질문 작성
4. 질문 저장 (현재 회차에 자동 연결)
```

### 3. **답변자 워크플로우**
```
1. 답변 URL 접속 (/answer/[답변자명])
2. 4자리 비밀번호로 인증
3. 자신에게 온 질문 목록 확인
4. 질문별 답변 작성 및 저장
```

### 4. **데이터 흐름**
```
Frontend (React) ↔ API (Express/Vercel) ↔ Database (PostgreSQL)
     ↓                    ↓                        ↓
- 컴포넌트 렌더링      - 통합 API 처리          - 데이터 영속성
- 상태 관리           - 비즈니스 로직          - 관계형 데이터
- 사용자 인터랙션      - 인증/권한 관리         - 트랜잭션 처리
```

## 🛠️ 기술 스택

### Frontend
- **React 18** - UI 프레임워크
- **Vite** - 빌드 도구 및 개발 서버
- **React Router DOM** - 클라이언트 라우팅
- **CSS3** - 스타일링 (반응형 디자인)

### Backend
- **Express.js** - 로컬 개발 서버
- **Vercel Serverless Functions** - 프로덕션 API (12개 제한)
- **@vercel/postgres** - PostgreSQL 연결 라이브러리
- **PostgreSQL** - 관계형 데이터베이스
- **Neon** - PostgreSQL 클라우드 호스팅

### 개발 도구
- **dotenv** - 환경 변수 관리
- **cors** - CORS 설정
- **concurrently** - 동시 서버 실행
- **ES6+** - 모던 JavaScript

## 🚀 실행 방법

### 로컬 개발 (권장)
```bash
# 의존성 설치
npm install

# 프론트엔드 + 백엔드 동시 실행
npm run dev:full
```

### 개별 실행
```bash
# 프론트엔드만 실행 (포트 5173)
npm run dev

# 백엔드만 실행 (포트 3001)
npm run server

# 데이터베이스 초기화
npm run init-db
```

### 프로덕션 빌드
```bash
# 정적 파일 빌드
npm run build

# 빌드된 파일 미리보기
npm run preview
```

## ✨ 주요 기능

### 🔐 관리자 기능
1. **회차 관리** - 새 회차 생성, 회차 번호 자동 증가
2. **멤버 관리** - 질문자 추가/비활성화
3. **답변자 관리** - 답변자 추가/관리
4. **비밀번호 관리** - 답변자별 4자리 비밀번호 생성
5. **Q&A 조회** - 질문과 답변을 함께 조회
6. **통계 조회** - 질문안함 멤버 수, 답변 현황 등

### 📝 질문자 기능
1. **질문 작성** - 현재 활성 회차의 답변자에게 질문
2. **질문 목록** - 답변자별 필터링된 질문 목록
3. **실시간 업데이트** - 새 질문 즉시 반영

### 💬 답변자 기능
1. **비밀번호 인증** - 4자리 비밀번호로 보안 인증
2. **질문 조회** - 자신에게 온 질문만 필터링
3. **답변 작성** - 질문별 답변 등록/수정
4. **답변 URL** - 개인별 고유 답변 페이지

## 🌐 페이지 구조

| 경로 | 컴포넌트 | 기능 | 접근 권한 |
|------|----------|------|-----------|
| `/` | App.jsx | 메인 페이지 (리다이렉트) | 모든 사용자 |
| `/question` | QuestionForm | 질문 작성 | 모든 사용자 |
| `/admin` | AdminPage | 관리자 페이지 | 관리자만 |
| `/answer` | AnswerPage | 답변하기 (목록) | 모든 사용자 |
| `/answer/[답변자명]` | AnswerUrlPage | 개인 답변 페이지 | 비밀번호 인증 |
| `/*` | ErrorPage | 404 에러 페이지 | 모든 사용자 |

## 🔧 설정

### 환경 변수 (.env.local)
```env
# Neon PostgreSQL 연결 정보
POSTGRES_URL=postgresql://username:password@host:port/database
POSTGRES_PRISMA_URL=postgresql://username:password@host:port/database?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://username:password@host:port/database
POSTGRES_USER=username
POSTGRES_HOST=host
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=database
```

### 데이터베이스 초기화
```bash
# 데이터베이스 테이블 생성 및 기본 데이터 삽입
npm run init-db
```

## 📦 Vercel 배포

### 1. GitHub 연동
```bash
# 코드 푸시
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Vercel 설정
1. [Vercel](https://vercel.com)에서 GitHub 저장소 연결
2. 환경 변수 설정 (Neon PostgreSQL 연결 정보)
3. 자동 배포 완료

### 3. 배포 후 설정
1. 관리자 비밀번호 설정 (기본값: 1234)
2. 첫 번째 회차 생성
3. 멤버 및 답변자 추가

## 🎯 사용 방법

### 👨‍💼 관리자
1. **로그인**: `/admin` 페이지에서 관리자 비밀번호 입력
2. **회차 생성**: 새 회차 생성 (회차 번호 자동 증가)
3. **멤버 관리**: 질문자 추가/비활성화
4. **답변자 관리**: 답변자 추가 및 비밀번호 생성
5. **Q&A 조회**: 질문과 답변을 함께 조회

### 👥 질문자
1. **질문 작성**: `/question` 페이지에서 답변자 선택 및 질문 작성
2. **질문 목록**: 답변자별로 필터링된 질문 목록 확인

### 💬 답변자
1. **답변 접속**: 개인 답변 URL (`/answer/[답변자명]`) 접속
2. **인증**: 4자리 비밀번호로 인증
3. **답변 작성**: 자신에게 온 질문에 답변 작성

## 🔒 보안 기능

- **관리자 인증**: 관리자 전용 기능 보호
- **답변자 인증**: 4자리 비밀번호로 답변자 인증
- **회차별 격리**: 각 회차의 데이터 독립성
- **CORS 설정**: 안전한 API 접근 제어

## 📊 성능 최적화

- **통합 API**: Vercel 12개 함수 제한 대응
- **서버리스**: 자동 스케일링 및 비용 최적화
- **PostgreSQL**: 관계형 데이터베이스로 데이터 무결성 보장
- **React 최적화**: 컴포넌트 기반 아키텍처

---

**이 구조로 확장 가능하고 유지보수가 쉬운 질문-답변 시스템을 구축했습니다!** 🎉

### 📞 지원
- **로컬 개발**: `npm run dev:full`
- **프로덕션**: Vercel 자동 배포
- **데이터베이스**: Neon PostgreSQL 클라우드
