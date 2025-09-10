import { saveQuestion } from "../src/utils/database.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { author, question, target } = req.body;

    if (!author || !question || !target) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const savedQuestion = await saveQuestion(author, target, question);

    res.status(200).json({
      success: true,
      message: "질문이 저장되었습니다.",
      question: savedQuestion,
    });
  } catch (error) {
    console.error("질문 저장 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
