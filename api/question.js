import { getAllQuestions } from "../src/utils/database.js";
import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  const { action } = req.query;

  // 질문 저장
  if (action === "save") {
    if (req.method === "POST") {
      try {
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
      } catch (error) {
        console.error("질문 저장 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 질문 조회
  else if (action === "get") {
    if (req.method === "GET") {
      try {
        const questions = await getAllQuestions();
        res.status(200).json({
          success: true,
          questions: questions,
        });
      } catch (error) {
        console.error("질문 조회 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 질문 삭제
  else if (action === "delete") {
    if (req.method === "DELETE") {
      try {
        await sql`DELETE FROM questions`;
        res.status(200).json({
          success: true,
          message: "모든 질문이 삭제되었습니다.",
        });
      } catch (error) {
        console.error("질문 삭제 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 특정 질문 조회 (답변 페이지용)
  else if (action === "get-by-id") {
    if (req.method === "GET") {
      try {
        const { questionId, randomCode } = req.query;

        if (!questionId || !randomCode) {
          return res.status(400).json({ error: "Missing required parameters" });
        }

        // 질문 정보 조회
        const questionResult = await sql`
          SELECT id, author, target, question, created_at
          FROM questions
          WHERE id = ${questionId}
        `;

        if (questionResult.rows.length === 0) {
          return res.status(404).json({ error: "질문을 찾을 수 없습니다." });
        }

        const question = questionResult.rows[0];

        // 기존 답변 조회
        const answerResult = await sql`
          SELECT id, answerer, answer, created_at
          FROM answers
          WHERE question_id = ${questionId}
        `;

        res.status(200).json({
          success: true,
          question: question,
          answer: answerResult.rows[0] || null,
        });
      } catch (error) {
        console.error("질문 조회 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  else {
    res.status(400).json({ error: "Invalid action" });
  }
}
