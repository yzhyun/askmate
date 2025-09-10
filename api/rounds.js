import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rounds = await sql`
        SELECT id, round_number, title, description, is_active, created_at 
        FROM rounds 
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        rounds: rounds.rows,
      });
    } catch (error) {
      console.error("회차 조회 오류:", error);
      res
        .status(500)
        .json({ success: false, error: "회차 조회에 실패했습니다." });
    }
  } else if (req.method === "POST") {
    try {
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ error: "회차 제목이 필요합니다." });
      }

      // 기존 활성 회차들을 비활성화
      await sql`UPDATE rounds SET is_active = false WHERE is_active = true`;

      // 다음 회차 번호 가져오기
      const nextRoundResult = await sql`
        SELECT COALESCE(MAX(round_number), 0) + 1 as next_number
        FROM rounds
      `;
      const nextRoundNumber = nextRoundResult.rows[0].next_number;

      // 새 회차 생성
      const result = await sql`
        INSERT INTO rounds (round_number, title, description, is_active, created_at)
        VALUES (${nextRoundNumber}, ${title}, ${
        description || ""
      }, true, CURRENT_TIMESTAMP)
        RETURNING id, round_number, title, description, is_active, created_at
      `;

      res.status(200).json({
        success: true,
        message: "회차가 생성되었습니다.",
        round: result.rows[0],
      });
    } catch (error) {
      console.error("회차 생성 오류:", error);
      res
        .status(500)
        .json({ success: false, error: "회차 생성에 실패했습니다." });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
