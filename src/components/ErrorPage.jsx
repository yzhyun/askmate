import React from "react";
import { useNavigate } from "react-router-dom";

function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <header className="header">
        <h1>접근 권한 없음</h1>
        <p>이 페이지에 접근할 권한이 없습니다.</p>
      </header>

      <div className="error-content">
        <div className="error-message">
          <h2>🚫 접근이 거부되었습니다</h2>
          <p>관리자 권한이 필요한 페이지입니다.</p>
          <p>관리자로 로그인하거나 올바른 링크를 사용해주세요.</p>
        </div>

        <div className="error-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate("/question")}
          >
            질문하기로 이동
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/admin")}
          >
            관리자 로그인
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
