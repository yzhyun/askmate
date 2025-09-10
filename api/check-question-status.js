import { hasMemberAskedQuestion } from "../src/utils/database.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { memberName } = req.body;

    if (!memberName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hasAsked = await hasMemberAskedQuestion(memberName);

    res.status(200).json({
      success: true,
      hasAsked: hasAsked,
    });
  } catch (error) {
    console.error("질문 여부 체크 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
