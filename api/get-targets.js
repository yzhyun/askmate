import { getAllTargets } from "../src/utils/database.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const targets = await getAllTargets();

    res.status(200).json({
      success: true,
      targets: targets,
    });
  } catch (error) {
    console.error("대상자 조회 중 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
