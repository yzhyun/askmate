import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password } = req.body;

    if (!password || password.length !== 8) {
      return res.status(400).json({ error: "8자리 비밀번호를 입력해주세요." });
    }

    // 관리자 비밀번호 설정 또는 업데이트
    await sql`
      INSERT INTO admin_auth (id, password, created_at)
      VALUES (1, ${password}, NOW())
      ON CONFLICT (id) 
      DO UPDATE SET password = ${password}, created_at = NOW()
    `;

    res.status(200).json({
      success: true,
      message: "관리자 비밀번호가 설정되었습니다.",
    });
  } catch (error) {
    console.error("관리자 비밀번호 설정 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
