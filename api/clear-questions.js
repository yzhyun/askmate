import { clearAllQuestions } from "../src/utils/database.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await clearAllQuestions();

    res.status(200).json({
      success: true,
      message: "모든 질문이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("질문 삭제 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
