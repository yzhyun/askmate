import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 답변 페이지 조회
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
        randomCode: randomCode,
      });
    } catch (error) {
      console.error("답변 페이지 조회 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  } else if (req.method === "POST") {
    // 답변 저장
    try {
      const { questionId, randomCode } = req.query;
      const { answer } = req.body;

      if (!questionId || !randomCode || !answer) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 답변 저장 (기존 답변이 있으면 업데이트, 없으면 새로 생성)
      const result = await sql`
        INSERT INTO answers (question_id, answerer, answer)
        VALUES (${questionId}, ${randomCode}, ${answer})
        ON CONFLICT (question_id) 
        DO UPDATE SET 
          answerer = EXCLUDED.answerer,
          answer = EXCLUDED.answer,
          created_at = NOW()
        RETURNING id, question_id, answerer, answer, created_at
      `;

      res.status(200).json({
        success: true,
        message: "답변이 저장되었습니다.",
        answer: result.rows[0],
      });
    } catch (error) {
      console.error("답변 저장 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
