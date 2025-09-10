import { sql } from "@vercel/postgres";
import { getAllTargets } from "../src/utils/database.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 타겟 목록 조회
    try {
      const targets = await getAllTargets();
      res.status(200).json({ success: true, targets: targets });
    } catch (error) {
      console.error("대상자 조회 중 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  } else if (req.method === "POST") {
    // 타겟 추가
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "답변자 이름이 필요합니다." });
      }

      // 현재 활성 회차 조회
      const currentRound = await sql`
        SELECT id FROM rounds 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      if (currentRound.rows.length === 0) {
        return res.status(400).json({ error: "활성 회차가 없습니다." });
      }

      const roundId = currentRound.rows[0].id;

      const result = await sql`
        INSERT INTO targets (name, round_id, is_active) 
        VALUES (${name.trim()}, ${roundId}, true) 
        RETURNING id, name, round_id, is_active, created_at
      `;

      res.status(200).json({
        success: true,
        message: "답변자가 추가되었습니다.",
        target: result.rows[0],
      });
    } catch (error) {
      console.error("답변자 추가 오류:", error);
      if (error.code === "23505") {
        res.status(400).json({ error: "이미 존재하는 답변자입니다." });
      } else {
        res.status(500).json({ error: "답변자 추가에 실패했습니다." });
      }
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
