import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { author, question, target } = req.body;

    if (!author || !question || !target) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 현재 활성 회차 조회
    const currentRound = await sql`
      SELECT id FROM rounds WHERE is_active = true ORDER BY created_at DESC LIMIT 1
    `;

    if (currentRound.rows.length === 0) {
      return res.status(400).json({ error: "활성 회차가 없습니다." });
    }

    const roundId = currentRound.rows[0].id;

    // 질문 저장
    const result = await sql`
      INSERT INTO questions (author, target, question, round_id)
      VALUES (${author}, ${target}, ${question}, ${roundId})
      RETURNING id, author, target, question, round_id, created_at
    `;

    res.status(200).json({
      success: true,
      message: "질문이 저장되었습니다.",
      question: result.rows[0],
    });
  } catch (error) {
    console.error("질문 저장 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
