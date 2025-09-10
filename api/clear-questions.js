import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 모든 질문 삭제
    await sql`DELETE FROM questions`;

    res.status(200).json({
      success: true,
      message: "모든 질문이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("질문 삭제 오류:", error);
    res.status(500).json({ error: "질문 삭제에 실패했습니다." });
  }
}
