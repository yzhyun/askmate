import dotenv from "dotenv";
import express from "express";
import cors from "cors";

// 환경 변수 로드
dotenv.config({ path: ".env.local" });
import {
  saveQuestion,
  getAllQuestions,
  clearAllQuestions,
  saveAnswer,
  getAllTargets,
  addTarget,
  deactivateTarget,
  getAllMembers,
  hasMemberAskedQuestion,
  addMember,
  deactivateMember,
  setAnswererPassword,
  verifyAnswererPassword,
  getAnswererPassword,
  setAdminPassword,
  verifyAdminPassword,
  getAdminPassword,
  getAllRounds,
  getActiveRounds,
  addRound,
  deactivateRound,
  deleteRound,
  getQuestionsByRound,
  getQuestionsForAnswerer,
  getAnswersByRound,
  getCurrentActiveRound,
  switchToRound,
  resetTargetsForNewRound,
  isRoundActive,
  getCurrentRoundQuestions,
  getCurrentRoundAnswers,
  dropForeignKeys,
  dropQuestionVisibilityTable,
  forceDropAllForeignKeys,
  dropAllTablesExceptMembers,
  fixRoundNumbers,
  addRoundIdToTargets,
  getTargetsByRound,
  moveOrphanTargetsToActiveRound,
  getCurrentActiveRoundTargets,
} from "./src/utils/database.js";
import { sql } from "@vercel/postgres";

const app = express();
const PORT = 3001;

// 비밀번호 검증 캐시 (메모리)
const passwordCache = new Map();

// 미들웨어
app.use(cors());
app.use(express.json());

// 데이터베이스 초기화는 별도 스크립트로 실행: npm run init-db

// 질문 저장 API
app.post("/api/save-question", async (req, res) => {
  try {
    const { author, target, question } = req.body;

    if (!author || !target || !question) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const savedQuestion = await saveQuestion(author, target, question);

    res.status(200).json({
      success: true,
      message: "질문이 저장되었습니다.",
      question: savedQuestion,
    });
  } catch (error) {
    console.error("질문 저장 오류:", error);
    res.status(500).json({ error: "질문 저장에 실패했습니다." });
  }
});

// 질문 조회 API
app.get("/api/get-questions", async (req, res) => {
  try {
    const questions = await getAllQuestions();

    res.status(200).json({
      success: true,
      questions: questions,
    });
  } catch (error) {
    console.error("질문 조회 오류:", error);
    res.status(500).json({ error: "질문 조회에 실패했습니다." });
  }
});

// 질문 삭제 API
app.delete("/api/clear-questions", async (req, res) => {
  try {
    await clearAllQuestions();

    res.status(200).json({
      success: true,
      message: "모든 질문이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("질문 삭제 오류:", error);
    res.status(500).json({ error: "질문 삭제에 실패했습니다." });
  }
});

// 답변 저장 API
app.post("/api/save-answer", async (req, res) => {
  try {
    const { questionId, answerer, answer } = req.body;

    if (!questionId || !answerer || !answer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const savedAnswer = await saveAnswer(questionId, answerer, answer);

    res.status(200).json({
      success: true,
      message: "답변이 저장되었습니다.",
      answer: savedAnswer,
    });
  } catch (error) {
    console.error("답변 저장 오류:", error);
    res.status(500).json({ error: "답변 저장에 실패했습니다." });
  }
});

// 답변자 비밀번호 조회 API (관리자용)
app.get("/api/get-answerer-passwords", async (req, res) => {
  try {
    const result = await sql`
      SELECT answerer_name, password, created_at
      FROM answerer_passwords
      ORDER BY created_at DESC
    `;

    res.status(200).json({
      success: true,
      passwords: result.rows,
    });
  } catch (error) {
    console.error("답변자 비밀번호 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 답변자 비밀번호 설정 API
app.post("/api/set-answerer-password", async (req, res) => {
  try {
    const { answererName, password } = req.body;

    if (!answererName || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await setAnswererPassword(answererName, password);

    res.status(200).json({
      success: true,
      message: "답변자 비밀번호가 설정되었습니다.",
      data: result,
    });
  } catch (error) {
    console.error("답변자 비밀번호 설정 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 답변 URL 생성 API
app.post("/api/generate-answer-url", async (req, res) => {
  try {
    const { answererName } = req.body;

    if (!answererName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 답변 URL 생성 (답변자 이름 기반)
    const answerUrl = `/answer/${answererName}`;

    res.status(200).json({
      success: true,
      answerUrl: answerUrl,
      message: "답변 URL이 생성되었습니다.",
    });
  } catch (error) {
    console.error("답변 URL 생성 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 답변 URL 처리 API (답변자 이름 기반)
app.get("/api/answer/:answererName/:randomCode", async (req, res) => {
  try {
    const { answererName, randomCode } = req.params;

    if (!answererName || !randomCode) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // 비밀번호 검증
    const isValidPassword = await verifyAnswererPassword(
      answererName,
      randomCode
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    }

    // 해당 답변자에게 온 질문들 조회 (hidden 상태 고려, 질문자 정보 제외)
    const targetQuestions = await getQuestionsForAnswerer(answererName);

    // 기존 답변들 조회 (질문자 정보 제외)
    const answersResult = await sql`
      SELECT a.id, a.question_id, a.answerer, a.answer, a.created_at
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE q.target = ${answererName}
    `;

    res.status(200).json({
      success: true,
      answererName: answererName,
      questions: targetQuestions,
      answers: answersResult.rows,
      randomCode: randomCode,
    });
  } catch (error) {
    console.error("답변 페이지 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

app.post("/api/answer/:answererName/:randomCode", async (req, res) => {
  try {
    const { answererName, randomCode } = req.params;
    const { questionId, answer, roundId } = req.body;

    if (!answererName || !randomCode || !questionId || !answer || !roundId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 비밀번호 검증 (캐시 사용)
    const cacheKey = `${answererName}:${randomCode}`;
    let isValidPassword = passwordCache.get(cacheKey);

    if (isValidPassword === undefined) {
      isValidPassword = await verifyAnswererPassword(answererName, randomCode);
      passwordCache.set(cacheKey, isValidPassword);
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    }

    // 기존 답변이 있는지 확인
    const existingAnswer = await sql`
      SELECT id FROM answers WHERE question_id = ${questionId}
    `;

    let result;
    if (existingAnswer.rows.length > 0) {
      // 기존 답변 업데이트
      result = await sql`
        UPDATE answers 
        SET answerer = ${answererName}, answer = ${answer}, round_id = ${roundId}, created_at = NOW()
        WHERE question_id = ${questionId}
        RETURNING id, question_id, answerer, answer, round_id, created_at
      `;
    } else {
      // 새 답변 생성
      result = await sql`
        INSERT INTO answers (question_id, answerer, answer, round_id)
        VALUES (${questionId}, ${answererName}, ${answer}, ${roundId})
        RETURNING id, question_id, answerer, answer, round_id, created_at
      `;
    }

    res.status(200).json({
      success: true,
      message: "답변이 저장되었습니다.",
      answer: result.rows[0],
    });
  } catch (error) {
    console.error("답변 저장 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 답변 목록 조회 API
app.get("/api/get-answers", async (req, res) => {
  try {
    const result = await sql`
      SELECT 
        a.id,
        a.question_id,
        a.answerer,
        a.answer,
        a.created_at,
        q.author,
        q.target,
        q.question
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      ORDER BY a.created_at DESC
    `;

    res.status(200).json({
      success: true,
      answers: result.rows,
    });
  } catch (error) {
    console.error("답변 조회 오류:", error);
    res.status(500).json({ error: "답변 조회에 실패했습니다." });
  }
});

// 대상자 목록 조회 API
app.get("/api/get-targets", async (req, res) => {
  try {
    const targets = await getAllTargets();

    res.status(200).json({
      success: true,
      targets: targets,
    });
  } catch (error) {
    console.error("대상자 조회 오류:", error);
    res.status(500).json({ error: "대상자 조회에 실패했습니다." });
  }
});

// 대상자 추가 API
app.post("/api/add-target", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTarget = await addTarget(name);

    // 새로 추가된 답변자의 질문들을 visible 처리
    await showQuestionsForTarget(name);

    res.status(200).json({
      success: true,
      message: "답변자가 추가되고 질문이 활성화되었습니다.",
      target: newTarget,
    });
  } catch (error) {
    console.error("답변자 추가 오류:", error);
    res.status(500).json({ error: "답변자 추가에 실패했습니다." });
  }
});

// 대상자 비활성화 API
app.post("/api/deactivate-target", async (req, res) => {
  try {
    const { targetId } = req.body;

    if (!targetId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 먼저 답변자 이름을 가져옴
    const targetResult = await sql`
      SELECT name FROM targets WHERE id = ${targetId}
    `;

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: "답변자를 찾을 수 없습니다." });
    }

    const targetName = targetResult.rows[0].name;

    // 답변자 비활성화
    await deactivateTarget(targetId);

    // 해당 답변자의 모든 질문을 hidden 처리
    await hideQuestionsForTarget(targetName);

    res.status(200).json({
      success: true,
      message: "답변자가 비활성화되고 질문이 숨겨졌습니다.",
    });
  } catch (error) {
    console.error("답변자 비활성화 오류:", error);
    res.status(500).json({ error: "답변자 비활성화에 실패했습니다." });
  }
});

// 회원 목록 조회 API
app.get("/api/get-members", async (req, res) => {
  try {
    const members = await getAllMembers();

    res.status(200).json({
      success: true,
      members: members,
    });
  } catch (error) {
    console.error("회원 조회 오류:", error);
    res.status(500).json({ error: "회원 조회에 실패했습니다." });
  }
});

// 질문 여부 체크 API
app.post("/api/check-question-status", async (req, res) => {
  try {
    const { memberName } = req.body;

    if (!memberName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hasAsked = await hasMemberAskedQuestion(memberName);

    res.status(200).json({
      success: true,
      hasAsked: hasAsked,
    });
  } catch (error) {
    console.error("질문 여부 체크 오류:", error);
    res.status(500).json({ error: "질문 여부 체크에 실패했습니다." });
  }
});

// 회원 추가 API
app.post("/api/add-member", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newMember = await addMember(name);

    res.status(200).json({
      success: true,
      message: "회원이 추가되었습니다.",
      member: newMember,
    });
  } catch (error) {
    console.error("회원 추가 오류:", error);
    res.status(500).json({ error: "회원 추가에 실패했습니다." });
  }
});

// 회원 비활성화 API
app.post("/api/deactivate-member", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await deactivateMember(id);

    res.status(200).json({
      success: true,
      message: "회원이 비활성화되었습니다.",
    });
  } catch (error) {
    console.error("회원 비활성화 오류:", error);
    res.status(500).json({ error: "회원 비활성화에 실패했습니다." });
  }
});

// 서버 시작
// 관리자 인증 API
app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "비밀번호를 입력해주세요." });
    }

    const isValid = await verifyAdminPassword(password);

    if (isValid) {
      res.status(200).json({
        success: true,
        message: "관리자 인증 성공",
      });
    } else {
      res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    }
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 관리자 비밀번호 설정 API
app.post("/api/admin/set-password", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ error: "4자리 이상의 비밀번호를 입력해주세요." });
    }

    await setAdminPassword(password);

    res.status(200).json({
      success: true,
      message: "관리자 비밀번호가 설정되었습니다.",
    });
  } catch (error) {
    console.error("관리자 비밀번호 설정 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 회차 관리 API들

// 모든 회차 조회
app.get("/api/rounds", async (req, res) => {
  try {
    const rounds = await getAllRounds();
    res.status(200).json({
      success: true,
      rounds: rounds,
    });
  } catch (error) {
    console.error("회차 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 활성 회차 조회
app.get("/api/rounds/active", async (req, res) => {
  try {
    const rounds = await getActiveRounds();
    res.status(200).json({
      success: true,
      rounds: rounds,
    });
  } catch (error) {
    console.error("활성 회차 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 새 회차 추가
app.post("/api/rounds", async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "회차 제목을 입력해주세요." });
    }

    const newRound = await addRound(title, description);

    res.status(200).json({
      success: true,
      message: "회차가 추가되었습니다.",
      round: newRound,
    });
  } catch (error) {
    console.error("회차 추가 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 회차 비활성화
app.post("/api/rounds/:roundId/deactivate", async (req, res) => {
  try {
    const { roundId } = req.params;

    await deactivateRound(roundId);

    res.status(200).json({
      success: true,
      message: "회차가 비활성화되었습니다.",
    });
  } catch (error) {
    console.error("회차 비활성화 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 회차 삭제
app.delete("/api/rounds/:roundId", async (req, res) => {
  try {
    const { roundId } = req.params;

    await deleteRound(roundId);

    res.status(200).json({
      success: true,
      message: "회차가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("회차 삭제 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 특정 회차의 질문 조회
app.get("/api/rounds/:roundId/questions", async (req, res) => {
  try {
    const { roundId } = req.params;
    const questions = await getQuestionsByRound(roundId);

    res.status(200).json({
      success: true,
      questions: questions,
    });
  } catch (error) {
    console.error("회차별 질문 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 특정 회차의 답변 조회
app.get("/api/rounds/:roundId/answers", async (req, res) => {
  try {
    const { roundId } = req.params;
    const answers = await getAnswersByRound(roundId);

    res.status(200).json({
      success: true,
      answers: answers,
    });
  } catch (error) {
    console.error("회차별 답변 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 현재 활성 회차 조회
app.get("/api/rounds/current", async (req, res) => {
  try {
    const currentRound = await getCurrentActiveRound();
    res.status(200).json({
      success: true,
      round: currentRound,
    });
  } catch (error) {
    console.error("현재 활성 회차 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 회차 변경 (답변자 초기화 포함)
app.post("/api/rounds/:roundId/switch", async (req, res) => {
  try {
    const { roundId } = req.params;

    // 회차 변경
    const newRound = await switchToRound(roundId);

    // 답변자 초기화
    await resetTargetsForNewRound();

    res.status(200).json({
      success: true,
      message: "회차가 변경되었고 답변자가 초기화되었습니다.",
      round: newRound,
    });
  } catch (error) {
    console.error("회차 변경 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// rounds 테이블 재생성
app.post("/api/reset-rounds", async (req, res) => {
  try {
    // 1. 기존 rounds 테이블 삭제 (존재한다면)
    await sql`DROP TABLE IF EXISTS rounds CASCADE`;

    // 2. 새로운 rounds 테이블 생성
    await sql`
      CREATE TABLE rounds (
        id SERIAL PRIMARY KEY,
        round_number INTEGER NOT NULL UNIQUE,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 3. questions와 answers 테이블에 round_id 컬럼 추가 (존재하지 않는 경우에만)
    try {
      await sql`ALTER TABLE questions ADD COLUMN round_id INTEGER DEFAULT 1`;
    } catch (e) {
      // 컬럼이 이미 존재하는 경우 무시
      console.log("questions.round_id 컬럼이 이미 존재합니다.");
    }

    try {
      await sql`ALTER TABLE answers ADD COLUMN round_id INTEGER DEFAULT 1`;
    } catch (e) {
      // 컬럼이 이미 존재하는 경우 무시
      console.log("answers.round_id 컬럼이 이미 존재합니다.");
    }

    // 5. 인덱스 생성
    await sql`CREATE INDEX IF NOT EXISTS idx_rounds_number ON rounds(round_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rounds_active ON rounds(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_questions_round_id ON questions(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_answers_round_id ON answers(round_id)`;

    // 6. 기본 회차 데이터 삽입
    await sql`
      INSERT INTO rounds (round_number, title, description, is_active) VALUES 
        (1, '1회차', '첫 번째 질문-답변 세션', true),
        (2, '2회차', '두 번째 질문-답변 세션', false)
      ON CONFLICT (round_number) DO NOTHING
    `;

    // 7. 기존 데이터의 round_id를 1로 설정 (기본 회차)
    await sql`UPDATE questions SET round_id = 1 WHERE round_id IS NULL OR round_id = 0`;
    await sql`UPDATE answers SET round_id = 1 WHERE round_id IS NULL OR round_id = 0`;

    res.status(200).json({
      success: true,
      message: "rounds 테이블이 성공적으로 재생성되었습니다.",
    });
  } catch (error) {
    console.error("rounds 테이블 재생성 오류:", error);
    res.status(500).json({
      success: false,
      error: `rounds 테이블 재생성에 실패했습니다: ${error.message}`,
    });
  }
});

// 모든 데이터 삭제
app.post("/api/clear-all-data", async (req, res) => {
  try {
    // 모든 테이블의 데이터 삭제
    await sql`DELETE FROM answers`;
    await sql`DELETE FROM questions`;
    await sql`DELETE FROM targets`;
    await sql`DELETE FROM answerer_passwords`;
    await sql`DELETE FROM question_visibility`;
    await sql`DELETE FROM rounds`;

    res.status(200).json({
      success: true,
      message: "모든 데이터가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("데이터 삭제 오류:", error);
    res.status(500).json({
      success: false,
      error: `데이터 삭제에 실패했습니다: ${error.message}`,
    });
  }
});

// 데이터베이스 완전 초기화
app.post("/api/reset-database", async (req, res) => {
  try {
    // 모든 테이블 삭제 (CASCADE로 외래키도 함께 삭제)
    await sql`DROP TABLE IF EXISTS answers CASCADE`;
    await sql`DROP TABLE IF EXISTS questions CASCADE`;
    await sql`DROP TABLE IF EXISTS targets CASCADE`;
    await sql`DROP TABLE IF EXISTS answerer_passwords CASCADE`;
    await sql`DROP TABLE IF EXISTS question_visibility CASCADE`;
    await sql`DROP TABLE IF EXISTS rounds CASCADE`;
    await sql`DROP TABLE IF EXISTS members CASCADE`;
    await sql`DROP TABLE IF EXISTS admin_auth CASCADE`;

    // 데이터베이스 재초기화는 별도 스크립트로 실행: npm run init-db

    res.status(200).json({
      success: true,
      message: "데이터베이스가 완전히 초기화되었습니다.",
    });
  } catch (error) {
    console.error("데이터베이스 초기화 오류:", error);
    res.status(500).json({
      success: false,
      error: `데이터베이스 초기화에 실패했습니다: ${error.message}`,
    });
  }
});

// 외래키 제약조건 제거
app.post("/api/drop-foreign-keys", async (req, res) => {
  try {
    await dropForeignKeys();

    res.status(200).json({
      success: true,
      message: "외래키 제약조건이 제거되었습니다.",
    });
  } catch (error) {
    console.error("외래키 제약조건 제거 오류:", error);
    res.status(500).json({
      success: false,
      error: `외래키 제약조건 제거에 실패했습니다: ${error.message}`,
    });
  }
});

// 회차 번호 재정렬
app.post("/api/fix-round-numbers", async (req, res) => {
  try {
    const fixedRounds = await fixRoundNumbers();

    res.status(200).json({
      success: true,
      message: "회차 번호가 재정렬되었습니다.",
      rounds: fixedRounds,
    });
  } catch (error) {
    console.error("회차 번호 재정렬 오류:", error);
    res.status(500).json({
      success: false,
      error: `회차 번호 재정렬에 실패했습니다: ${error.message}`,
    });
  }
});

// targets 테이블에 round_id 추가
app.post("/api/add-round-id-to-targets", async (req, res) => {
  try {
    await addRoundIdToTargets();

    res.status(200).json({
      success: true,
      message: "targets 테이블에 round_id가 추가되었습니다.",
    });
  } catch (error) {
    console.error("targets 테이블 수정 오류:", error);
    res.status(500).json({
      success: false,
      error: `targets 테이블 수정에 실패했습니다: ${error.message}`,
    });
  }
});

// 회차에 속하지 않은 답변자들을 현재 활성 회차로 이동
app.post("/api/move-orphan-targets", async (req, res) => {
  try {
    const result = await moveOrphanTargetsToActiveRound();

    res.status(200).json(result);
  } catch (error) {
    console.error("고아 답변자 이동 오류:", error);
    res.status(500).json({
      success: false,
      error: `답변자 이동에 실패했습니다: ${error.message}`,
    });
  }
});

// 현재 활성 회차의 답변자 조회
app.get("/api/get-current-active-targets", async (req, res) => {
  try {
    const targets = await getCurrentActiveRoundTargets();

    res.status(200).json({
      success: true,
      targets: targets,
    });
  } catch (error) {
    console.error("현재 활성 회차 답변자 조회 오류:", error);
    res.status(500).json({
      success: false,
      error: `답변자 조회에 실패했습니다: ${error.message}`,
    });
  }
});

// 기존 답변들의 round_id 업데이트
app.post("/api/fix-answers-round-id", async (req, res) => {
  try {
    const currentRound = await getCurrentActiveRound();
    if (!currentRound) {
      return res.status(400).json({ error: "활성 회차가 없습니다." });
    }

    // round_id가 NULL인 답변들을 현재 활성 회차로 업데이트
    const result = await sql`
      UPDATE answers 
      SET round_id = ${currentRound.id}
      WHERE round_id IS NULL
      RETURNING id, question_id, answerer, round_id
    `;

    res.status(200).json({
      success: true,
      message: `${result.rows.length}개의 답변의 round_id가 업데이트되었습니다.`,
      updatedAnswers: result.rows,
    });
  } catch (error) {
    console.error("답변 round_id 업데이트 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// answers 테이블에 UNIQUE 제약조건 추가
app.post("/api/add-answers-unique-constraint", async (req, res) => {
  try {
    // answers 테이블에 question_id에 대한 UNIQUE 제약조건 추가
    await sql`
      ALTER TABLE answers 
      ADD CONSTRAINT answers_question_id_unique UNIQUE (question_id)
    `;

    res.status(200).json({
      success: true,
      message: "answers 테이블에 UNIQUE 제약조건이 추가되었습니다.",
    });
  } catch (error) {
    console.error("UNIQUE 제약조건 추가 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 데이터베이스 인덱스 최적화
app.post("/api/optimize-database", async (req, res) => {
  try {
    // answerer_passwords 테이블에 복합 인덱스 추가
    await sql`
      CREATE INDEX IF NOT EXISTS idx_answerer_passwords_name_password 
      ON answerer_passwords (answerer_name, password)
    `;

    // answers 테이블에 인덱스 추가
    await sql`
      CREATE INDEX IF NOT EXISTS idx_answers_question_id 
      ON answers (question_id)
    `;

    // questions 테이블에 인덱스 추가
    await sql`
      CREATE INDEX IF NOT EXISTS idx_questions_target 
      ON questions (target)
    `;

    res.status(200).json({
      success: true,
      message: "데이터베이스 인덱스가 최적화되었습니다.",
    });
  } catch (error) {
    console.error("데이터베이스 최적화 오류:", error);
    res.status(500).json({ error: "데이터베이스 최적화에 실패했습니다." });
  }
});

// 특정 답변자에게 질문하지 않은 멤버 조회
app.get("/api/unasked-members/:answererName", async (req, res) => {
  try {
    const { answererName } = req.params;
    const currentRound = await getCurrentActiveRound();

    if (!currentRound) {
      return res.status(400).json({ error: "활성 회차가 없습니다." });
    }

    // 모든 활성 멤버 조회
    const allMembers = await sql`
      SELECT name FROM members WHERE is_active = true
    `;

    // 해당 답변자에게 질문한 멤버들 조회
    const askedMembers = await sql`
      SELECT DISTINCT author
      FROM questions 
      WHERE target = ${answererName} AND round_id = ${currentRound.id}
    `;

    const allMembersSet = new Set(allMembers.rows.map((row) => row.name));
    const askedMembersSet = new Set(askedMembers.rows.map((row) => row.author));

    // 질문하지 않은 멤버 계산
    const unaskedMembers = Array.from(allMembersSet).filter(
      (member) => !askedMembersSet.has(member)
    );

    res.status(200).json({
      success: true,
      unaskedMembers: unaskedMembers,
      count: unaskedMembers.length,
    });
  } catch (error) {
    console.error("질문하지 않은 멤버 조회 오류:", error);
    res.status(500).json({ error: "질문하지 않은 멤버 조회에 실패했습니다." });
  }
});

// 모든 외래키 강제 제거 API
app.post("/api/force-drop-foreign-keys", async (req, res) => {
  try {
    const result = await forceDropAllForeignKeys();
    res.status(200).json({
      success: true,
      message: "모든 외래키 제약조건이 강제로 제거되었습니다.",
      result: result,
    });
  } catch (error) {
    console.error("외래키 강제 제거 오류:", error);
    res.status(500).json({
      error: "외래키 강제 제거에 실패했습니다.",
      details: error.message,
    });
  }
});

// 모든 테이블 삭제 API (members 제외)
app.post("/api/drop-all-tables-except-members", async (req, res) => {
  try {
    const result = await dropAllTablesExceptMembers();
    res.status(200).json({
      success: true,
      message: "모든 테이블이 삭제되었습니다 (members 제외).",
      result: result,
    });
  } catch (error) {
    console.error("테이블 삭제 오류:", error);
    res.status(500).json({
      error: "테이블 삭제에 실패했습니다.",
      details: error.message,
    });
  }
});

// 질문과답변 조회 API
app.get("/api/qa-data/:roundId/:answererName", async (req, res) => {
  try {
    const { roundId, answererName } = req.params;

    // 해당 회차와 답변자의 질문과 답변을 조회
    const qaData = await sql`
      SELECT 
        q.id as question_id,
        q.question,
        q.author,
        a.answer,
        a.created_at as answer_created_at
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id AND a.round_id = ${roundId}
      WHERE q.round_id = ${roundId} AND q.target = ${answererName}
      ORDER BY q.created_at ASC
    `;

    // 질문자는 익명으로 처리 (author 필드 제거)
    const processedData = qaData.rows.map((row) => ({
      question_id: row.question_id,
      question: row.question,
      answer: row.answer,
      answer_created_at: row.answer_created_at,
    }));

    res.status(200).json({
      success: true,
      qaData: processedData,
      count: processedData.length,
    });
  } catch (error) {
    console.error("질문과답변 조회 오류:", error);
    res.status(500).json({ error: "질문과답변 조회에 실패했습니다." });
  }
});

// 회차 API
app.get("/api/rounds", async (req, res) => {
  try {
    const rounds = await getAllRounds();
    res.json({ success: true, rounds });
  } catch (error) {
    console.error("회차 조회 오류:", error);
    res.status(500).json({ error: "회차 조회에 실패했습니다." });
  }
});

// 멤버 API
app.get("/api/members", async (req, res) => {
  try {
    const members = await getAllMembers();
    res.json({ success: true, members });
  } catch (error) {
    console.error("멤버 조회 오류:", error);
    res.status(500).json({ error: "멤버 조회에 실패했습니다." });
  }
});

// 타겟 API
app.get("/api/targets", async (req, res) => {
  try {
    const targets = await getAllTargets();
    res.json({ success: true, targets });
  } catch (error) {
    console.error("타겟 조회 오류:", error);
    res.status(500).json({ error: "타겟 조회에 실패했습니다." });
  }
});

// Vercel에서는 export default를 사용
// 통합 관리자 API (Vercel 호환)
app.get("/api/admin", async (req, res) => {
  try {
    const { action, password } = req.query;
    
    if (action === "login") {
      const isValid = await verifyAdminPassword(password);
      if (isValid) {
        res.json({ success: true, message: "인증 성공" });
      } else {
        res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
      }
      return;
    }
    
    if (action === "rounds") {
      const { type } = req.query;
      if (type === "current") {
        const currentRound = await getCurrentActiveRound();
        res.json({ success: true, round: currentRound });
      } else {
        const rounds = await getAllRounds();
        res.json({ success: true, rounds });
      }
    } else if (action === "passwords") {
      // 답변자 비밀번호 조회는 별도 구현 필요
      res.json({ success: true, passwords: [] });
    } else if (action === "members") {
      const members = await getAllMembers();
      res.json({ success: true, members });
    } else if (action === "targets") {
      const targets = await getAllTargets();
      res.json({ success: true, targets });
    } else {
      res.status(400).json({ error: "지원하지 않는 액션입니다." });
    }
  } catch (error) {
    console.error("관리자 API 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

app.post("/api/admin", async (req, res) => {
  try {
    const { action } = req.query;
    
    if (action === "rounds") {
      const { title, description } = req.body;
      const newRound = await addRound(title, description);
      res.json({ success: true, round: newRound });
    } else {
      res.status(400).json({ error: "지원하지 않는 액션입니다." });
    }
  } catch (error) {
    console.error("관리자 API 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

export default app;

// 로컬 개발 환경에서만 listen 실행
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`파일 저장 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    console.log("💡 데이터베이스 초기화가 필요하다면: npm run init-db");
  });
}
