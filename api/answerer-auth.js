import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 답변자 인증 및 질문/답변 조회 또는 질문하지 않은 멤버 조회
    try {
      const { answererName, password, action } = req.query;

      // 질문하지 않은 멤버 조회
      if (action === "unasked-members") {
        if (!answererName) {
          return res.status(400).json({ error: "답변자 이름이 필요합니다." });
        }

        // 현재 활성 회차 조회
        const currentRound = await sql`
          SELECT id FROM rounds WHERE is_active = true ORDER BY created_at DESC LIMIT 1
        `;

        if (currentRound.rows.length === 0) {
          return res.status(200).json({
            success: true,
            unaskedMembers: [],
            message: "활성 회차가 없습니다."
          });
        }

        const roundId = currentRound.rows[0].id;

        // 모든 활성 멤버 조회
        const allMembers = await sql`
          SELECT name FROM members WHERE is_active = true ORDER BY name
        `;

        // 해당 답변자에게 질문한 멤버들 조회
        const askedMembers = await sql`
          SELECT DISTINCT author FROM questions 
          WHERE target = ${answererName} AND round_id = ${roundId}
        `;

        const askedMemberNames = askedMembers.rows.map(row => row.author);
        const unaskedMembers = allMembers.rows
          .map(row => row.name)
          .filter(name => !askedMemberNames.includes(name));

        return res.status(200).json({
          success: true,
          unaskedMembers: unaskedMembers,
        });
      }

      // 답변자 인증 및 질문/답변 조회
      if (!answererName || !password) {
        return res.status(400).json({ error: "답변자 이름과 비밀번호가 필요합니다." });
      }

      // 답변자 비밀번호 확인
      const passwordResult = await sql`
        SELECT password FROM answerer_passwords 
        WHERE answerer_name = ${answererName}
      `;

      if (passwordResult.rows.length === 0) {
        return res.status(404).json({ error: "답변자를 찾을 수 없습니다." });
      }

      const storedPassword = passwordResult.rows[0].password;
      if (password !== storedPassword) {
        return res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
      }

      // 현재 활성 회차 조회
      const currentRound = await sql`
        SELECT id FROM rounds WHERE is_active = true ORDER BY created_at DESC LIMIT 1
      `;

      if (currentRound.rows.length === 0) {
        return res.status(200).json({
          success: true,
          questions: [],
          answers: [],
          message: "활성 회차가 없습니다."
        });
      }

      const roundId = currentRound.rows[0].id;

      // 해당 답변자에게 온 질문들 조회
      const questionsResult = await sql`
        SELECT id, author, target, question, created_at
        FROM questions
        WHERE target = ${answererName} AND round_id = ${roundId}
        ORDER BY created_at DESC
      `;

      // 해당 답변자의 답변들 조회
      const answersResult = await sql`
        SELECT a.id, a.question_id, a.answerer, a.answer, a.created_at
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.answerer = ${answererName} AND q.round_id = ${roundId}
        ORDER BY a.created_at DESC
      `;

      res.status(200).json({
        success: true,
        questions: questionsResult.rows,
        answers: answersResult.rows,
      });
    } catch (error) {
      console.error("답변자 인증 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  } else if (req.method === "POST") {
    // 답변 저장
    try {
      const { answererName, password, questionId, answer, roundId } = req.body;

      if (!answererName || !password || !questionId || !answer) {
        return res.status(400).json({ error: "필수 필드가 누락되었습니다." });
      }

      // 답변자 비밀번호 확인
      const passwordResult = await sql`
        SELECT password FROM answerer_passwords 
        WHERE answerer_name = ${answererName}
      `;

      if (passwordResult.rows.length === 0) {
        return res.status(404).json({ error: "답변자를 찾을 수 없습니다." });
      }

      const storedPassword = passwordResult.rows[0].password;
      if (password !== storedPassword) {
        return res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
      }

      // 답변 저장
      const result = await sql`
        INSERT INTO answers (question_id, answerer, answer, round_id)
        VALUES (${questionId}, ${answererName}, ${answer}, ${roundId})
        ON CONFLICT (question_id, answerer)
        DO UPDATE SET 
          answer = EXCLUDED.answer,
          created_at = CURRENT_TIMESTAMP
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
