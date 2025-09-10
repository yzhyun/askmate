// 질문을 서버의 텍스트 파일로 저장하는 유틸리티 함수들
import { api } from "./api";

export const saveQuestionToFile = async (questionData) => {
  try {
    // 개발/프로덕션 환경 모두 API 사용
    return saveQuestionToAPI(questionData);
  } catch (error) {
    console.error("질문 저장 중 오류 발생:", error);
    return false;
  }
};

// 로컬 스토리지에 저장하는 함수
const saveQuestionToLocalStorage = (questionData) => {
  try {
    const questionText = formatQuestionForFile(questionData);
    const existingQuestions = localStorage.getItem("questions") || "";
    const updatedContent = questionText + existingQuestions;
    localStorage.setItem("questions", updatedContent);

    // 로컬 파일에도 저장 (Node.js 스크립트 호출)
    // 실제로는 브라우저에서 직접 파일에 쓸 수 없으므로 로컬 스토리지만 사용
    console.log("질문이 로컬 스토리지에 저장되었습니다:", questionData);
    return true;
  } catch (error) {
    console.error("로컬 스토리지 저장 중 오류:", error);
    return false;
  }
};

// API를 통해 저장하는 함수
const saveQuestionToAPI = async (questionData) => {
  try {
    const result = await api.post("/api/save", { type: "question", ...questionData });
    console.log("질문 저장 성공:", result.message);
    return true;
  } catch (error) {
    console.error("API 저장 중 오류:", error);
    return false;
  }
};

// 질문 데이터를 텍스트 형식으로 포맷팅하는 함수
const formatQuestionForFile = (questionData) => {
  return `[${questionData.timestamp}] ${questionData.author} → ${questionData.target}\n질문: ${questionData.question}\n\n`;
};

// 서버에서 질문 목록을 불러오는 함수
export const loadQuestionsFromServer = async () => {
  try {
    // 개발/프로덕션 환경 모두 API 사용
    return loadQuestionsFromAPI();
  } catch (error) {
    console.error("질문 불러오기 중 오류:", error);
    return [];
  }
};

// 로컬 스토리지에서 질문을 불러오는 함수
const loadQuestionsFromLocalStorage = () => {
  try {
    const content = localStorage.getItem("questions") || "";
    return parseQuestionsFromText(content);
  } catch (error) {
    console.error("로컬 스토리지 불러오기 중 오류:", error);
    return [];
  }
};

// API에서 질문을 불러오는 함수
const loadQuestionsFromAPI = async () => {
  try {
    const result = await api.get("/api/get-data?type=questions");
    return result.questions || [];
  } catch (error) {
    console.error("API 불러오기 중 오류:", error);
    return [];
  }
};

// 텍스트를 파싱하여 질문 객체 배열로 변환하는 함수
const parseQuestionsFromText = (text) => {
  if (!text.trim()) {
    return [];
  }

  const questionBlocks = text.split("\n\n").filter((block) => block.trim());
  const questions = [];

  questionBlocks.forEach((block, index) => {
    const lines = block.split("\n");
    if (lines.length >= 2) {
      const headerLine = lines[0];
      const questionLine = lines[1];

      // [timestamp] author → target 형식 파싱
      const headerMatch = headerLine.match(/\[([^\]]+)\]\s*([^→]+)→\s*(.+)/);
      if (headerMatch) {
        const timestamp = headerMatch[1].trim();
        const author = headerMatch[2].trim();
        const target = headerMatch[3].trim();

        // 질문: question 형식 파싱
        const questionMatch = questionLine.match(/질문:\s*(.+)/);
        if (questionMatch) {
          const question = questionMatch[1].trim();

          questions.push({
            id: Date.now() + index, // 임시 ID
            author,
            target,
            question,
            timestamp,
          });
        }
      }
    }
  });

  return questions;
};

// 모든 질문을 텍스트 파일로 다운로드하는 함수
export const downloadAllQuestions = async () => {
  try {
    const result = await api.get("/api/get-data?type=questions");
    const content = result.rawText || "아직 저장된 질문이 없습니다.";

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "question.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("질문 다운로드 중 오류:", error);
  }
};

// 서버의 질문 저장소 초기화
export const clearQuestionStorage = async () => {
  try {
    const result = await api.delete("/api/clear-questions");
    console.log("질문 삭제 성공:", result.message);
    return true;
  } catch (error) {
    console.error("질문 삭제 중 오류:", error);
    return false;
  }
};
