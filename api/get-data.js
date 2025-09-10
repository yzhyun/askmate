import { getAllQuestions } from "../src/utils/database.js";
import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
}
