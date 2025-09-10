import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 멤버 목록 조회
    try {
      const result = await sql`
        SELECT id, name, is_active, created_at 
        FROM members 
        ORDER BY created_at DESC
      `;
      res.status(200).json({ success: true, members: result.rows });
    } catch (error) {
      console.error("멤버 조회 오류:", error);
      res.status(500).json({ error: "멤버 조회에 실패했습니다." });
    }
  } else if (req.method === "POST") {
    // 멤버 추가
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "멤버 이름이 필요합니다." });
      }

      const result = await sql`
        INSERT INTO members (name) 
        VALUES (${name.trim()}) 
        RETURNING id, name, is_active, created_at
      `;

      res.status(200).json({
        success: true,
        message: "멤버가 추가되었습니다.",
        member: result.rows[0],
      });
    } catch (error) {
      console.error("멤버 추가 오류:", error);
      if (error.code === "23505") {
        res.status(400).json({ error: "이미 존재하는 멤버입니다." });
      } else {
        res.status(500).json({ error: "멤버 추가에 실패했습니다." });
      }
    }
  } else if (req.method === "PUT") {
    // 멤버 비활성화
    try {
      const { memberId } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: "멤버 ID가 필요합니다." });
      }

      const result = await sql`
        UPDATE members 
        SET is_active = false 
        WHERE id = ${memberId}
        RETURNING id, name, is_active
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "멤버를 찾을 수 없습니다." });
      }

      res.status(200).json({
        success: true,
        message: "멤버가 비활성화되었습니다.",
        member: result.rows[0],
      });
    } catch (error) {
      console.error("멤버 비활성화 오류:", error);
      res.status(500).json({ error: "멤버 비활성화에 실패했습니다." });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
