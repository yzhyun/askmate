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

// 통합 관리자 API (Vercel과 동일한 구조)
app.get("/api/admin", async (req, res) => {
  try {
    const { action } = req.query;

    // 관리자 인증
    if (action === "login") {
      const { password } = req.query;

      if (!password) {
        return res.status(400).json({ error: "비밀번호를 입력해주세요." });
      }

      // 관리자 비밀번호 확인
      const result = await sql`
        SELECT password FROM admin_auth WHERE id = 1
      `;

      if (result.rows.length === 0) {
        return res
          .status(401)
          .json({ error: "관리자 비밀번호가 설정되지 않았습니다." });
      }

      const storedPassword = result.rows[0].password;

      if (password === storedPassword) {
        res.status(200).json({
          success: true,
          message: "관리자 인증 성공",
        });
      } else {
        res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
      }
    }
    // 회차 관리
    else if (action === "rounds") {
      const { type } = req.query;
      if (type === "current") {
        const currentRound = await getCurrentActiveRound();
        res.json({ success: true, round: currentRound });
      } else {
        const rounds = await getAllRounds();
        res.json({ success: true, rounds });
      }
    }
    // 멤버 관리
    else if (action === "members") {
      const members = await getAllMembers();
      res.json({ success: true, members });
    }
    // 타겟 관리
    else if (action === "targets") {
      const { includeStats } = req.query;
      if (includeStats === "true") {
        // 통계 정보 포함하여 타겟 조회
        const targets = await getAllTargets();
        const targetsWithStats = await Promise.all(
          targets.map(async (target) => {
            const questionCount = await sql`
              SELECT COUNT(*) as count FROM questions 
              WHERE target = ${target.answerer_name} AND round_id = ${target.round_id}
            `;
            const answerCount = await sql`
              SELECT COUNT(*) as count FROM answers 
              WHERE answerer = ${target.answerer_name} AND round_id = ${target.round_id}
            `;
            return {
              ...target,
              questionCount: parseInt(questionCount.rows[0].count),
              answerCount: parseInt(answerCount.rows[0].count),
            };
          })
        );
        res.json({ success: true, targets: targetsWithStats });
      } else {
        const targets = await getAllTargets();
        res.json({ success: true, targets });
      }
    }
    // 답변자 비밀번호 관리
    else if (action === "passwords") {
      try {
        const passwords = await sql`
          SELECT answerer_name, password, created_at
          FROM answerer_passwords
          ORDER BY created_at DESC
        `;
        res.json({ success: true, passwords: passwords.rows });
      } catch (error) {
        console.error("답변자 비밀번호 조회 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
    // 질문 안한 회원 조회
    else if (action === "unasked-members") {
      const { answererName } = req.query;

      if (!answererName) {
        return res.status(400).json({ error: "답변자 이름이 필요합니다." });
      }

      // 현재 활성 회차 조회
      const currentRound = await getCurrentActiveRound();
      if (!currentRound) {
        return res.status(400).json({ error: "활성 회차가 없습니다." });
      }

      // 모든 회원 조회
      const allMembers = await getAllMembers();

      // 해당 답변자에게 질문한 회원들 조회
      const askedMembers = await sql`
        SELECT DISTINCT author
        FROM questions
        WHERE target = ${answererName} AND round_id = ${currentRound.id}
      `;

      const askedMemberNames = askedMembers.rows.map(row => row.author);

      // 질문 안한 회원들 필터링
      const unaskedMembers = allMembers.filter(member => 
        !askedMemberNames.includes(member.answerer_name)
      );

      res.json({ success: true, unaskedMembers });
    }
    // 질문과 답변 조회
    else if (action === "qa") {
      const { roundId, answererName } = req.query;
      if (!roundId || !answererName) {
        return res
          .status(400)
          .json({ error: "회차 ID와 답변자 이름이 필요합니다." });
      }

      const qaData = await sql`
        SELECT 
          q.id as question_id,
          q.question,
          q.author,
          q.target,
          q.created_at as question_created_at,
          a.answer,
          a.created_at as answer_created_at
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id AND a.answerer = ${answererName} AND a.round_id = ${roundId}
        WHERE q.target = ${answererName} AND q.round_id = ${roundId}
        ORDER BY q.created_at ASC
      `;

      res.json({ success: true, qaData: qaData.rows });
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

    // 회차 생성
    if (action === "rounds") {
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ error: "회차 제목이 필요합니다." });
      }

      // 다음 회차 번호 계산
      const nextRoundResult = await sql`
        SELECT COALESCE(MAX(round_number), 0) + 1 as next_number FROM rounds
      `;
      const nextRoundNumber = nextRoundResult.rows[0].next_number;

      // 새 회차 생성
      const result = await sql`
        INSERT INTO rounds (round_number, title, description, is_active)
        VALUES (${nextRoundNumber}, ${title}, ${description}, true)
        RETURNING id, round_number, title, description, is_active, created_at
      `;

      const newRound = result.rows[0];

      // 기존 회차들 비활성화
      await sql`
        UPDATE rounds SET is_active = false WHERE id != ${newRound.id}
      `;

      res.json({ success: true, round: newRound });
    }
    // 회원 추가
    else if (action === "members") {
      const { answerer_name } = req.body;

      if (!answerer_name) {
        return res.status(400).json({ error: "회원 이름이 필요합니다." });
      }

      await addMember(answerer_name);
      res.json({ success: true, message: "회원이 추가되었습니다." });
    }
    // 답변자 추가
    else if (action === "targets") {
      const { answerer_name, roundId } = req.body;

      if (!answerer_name) {
        return res.status(400).json({ error: "답변자 이름이 필요합니다." });
      }

      await addTarget(answerer_name, roundId);
      res.json({ success: true, message: "답변자가 추가되었습니다." });
    }
    // 답변자 비밀번호 설정
    else if (action === "passwords") {
      const { answerer_name, password, roundId } = req.body;

      if (!answerer_name || !password) {
        return res.status(400).json({ error: "이름과 비밀번호가 필요합니다." });
      }

      await setAnswererPassword(answerer_name, password, roundId);
      res.json({ success: true, message: "비밀번호가 설정되었습니다." });
    } else {
      res.status(400).json({ error: "지원하지 않는 액션입니다." });
    }
  } catch (error) {
    console.error("관리자 API 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 통합 질문 API (Vercel과 동일한 구조)
app.get("/api/question", async (req, res) => {
  try {
    const { action } = req.query;

    if (action === "get") {
      // 질문 조회
      const questions = await sql`
        SELECT q.*, r.round_number, r.title as round_title
        FROM questions q
        LEFT JOIN rounds r ON q.round_id = r.id
        ORDER BY q.created_at DESC
      `;

      res.json({ success: true, questions: questions.rows });
    } else {
      res.status(400).json({ error: "지원하지 않는 액션입니다." });
    }
  } catch (error) {
    console.error("질문 API 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

app.post("/api/question", async (req, res) => {
  try {
    const { action } = req.query;

    if (action === "save") {
      // 질문 저장
      const { author, question, target } = req.body;

      if (!author || !question || !target) {
        return res
          .status(400)
          .json({ error: "Missing required fields for question" });
      }

      // 현재 활성 회차 조회
      const currentRound = await sql`
        SELECT id FROM rounds WHERE is_active = true ORDER BY created_at DESC LIMIT 1
      `;
      
      if (currentRound.rows.length === 0) {
        return res.status(400).json({ error: "활성 회차가 없습니다." });
      }

      const result = await sql`
        INSERT INTO questions (author, target, question, round_id)
        VALUES (${author}, ${target}, ${question}, ${currentRound.rows[0].id})
        RETURNING id, author, target, question, round_id, created_at
      `;

      res.status(200).json({
        success: true,
        message: "질문이 저장되었습니다.",
        question: result.rows[0],
      });
    } else {
      res.status(400).json({ error: "지원하지 않는 액션입니다." });
    }
  } catch (error) {
    console.error("질문 저장 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 통합 답변 API (Vercel과 동일한 구조)
app.get("/api/answer", async (req, res) => {
  try {
    const { action } = req.query;

    if (action === "auth") {
      const { answererName, password } = req.query;

      if (!answererName || !password) {
        return res.status(400).json({ error: "답변자 이름과 비밀번호가 필요합니다." });
      }

      console.log("답변자 인증 시도 (GET):", { answererName, password });

      // 비밀번호 검증
      const passwordResult = await sql`
        SELECT password FROM answerer_passwords 
        WHERE answerer_name = ${answererName}
        ORDER BY created_at DESC LIMIT 1
      `;

      console.log("데이터베이스 조회 결과 (GET):", passwordResult.rows);

      if (passwordResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "비밀번호를 찾을 수 없습니다.",
        });
      }

      const storedPassword = passwordResult.rows[0].password;
      console.log("저장된 비밀번호 (GET):", storedPassword, "입력된 비밀번호:", password);

      if (password === storedPassword) {
        // 현재 활성 회차의 질문들 조회
        const currentRound = await sql`
          SELECT id FROM rounds WHERE is_active = true ORDER BY created_at DESC LIMIT 1
        `;
        
        if (currentRound.rows.length === 0) {
          return res.status(400).json({ error: "활성 회차가 없습니다." });
        }

        const questions = await sql`
          SELECT * FROM questions 
          WHERE target = ${answererName} AND round_id = ${currentRound.rows[0].id}
          ORDER BY created_at ASC
        `;

        const answers = await sql`
          SELECT * FROM answers 
          WHERE answerer = ${answererName} AND round_id = ${currentRound.rows[0].id}
        `;

        res.status(200).json({
          success: true,
          questions: questions.rows,
          answers: answers.rows,
        });
      } else {
        res.status(401).json({
          success: false,
          error: "비밀번호가 올바르지 않습니다.",
        });
      }
    } else if (action === "get") {
      const answers = await sql`
        SELECT a.*, q.question, q.author, q.target
        FROM answers a
        LEFT JOIN questions q ON a.question_id = q.id
        ORDER BY a.created_at DESC
      `;

      res.status(200).json({
        success: true,
        answers: answers.rows,
      });
    } else {
      res.status(400).json({ error: "지원하지 않는 액션입니다." });
    }
  } catch (error) {
    console.error("답변 API 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

app.post("/api/answer", async (req, res) => {
  try {
    const { action } = req.query;

    if (action === "auth") {
      const { answererName, password, questionId, answer, roundId } = req.body;

      if (!answererName || !password || !questionId || !answer) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log("답변 저장 요청:", { answererName, password: "***", questionId, answer, roundId });

      // 비밀번호 검증
      const passwordResult = await sql`
        SELECT password FROM answerer_passwords 
        WHERE answerer_name = ${answererName}
        ORDER BY created_at DESC LIMIT 1
      `;

      if (passwordResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "비밀번호를 찾을 수 없습니다.",
        });
      }

      const storedPassword = passwordResult.rows[0].password;

      if (password === storedPassword) {
        // 답변 저장 (기존 답변이 있으면 업데이트, 없으면 새로 생성)
        // 먼저 기존 답변이 있는지 확인
        const existingAnswer = await sql`
          SELECT id FROM answers 
          WHERE question_id = ${questionId} AND answerer = ${answererName}
        `;

        let result;
        if (existingAnswer.rows.length > 0) {
          // 기존 답변 업데이트
          result = await sql`
            UPDATE answers 
            SET answer = ${answer}, created_at = CURRENT_TIMESTAMP
            WHERE question_id = ${questionId} AND answerer = ${answererName}
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
      } else {
        res.status(401).json({
          success: false,
          error: "비밀번호가 올바르지 않습니다.",
        });
      }
    } else {
      res.status(400).json({ error: "지원하지 않는 액션입니다." });
    }
  } catch (error) {
    console.error("답변 저장 API 오류:", error);
    console.error("요청 데이터:", req.body);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

export default app;

// 로컬 개발 환경에서만 listen 실행
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`파일 저장 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    console.log("💡 데이터베이스 초기화가 필요하다면: npm run init-db");
  });
}
