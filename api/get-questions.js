import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 현재 활성 회차의 질문들만 조회
    const questions = await sql`
      SELECT q.*, r.round_number, r.title as round_title
      FROM questions q
      JOIN rounds r ON q.round_id = r.id
      WHERE r.is_active = true
      ORDER BY q.created_at DESC
    `;

    res.status(200).json({
      success: true,
      questions: questions.rows,
    });
  } catch (error) {
    console.error("질문 불러오기 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
