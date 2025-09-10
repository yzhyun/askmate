// API 기본 URL 설정 (로컬 개발 vs 프로덕션)
export const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

// 안전한 JSON 파싱 함수
export async function safeJsonParse(response) {
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    console.error("JSON 응답이 아닙니다:", contentType);
    throw new Error("서버 응답이 JSON 형식이 아닙니다.");
  }

  return await response.json();
}

// 안전한 fetch 함수 (JSON 응답 검증 포함)
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return await safeJsonParse(response);
  } catch (error) {
    console.error("API 호출 오류:", error);
    throw error;
  }
}

// API 호출 헬퍼 함수들
export const api = {
  // GET 요청
  async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await safeJsonParse(response);
    } catch (error) {
      console.error(`GET ${endpoint} 오류:`, error);
      throw error;
    }
  },

  // POST 요청
  async post(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await safeJsonParse(response);
    } catch (error) {
      console.error(`POST ${endpoint} 오류:`, error);
      throw error;
    }
  },

  // PUT 요청
  async put(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await safeJsonParse(response);
    } catch (error) {
      console.error(`PUT ${endpoint} 오류:`, error);
      throw error;
    }
  },

  // DELETE 요청
  async delete(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await safeJsonParse(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} 오류:`, error);
      throw error;
    }
  },
};
