import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { answererName } = req.body;

    if (!answererName) {
      return res.status(400).json({ error: "답변자 이름이 필요합니다." });
    }

    // 답변자 비밀번호 조회
    const passwordResult = await sql`
      SELECT password FROM answerer_passwords 
      WHERE answerer_name = ${answererName}
    `;

    if (passwordResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "답변자 비밀번호를 찾을 수 없습니다." });
    }

    const password = passwordResult.rows[0].password;

    res.status(200).json({
      success: true,
      message: "답변 URL이 생성되었습니다.",
      answererName: answererName,
      password: password,
      url: `/answer/${answererName}`,
    });
  } catch (error) {
    console.error("답변 URL 생성 오류:", error);
    res.status(500).json({ error: "답변 URL 생성에 실패했습니다." });
  }
}
