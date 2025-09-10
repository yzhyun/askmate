import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password } = req.body;

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
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
