import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 현재 활성 회차의 답변자들 조회
    const targets = await sql`
      SELECT t.*, r.round_number, r.title as round_title
      FROM targets t
      JOIN rounds r ON t.round_id = r.id
      WHERE r.is_active = true AND t.is_active = true
      ORDER BY t.created_at ASC
    `;

    res.status(200).json({
      success: true,
      targets: targets.rows,
    });
  } catch (error) {
    console.error("현재 활성 회차 답변자 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
