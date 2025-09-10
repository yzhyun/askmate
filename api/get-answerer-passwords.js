import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    res
      .status(500)
      .json({ success: false, error: "답변자 비밀번호 조회에 실패했습니다." });
  }
}
