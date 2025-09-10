import { getAllQuestions } from "../src/utils/database.js";
import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 데이터 조회 (기존 /api/get-data)
    try {
      const { type } = req.query;

      if (type === "questions") {
        const questions = await getAllQuestions();
        res.status(200).json({
          success: true,
          questions: questions,
        });
      } else if (type === "answers") {
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
      } else if (type === "qa") {
        // 특정 회차와 답변자의 QA 데이터 조회
        const { roundId, answererName } = req.query;
        
        if (!roundId || !answererName) {
          return res.status(400).json({ error: "회차 ID와 답변자 이름이 필요합니다." });
        }

        const [questionsResult, answersResult] = await Promise.all([
          sql`
            SELECT id, author, target, question, created_at
            FROM questions
            WHERE round_id = ${roundId} AND target = ${answererName}
            ORDER BY created_at DESC
          `,
          sql`
            SELECT a.id, a.question_id, a.answerer, a.answer, a.created_at, q.author, q.target, q.question
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            WHERE q.round_id = ${roundId} AND a.answerer = ${answererName}
            ORDER BY a.created_at DESC
          `
        ]);

        // 질문과 답변을 매칭하여 QA 데이터 생성
        const qaData = questionsResult.rows.map(question => {
          const answer = answersResult.rows.find(a => a.question_id === question.id);
          return {
            question: question,
            answer: answer || null
          };
        });

        res.status(200).json({
          success: true,
          qaData: qaData,
        });
      } else {
        // 둘 다 반환
        const [questions, answersResult] = await Promise.all([
          getAllQuestions(),
          sql`
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
          `,
        ]);

        res.status(200).json({
          success: true,
          questions: questions,
          answers: answersResult.rows,
        });
      }
    } catch (error) {
      console.error("데이터 조회 중 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  } else if (req.method === "DELETE") {
    // 질문 삭제 (기존 /api/clear-questions)
    try {
      const { type } = req.query;

      if (type === "questions") {
        // 모든 질문 삭제
        await sql`DELETE FROM questions`;
        res.status(200).json({
          success: true,
          message: "모든 질문이 삭제되었습니다.",
        });
      } else if (type === "answers") {
        // 모든 답변 삭제
        await sql`DELETE FROM answers`;
        res.status(200).json({
          success: true,
          message: "모든 답변이 삭제되었습니다.",
        });
      } else {
        // 모든 데이터 삭제
        await sql`DELETE FROM answers`;
        await sql`DELETE FROM questions`;
        res.status(200).json({
          success: true,
          message: "모든 데이터가 삭제되었습니다.",
        });
      }
    } catch (error) {
      console.error("데이터 삭제 중 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  } else if (req.method === "POST") {
    // 데이터 저장 (기존 /api/save)
    try {
      const { type, ...data } = req.body;

      if (type === "question") {
        const { author, question, target } = data;

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
      } else if (type === "answer") {
        const { questionId, answerer, answer } = data;

        if (!questionId || !answerer || !answer) {
          return res
            .status(400)
            .json({ error: "Missing required fields for answer" });
        }

        // 현재 활성 회차 조회
        const currentRound = await sql`
          SELECT id FROM rounds WHERE is_active = true ORDER BY created_at DESC LIMIT 1
        `;
        
        if (currentRound.rows.length === 0) {
          return res.status(400).json({ error: "활성 회차가 없습니다." });
        }

        const result = await sql`
          INSERT INTO answers (question_id, answerer, answer, round_id)
          VALUES (${questionId}, ${answerer}, ${answer}, ${currentRound.rows[0].id})
          RETURNING id, question_id, answerer, answer, round_id, created_at
        `;

        res.status(200).json({
          success: true,
          message: "답변이 저장되었습니다.",
          answer: result.rows[0],
        });
      } else {
        res
          .status(400)
          .json({ error: "Invalid type. Use 'question' or 'answer'" });
      }
    } catch (error) {
      console.error("저장 중 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
