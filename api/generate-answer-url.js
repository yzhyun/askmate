import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { questionId, randomCode } = req.body;

    if (!questionId || !randomCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 답변 URL 생성
    const answerUrl = `/answer/${questionId}/${randomCode}`;

    res.status(200).json({
      success: true,
      answerUrl: answerUrl,
      message: "답변 URL이 생성되었습니다.",
    });
  } catch (error) {
    console.error("답변 URL 생성 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
