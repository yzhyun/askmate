import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  const { action } = req.query;

  // 답변 저장
  if (action === "save") {
    if (req.method === "POST") {
      try {
        const { questionId, answerer, answer } = req.body;

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
      } catch (error) {
        console.error("답변 저장 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 답변 조회
  else if (action === "get") {
    if (req.method === "GET") {
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
        console.error("답변 조회 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 답변 삭제
  else if (action === "delete") {
    if (req.method === "DELETE") {
      try {
        await sql`DELETE FROM answers`;
        res.status(200).json({
          success: true,
          message: "모든 답변이 삭제되었습니다.",
        });
      } catch (error) {
        console.error("답변 삭제 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 답변자 인증 및 질문/답변 조회
  else if (action === "auth") {
    if (req.method === "GET") {
      try {
        const { answererName, password } = req.query;

        if (!answererName || !password) {
          return res
            .status(400)
            .json({ error: "답변자 이름과 비밀번호가 필요합니다." });
        }

        // 답변자 비밀번호 확인
        console.log("답변자 인증 시도 (GET):", { answererName, password });
        
        const passwordResult = await sql`
          SELECT password FROM answerer_passwords 
          WHERE answerer_name = ${answererName}
        `;

        console.log("데이터베이스 조회 결과 (GET):", passwordResult.rows);

        if (passwordResult.rows.length === 0) {
          console.log("답변자를 찾을 수 없음 (GET):", answererName);
          return res.status(404).json({ error: "답변자를 찾을 수 없습니다." });
        }

        const storedPassword = passwordResult.rows[0].password;
        console.log("저장된 비밀번호 (GET):", storedPassword, "입력된 비밀번호:", password);
        
        if (password !== storedPassword) {
          console.log("비밀번호 불일치 (GET)");
          return res
            .status(401)
            .json({ error: "비밀번호가 올바르지 않습니다." });
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
            message: "활성 회차가 없습니다.",
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
      // 답변 저장 (인증된 답변자)
      try {
        const { answererName, password, questionId, answer, roundId } =
          req.body;

        if (!answererName || !password || !questionId || !answer) {
          return res.status(400).json({ error: "필수 필드가 누락되었습니다." });
        }

        if (!roundId) {
          return res.status(400).json({ error: "회차 ID가 필요합니다." });
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
          return res
            .status(401)
            .json({ error: "비밀번호가 올바르지 않습니다." });
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
        console.error("요청 데이터:", req.body);
        res.status(500).json({
          error: "서버 오류가 발생했습니다.",
          details: error.message,
        });
      }
    }
  }
  // QA 데이터 조회 (질문과 답변 매칭)
  else if (action === "qa") {
    if (req.method === "GET") {
      try {
        const { roundId, answererName } = req.query;

        if (!roundId || !answererName) {
          return res
            .status(400)
            .json({ error: "회차 ID와 답변자 이름이 필요합니다." });
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
          `,
        ]);

        // 질문과 답변을 매칭하여 QA 데이터 생성
        const qaData = questionsResult.rows.map((question) => {
          const answer = answersResult.rows.find(
            (a) => a.question_id === question.id
          );
          return {
            question: question,
            answer: answer || null,
          };
        });

        res.status(200).json({
          success: true,
          qaData: qaData,
        });
      } catch (error) {
        console.error("QA 데이터 조회 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
}
