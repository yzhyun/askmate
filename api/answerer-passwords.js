import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 답변자 비밀번호 조회
    try {
      const passwords = await sql`
        SELECT answerer_name, password, created_at 
        FROM answerer_passwords 
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        passwords: passwords.rows,
      });
    } catch (error) {
      console.error("답변자 비밀번호 조회 오류:", error);
      res.status(500).json({ success: false, error: "답변자 비밀번호 조회에 실패했습니다." });
    }
  } else if (req.method === "POST") {
    // 답변자 비밀번호 설정
    try {
      const { answererName, password } = req.body;

      if (!answererName || !password) {
        return res.status(400).json({ error: "답변자 이름과 비밀번호가 필요합니다." });
      }

      const result = await sql`
        INSERT INTO answerer_passwords (answerer_name, password)
        VALUES (${answererName}, ${password})
        ON CONFLICT (answerer_name) 
        DO UPDATE SET 
          password = EXCLUDED.password,
          created_at = CURRENT_TIMESTAMP
        RETURNING id, answerer_name, password, created_at
      `;

      res.status(200).json({
        success: true,
        message: "답변자 비밀번호가 설정되었습니다.",
        password: result.rows[0],
      });
    } catch (error) {
      console.error("답변자 비밀번호 설정 오류:", error);
      res.status(500).json({ error: "답변자 비밀번호 설정에 실패했습니다." });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
