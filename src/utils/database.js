import { sql } from "@vercel/postgres";

// 환경에 따른 데이터베이스 연결 설정
function getDbConfig() {
  if (process.env.NODE_ENV === "development") {
    // 로컬 개발 환경
    return {
      connectionString:
        process.env.POSTGRES_URL ||
        "postgresql://username:password@localhost:5432/question_app",
    };
  } else {
    // Vercel 프로덕션 환경
    return {
      connectionString: process.env.POSTGRES_URL,
    };
  }
}

// 질문 저장 (현재 활성 회차에 저장)
export async function saveQuestion(author, target, question) {
  try {
    // 현재 활성 회차 조회
    const currentRound = await getCurrentActiveRound();
    if (!currentRound) {
      throw new Error("활성 회차가 없습니다.");
    }

    const result = await sql`
      INSERT INTO questions (author, target, question, round_id)
      VALUES (${author}, ${target}, ${question}, ${currentRound.id})
      RETURNING id, author, target, question, round_id, created_at
    `;
    return result.rows[0];
  } catch (error) {
    console.error("질문 저장 오류:", error);
    throw error;
  }
}

// 모든 질문 조회 (현재 활성 회차만)
export async function getAllQuestions() {
  try {
    return await getCurrentRoundQuestions();
  } catch (error) {
    console.error("질문 조회 오류:", error);
    throw error;
  }
}

// 특정 대상자에게 한 질문 조회
export async function getQuestionsByTarget(target) {
  try {
    const result = await sql`
      SELECT id, author, target, question, created_at
      FROM questions
      WHERE target = ${target}
      ORDER BY created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("대상자별 질문 조회 오류:", error);
    throw error;
  }
}

// 질문 삭제 (모든 질문)
export async function clearAllQuestions() {
  try {
    await sql`DELETE FROM questions`;
    return { success: true };
  } catch (error) {
    console.error("질문 삭제 오류:", error);
    throw error;
  }
}

// 답변 저장
export async function saveAnswer(questionId, answerer, answer) {
  try {
    // 현재 활성 회차 조회
    const currentRound = await getCurrentActiveRound();
    if (!currentRound) {
      throw new Error("활성 회차가 없습니다.");
    }

    const result = await sql`
      INSERT INTO answers (question_id, answerer, answer, round_id)
      VALUES (${questionId}, ${answerer}, ${answer}, ${currentRound.id})
      RETURNING id, question_id, answerer, answer, round_id, created_at
    `;
    return result.rows[0];
  } catch (error) {
    console.error("답변 저장 오류:", error);
    throw error;
  }
}

// 질문과 답변 함께 조회
export async function getQuestionsWithAnswers() {
  try {
    const result = await sql`
      SELECT 
        q.id, q.author, q.target, q.question, q.created_at as question_created_at,
        a.id as answer_id, a.answerer, a.answer, a.created_at as answer_created_at
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      ORDER BY q.created_at DESC, a.created_at ASC
    `;
    return result.rows;
  } catch (error) {
    console.error("질문과 답변 조회 오류:", error);
    throw error;
  }
}

// 회원 관련 함수들 (단순한 명단용)

// 모든 회원 목록 조회 (질문 작성자 선택용)
export async function getAllMembers() {
  try {
    const result = await sql`
      SELECT id, name, is_active FROM members 
      WHERE is_active = true
      ORDER BY name
    `;
    return result.rows;
  } catch (error) {
    console.error("회원 목록 조회 오류:", error);
    throw error;
  }
}

// 특정 회원이 질문했는지 체크
export async function hasMemberAskedQuestion(memberName) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE author = ${memberName}
    `;
    return result.rows[0].count > 0;
  } catch (error) {
    console.error("질문 여부 체크 오류:", error);
    throw error;
  }
}

// 회원 추가
export async function addMember(name) {
  try {
    const result = await sql`
      INSERT INTO members (name) VALUES (${name}) 
      RETURNING id, name
    `;
    return result.rows[0];
  } catch (error) {
    console.error("회원 추가 오류:", error);
    throw error;
  }
}

// 회원 비활성화
export async function deactivateMember(id) {
  try {
    await sql`
      UPDATE members SET is_active = false WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error("회원 비활성화 오류:", error);
    throw error;
  }
}

// 대상자 목록 조회
export async function getAllTargets() {
  try {
    const result = await sql`
      SELECT id, name, round_id, is_active FROM targets ORDER BY name
    `;
    return result.rows;
  } catch (error) {
    console.error("대상자 조회 오류:", error);
    throw error;
  }
}

// 특정 회차의 답변자 조회
export async function getTargetsByRound(roundId) {
  try {
    const result = await sql`
      SELECT id, name, round_id, is_active 
      FROM targets 
      WHERE round_id = ${roundId}
      ORDER BY name
    `;
    return result.rows;
  } catch (error) {
    console.error("회차별 답변자 조회 오류:", error);
    throw error;
  }
}

// 현재 활성 회차의 답변자 조회
export async function getCurrentActiveRoundTargets() {
  try {
    const currentRound = await getCurrentActiveRound();
    if (!currentRound) {
      return [];
    }

    const result = await sql`
      SELECT id, name, round_id, is_active 
      FROM targets 
      WHERE round_id = ${currentRound.id} AND is_active = true
      ORDER BY name
    `;
    return result.rows;
  } catch (error) {
    console.error("현재 활성 회차 답변자 조회 오류:", error);
    throw error;
  }
}

// 회차에 속하지 않은 답변자들을 현재 활성 회차로 이동
export async function moveOrphanTargetsToActiveRound() {
  try {
    const activeRound = await getCurrentActiveRound();
    if (!activeRound) {
      return { success: false, message: "활성 회차가 없습니다." };
    }

    const result = await sql`
      UPDATE targets 
      SET round_id = ${activeRound.id}
      WHERE round_id IS NULL
      RETURNING id, name
    `;

    return {
      success: true,
      message: `${result.rows.length}명의 답변자가 현재 활성 회차로 이동되었습니다.`,
      movedTargets: result.rows,
    };
  } catch (error) {
    console.error("고아 답변자 이동 오류:", error);
    throw error;
  }
}

// 대상자 추가 (현재 활성 회차에만)
export async function addTarget(name) {
  try {
    // 현재 활성 회차 조회
    const currentRound = await getCurrentActiveRound();
    if (!currentRound) {
      throw new Error("활성 회차가 없습니다.");
    }

    const result = await sql`
      INSERT INTO targets (name, round_id) 
      VALUES (${name}, ${currentRound.id}) 
      RETURNING id, name, round_id
    `;
    return result.rows[0];
  } catch (error) {
    console.error("대상자 추가 오류:", error);
    throw error;
  }
}

// 대상자 비활성화
export async function deactivateTarget(name) {
  try {
    await sql`
      UPDATE targets SET is_active = false WHERE name = ${name}
    `;
    return { success: true };
  } catch (error) {
    console.error("대상자 비활성화 오류:", error);
    throw error;
  }
}

// 답변자 비밀번호 설정
export async function setAnswererPassword(answererName, password) {
  try {
    const result = await sql`
      INSERT INTO answerer_passwords (answerer_name, password)
      VALUES (${answererName}, ${password})
      ON CONFLICT (answerer_name) 
      DO UPDATE SET 
        password = EXCLUDED.password,
        created_at = NOW()
      RETURNING id, answerer_name, password, created_at
    `;
    return result.rows[0];
  } catch (error) {
    console.error("답변자 비밀번호 설정 오류:", error);
    throw error;
  }
}

// 답변자 비밀번호 검증
export async function verifyAnswererPassword(answererName, password) {
  try {
    const result = await sql`
      SELECT id, answerer_name, password
      FROM answerer_passwords
      WHERE answerer_name = ${answererName} AND password = ${password}
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error("답변자 비밀번호 검증 오류:", error);
    throw error;
  }
}

// 답변자 비밀번호 조회
export async function getAnswererPassword(answererName) {
  try {
    const result = await sql`
      SELECT password
      FROM answerer_passwords
      WHERE answerer_name = ${answererName}
    `;
    return result.rows[0]?.password || null;
  } catch (error) {
    console.error("답변자 비밀번호 조회 오류:", error);
    throw error;
  }
}

// 질문 가시성 관리 함수들

// 특정 답변자의 모든 질문을 hidden 처리
export async function hideQuestionsForTarget(targetName) {
  try {
    // 먼저 해당 답변자에게 온 모든 질문의 가시성 레코드 생성
    await sql`
      INSERT INTO question_visibility (question_id, target_name, is_hidden, hidden_at)
      SELECT q.id, q.target, true, NOW()
      FROM questions q
      WHERE q.target = ${targetName}
      AND NOT EXISTS (
        SELECT 1 FROM question_visibility qv 
        WHERE qv.question_id = q.id AND qv.target_name = q.target
      )
    `;

    // 기존 레코드가 있다면 hidden으로 업데이트
    await sql`
      UPDATE question_visibility 
      SET is_hidden = true, hidden_at = NOW()
      WHERE target_name = ${targetName} AND is_hidden = false
    `;

    return true;
  } catch (error) {
    console.error("질문 hidden 처리 오류:", error);
    throw error;
  }
}

// 특정 답변자의 모든 질문을 visible 처리
export async function showQuestionsForTarget(targetName) {
  try {
    await sql`
      UPDATE question_visibility 
      SET is_hidden = false, hidden_at = NULL
      WHERE target_name = ${targetName}
    `;
    return true;
  } catch (error) {
    console.error("질문 visible 처리 오류:", error);
    throw error;
  }
}

// 답변자에게 온 질문들 조회 (hidden 상태 고려)
export async function getQuestionsForAnswerer(targetName) {
  try {
    const result = await sql`
      SELECT q.id, q.target, q.question, q.created_at
      FROM questions q
      WHERE q.target = ${targetName}
      ORDER BY q.created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("답변자 질문 조회 오류:", error);
    throw error;
  }
}

// 관리자 인증 함수들

// 관리자 비밀번호 설정
export async function setAdminPassword(password) {
  try {
    // 기존 비밀번호가 있으면 업데이트, 없으면 새로 생성
    const result = await sql`
      INSERT INTO admin_auth (password)
      VALUES (${password})
      ON CONFLICT (id) 
      DO UPDATE SET password = ${password}, created_at = NOW()
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error("관리자 비밀번호 설정 오류:", error);
    throw error;
  }
}

// 관리자 비밀번호 검증
export async function verifyAdminPassword(password) {
  try {
    const result = await sql`
      SELECT id FROM admin_auth 
      WHERE password = ${password}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error("관리자 비밀번호 검증 오류:", error);
    throw error;
  }
}

// 관리자 비밀번호 조회
export async function getAdminPassword() {
  try {
    const result = await sql`
      SELECT password FROM admin_auth 
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return result.rows[0]?.password || null;
  } catch (error) {
    console.error("관리자 비밀번호 조회 오류:", error);
    throw error;
  }
}

// 기존 외래키 제약조건 제거
export async function dropForeignKeys() {
  try {
    // 기존 외래키 제약조건들을 제거 (테이블이 존재하지 않을 수 있으므로 try-catch로 감쌈)
    try {
      await sql`ALTER TABLE questions DROP CONSTRAINT IF EXISTS fk_questions_round_id`;
    } catch (e) {
      console.log("questions 테이블이 존재하지 않거나 외래키가 없습니다.");
    }

    try {
      await sql`ALTER TABLE answers DROP CONSTRAINT IF EXISTS fk_answers_round_id`;
    } catch (e) {
      console.log("answers 테이블이 존재하지 않거나 외래키가 없습니다.");
    }

    try {
      await sql`ALTER TABLE answers DROP CONSTRAINT IF EXISTS fk_answers_question_id`;
    } catch (e) {
      console.log("answers 테이블이 존재하지 않거나 외래키가 없습니다.");
    }

    console.log("외래키 제약조건 제거 시도 완료.");
    return { success: true };
  } catch (error) {
    console.error("외래키 제약조건 제거 오류:", error);
    throw error;
  }
}

// question_visibility 테이블 삭제
export async function dropQuestionVisibilityTable() {
  try {
    await sql`DROP TABLE IF EXISTS question_visibility`;
    console.log("question_visibility 테이블이 삭제되었습니다.");
    return { success: true };
  } catch (error) {
    console.error("question_visibility 테이블 삭제 오류:", error);
    throw error;
  }
}

// 모든 외래키 강제 제거
export async function forceDropAllForeignKeys() {
  try {
    // 모든 테이블의 외래키 제약조건을 강제로 제거
    const constraints = [
      "fk_questions_round_id",
      "fk_answers_round_id",
      "fk_answers_question_id",
      "fk_targets_round_id",
      "fk_question_visibility_question_id",
    ];

    for (const constraint of constraints) {
      try {
        await sql`ALTER TABLE questions DROP CONSTRAINT IF EXISTS ${constraint}`;
        await sql`ALTER TABLE answers DROP CONSTRAINT IF EXISTS ${constraint}`;
        await sql`ALTER TABLE targets DROP CONSTRAINT IF EXISTS ${constraint}`;
        await sql`ALTER TABLE question_visibility DROP CONSTRAINT IF EXISTS ${constraint}`;
      } catch (err) {
        // 개별 제약조건 제거 실패는 무시
        console.log(`제약조건 ${constraint} 제거 시도 완료`);
      }
    }

    console.log("모든 외래키 제약조건이 강제로 제거되었습니다.");
    return { success: true };
  } catch (error) {
    console.error("외래키 강제 제거 오류:", error);
    throw error;
  }
}

// 모든 테이블 삭제 (members 제외)
export async function dropAllTablesExceptMembers() {
  try {
    // members 테이블을 제외한 모든 테이블 삭제
    const tables = [
      "targets",
      "questions",
      "answers",
      "answerer_passwords",
      "admin_auth",
      "rounds",
      "question_visibility",
    ];

    for (const table of tables) {
      try {
        await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`테이블 ${table} 삭제 완료`);
      } catch (err) {
        console.log(`테이블 ${table} 삭제 시도 완료`);
      }
    }

    console.log("모든 테이블이 삭제되었습니다 (members 제외).");
    return { success: true };
  } catch (error) {
    console.error("테이블 삭제 오류:", error);
    throw error;
  }
}

// targets 테이블에 round_id 컬럼 추가
export async function addRoundIdToTargets() {
  try {
    // round_id 컬럼이 없으면 추가
    await sql`ALTER TABLE targets ADD COLUMN IF NOT EXISTS round_id INTEGER`;

    // 기존 targets 데이터에 현재 활성 회차 ID 설정
    const activeRound = await getCurrentActiveRound();
    if (activeRound) {
      await sql`UPDATE targets SET round_id = ${activeRound.id} WHERE round_id IS NULL`;
    }

    console.log("targets 테이블에 round_id 컬럼이 추가되었습니다.");
    return { success: true };
  } catch (error) {
    console.error("targets 테이블 수정 오류:", error);
    throw error;
  }
}

// 테이블 존재 여부 확인
export async function checkTableExists(tableName) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    return result.rows[0].exists;
  } catch (error) {
    console.error(`테이블 ${tableName} 존재 확인 오류:`, error);
    return false;
  }
}

// 데이터베이스 초기화 (테이블 생성)
export async function initializeDatabase() {
  try {
    // 먼저 기존 외래키 제약조건 제거
    await dropForeignKeys();

    // 스키마 파일의 내용을 실행
    const schema = `
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS targets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        round_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, round_id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        author VARCHAR(100) NOT NULL,
        target VARCHAR(100) NOT NULL,
        question TEXT NOT NULL,
        round_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER,
        answerer VARCHAR(100) NOT NULL,
        answer TEXT NOT NULL,
        round_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS answerer_passwords (
  id SERIAL PRIMARY KEY,
  answerer_name VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS admin_auth (
  id SERIAL PRIMARY KEY,
  password VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  round_number INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

      CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
      CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active);
      CREATE INDEX IF NOT EXISTS idx_targets_name ON targets(name);
      CREATE INDEX IF NOT EXISTS idx_targets_active ON targets(is_active);
      CREATE INDEX IF NOT EXISTS idx_questions_target ON questions(target);
      CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
      CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

      INSERT INTO members (name) VALUES 
        ('문지영'),
        ('박영은'),
        ('오동환'),
        ('김형기'),
        ('공성원'),
        ('윤지현'),
        ('안영훈'),
        ('김민주'),
        ('김우상'),
        ('임아진'),
        ('이동준'),
        ('김현아'),
        ('김동현'),
        ('이종휘'),
        ('김연아'),
        ('박혜정'),
        ('유종희'),
        ('김가연'),
        ('김교휘'),
        ('김오성'),
        ('이현동')

      ON CONFLICT (name) DO NOTHING;


    `;

    await sql.query(schema);
    console.log("데이터베이스 초기화 완료");
    return { success: true };
  } catch (error) {
    console.error("데이터베이스 초기화 오류:", error);
    throw error;
  }
}

// 데이터베이스 초기화 (한 번만 실행)
let isInitialized = false;
export async function initializeDatabaseOnce() {
  if (isInitialized) {
    return { success: true };
  }

  try {
    await initializeDatabase();
    isInitialized = true;
    return { success: true };
  } catch (error) {
    console.error("데이터베이스 초기화 오류:", error);
    throw error;
  }
}

// 회차 관리 함수들

// 모든 회차 조회
export async function getAllRounds() {
  try {
    const result = await sql`
      SELECT id, round_number, title, description, is_active, created_at
      FROM rounds 
      ORDER BY round_number DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("회차 목록 조회 오류:", error);
    throw error;
  }
}

// 활성 회차 조회
export async function getActiveRounds() {
  try {
    const result = await sql`
      SELECT id, round_number, title, description, is_active, created_at
      FROM rounds 
      WHERE is_active = true
      ORDER BY round_number DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("활성 회차 조회 오류:", error);
    throw error;
  }
}

// 다음 회차 번호 가져오기
export async function getNextRoundNumber() {
  try {
    const result = await sql`
      SELECT COALESCE(MAX(round_number), 0) + 1 as next_number
      FROM rounds
    `;
    return result.rows[0].next_number;
  } catch (error) {
    console.error("다음 회차 번호 조회 오류:", error);
    return 1; // 오류 시 기본값 1 반환
  }
}

// 회차 번호 재정렬 (중복 번호 수정)
export async function fixRoundNumbers() {
  try {
    // 모든 회차를 생성일 순으로 정렬하여 올바른 번호 부여
    const result = await sql`
      WITH ordered_rounds AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_number
        FROM rounds
        ORDER BY created_at ASC
      )
      UPDATE rounds 
      SET round_number = ordered_rounds.new_number
      FROM ordered_rounds
      WHERE rounds.id = ordered_rounds.id
      RETURNING rounds.id, rounds.round_number, rounds.title
    `;
    return result.rows;
  } catch (error) {
    console.error("회차 번호 재정렬 오류:", error);
    throw error;
  }
}

// 새 회차 추가 (자동 활성화)
export async function addRound(title, description = "") {
  try {
    // 다음 회차 번호 자동 생성
    const nextRoundNumber = await getNextRoundNumber();

    // 기존 활성 회차들을 모두 비활성화
    await sql`
      UPDATE rounds 
      SET is_active = false
      WHERE is_active = true
    `;

    // 새 회차를 활성 상태로 추가
    const result = await sql`
      INSERT INTO rounds (round_number, title, description, is_active)
      VALUES (${nextRoundNumber}, ${title}, ${description}, true)
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error("회차 추가 오류:", error);
    throw error;
  }
}

// 회차 비활성화
export async function deactivateRound(roundId) {
  try {
    const result = await sql`
      UPDATE rounds 
      SET is_active = false
      WHERE id = ${roundId}
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error("회차 비활성화 오류:", error);
    throw error;
  }
}

// 회차 삭제 (관련된 질문과 답변도 함께 삭제)
export async function deleteRound(roundId) {
  try {
    // CASCADE로 인해 관련된 questions와 answers도 자동 삭제됨
    const result = await sql`
      DELETE FROM rounds 
      WHERE id = ${roundId}
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error("회차 삭제 오류:", error);
    throw error;
  }
}

// 특정 회차의 질문 조회
export async function getQuestionsByRound(roundId) {
  try {
    const result = await sql`
      SELECT q.id, q.author, q.target, q.question, q.round_id, q.created_at
      FROM questions q
      WHERE q.round_id = ${roundId}
      ORDER BY q.created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("회차별 질문 조회 오류:", error);
    throw error;
  }
}

// 특정 회차의 답변 조회
export async function getAnswersByRound(roundId) {
  try {
    const result = await sql`
      SELECT a.id, a.question_id, a.answerer, a.answer, a.round_id, a.created_at
      FROM answers a
      WHERE a.round_id = ${roundId}
      ORDER BY a.created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("회차별 답변 조회 오류:", error);
    throw error;
  }
}

// 현재 활성 회차 조회
export async function getCurrentActiveRound() {
  try {
    const result = await sql`
      SELECT id, round_number, title, description, is_active, created_at
      FROM rounds 
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error("현재 활성 회차 조회 오류:", error);
    throw error;
  }
}

// 회차 변경 (새 회차 활성화, 기존 회차 비활성화)
export async function switchToRound(roundId) {
  try {
    // 모든 회차 비활성화
    await sql`
      UPDATE rounds 
      SET is_active = false
    `;

    // 선택된 회차 활성화
    const result = await sql`
      UPDATE rounds 
      SET is_active = true
      WHERE id = ${roundId}
      RETURNING *
    `;

    return result.rows[0];
  } catch (error) {
    console.error("회차 변경 오류:", error);
    throw error;
  }
}

// 회차 변경 시 답변자 초기화 (모든 답변자 비활성화)
export async function resetTargetsForNewRound() {
  try {
    const result = await sql`
      UPDATE targets 
      SET is_active = false
      RETURNING *
    `;

    return result.rows;
  } catch (error) {
    console.error("답변자 초기화 오류:", error);
    throw error;
  }
}

// 회차 종료
export async function endCurrentRound() {
  try {
    const result = await sql`
      UPDATE rounds 
      SET is_active = false
      WHERE is_active = true
      RETURNING id, round_number, title, description, is_active, created_at
    `;

    return result.rows[0];
  } catch (error) {
    console.error("회차 종료 오류:", error);
    throw error;
  }
}

// 회차가 활성 상태인지 확인
export async function isRoundActive() {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM rounds 
      WHERE is_active = true
    `;

    return result.rows[0].count > 0;
  } catch (error) {
    console.error("회차 활성 상태 확인 오류:", error);
    return false;
  }
}

// 현재 활성 회차의 질문 조회
export async function getCurrentRoundQuestions() {
  try {
    const currentRound = await getCurrentActiveRound();
    if (!currentRound) {
      return [];
    }

    const result = await sql`
      SELECT q.id, q.author, q.target, q.question, q.round_id, q.created_at
      FROM questions q
      WHERE q.round_id = ${currentRound.id}
      ORDER BY q.created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("현재 회차 질문 조회 오류:", error);
    throw error;
  }
}

// 현재 활성 회차의 답변 조회
export async function getCurrentRoundAnswers() {
  try {
    const currentRound = await getCurrentActiveRound();
    if (!currentRound) {
      return [];
    }

    const result = await sql`
      SELECT a.id, a.question_id, a.answerer, a.answer, a.round_id, a.created_at
      FROM answers a
      WHERE a.round_id = ${currentRound.id}
      ORDER BY a.created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("현재 회차 답변 조회 오류:", error);
    throw error;
  }
}
