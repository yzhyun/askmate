import { saveAnswer } from "../src/utils/database.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { questionId, answerer, answer } = req.body;

    if (!questionId || !answerer || !answer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const savedAnswer = await saveAnswer(questionId, answerer, answer);

    res.status(200).json({
      success: true,
      message: "답변이 저장되었습니다.",
      answer: savedAnswer,
    });
  } catch (error) {
    console.error("답변 저장 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
