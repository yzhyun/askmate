import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const currentRound = await sql`
        SELECT id, round_number, title, description, is_active, created_at 
        FROM rounds 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

    if (currentRound.rows.length === 0) {
      return res.status(200).json({
        success: true,
        round: null,
        message: "활성 회차가 없습니다.",
      });
    }

    res.status(200).json({
      success: true,
      round: currentRound.rows[0],
    });
  } catch (error) {
    console.error("현재 활성 회차 조회 오류:", error);
    res
      .status(500)
      .json({ success: false, error: "회차 조회에 실패했습니다." });
  }
}
