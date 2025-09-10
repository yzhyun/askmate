import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rounds = await sql`
      SELECT id, title, description, is_active, created_at 
      FROM rounds 
      ORDER BY created_at DESC
    `;

    res.status(200).json({
      success: true,
      rounds: rounds.rows,
    });
  } catch (error) {
    console.error("회차 조회 오류:", error);
    res.status(500).json({ success: false, error: "회차 조회에 실패했습니다." });
  }
}
