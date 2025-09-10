import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import QuestionForm from "./components/QuestionForm";
import QuestionsList from "./components/QuestionsList";
import AnswerPage from "./components/AnswerPage";
import AnswerUrlPage from "./components/AnswerUrlPage";
import AdminPage from "./components/AdminPage";
import ErrorPage from "./components/ErrorPage";
import {
  saveQuestionToFile,
  loadQuestionsFromServer,
} from "./utils/questionSaver";

// 네비게이션 컴포넌트
function Navigation() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 관리자 인증 상태 확인
    const checkAdminStatus = () => {
      const adminStatus = localStorage.getItem("adminAuthenticated");
      setIsAdmin(adminStatus === "true");
    };

    checkAdminStatus();

    // localStorage 변경 감지
    const handleStorageChange = (e) => {
      if (e.key === "adminAuthenticated") {
        checkAdminStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // 같은 탭에서의 localStorage 변경 감지
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (key === "adminAuthenticated") {
        checkAdminStatus();
      }
    };

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  // 관리자가 아니면 네비게이션 숨김
  if (!isAdmin) {
    return null;
  }

  return (
    <nav className="nav-links">
      <Link
        to="/question"
        className={`nav-link ${
          location.pathname === "/question" ? "active" : ""
        }`}
      >
        📝 질문하기
      </Link>
      <Link
        to="/answer"
        className={`nav-link ${
          location.pathname === "/answer" ? "active" : ""
        }`}
      >
        💬 관리자 답변
      </Link>
      <Link
        to="/admin"
        className={`nav-link ${location.pathname === "/admin" ? "active" : ""}`}
      >
        ⚙️ 관리자
      </Link>
    </nav>
  );
}

// 관리자 인증이 필요한 컴포넌트 래퍼
function AdminProtectedRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = () => {
      const adminStatus = localStorage.getItem("adminAuthenticated");
      setIsAdmin(adminStatus === "true");
      setIsLoading(false);
    };

    checkAdminStatus();
  }, []);

  if (isLoading) {
    return <div className="loading">인증 확인 중...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/error" replace />;
  }

  return children;
}

// 질문하기 페이지 컴포넌트
function QuestionPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState("전체");

  // 앱 로드 시 서버에서 질문 불러오기
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // 캐시된 질문이 있는지 확인
        const cachedQuestions = sessionStorage.getItem("cachedQuestions");

        if (cachedQuestions) {
          const questions = JSON.parse(cachedQuestions);
          setQuestions(questions);
          setLoading(false);
          return;
        }

        // 캐시가 없으면 서버에서 로드
        const serverQuestions = await loadQuestionsFromServer();
        setQuestions(serverQuestions);
        sessionStorage.setItem(
          "cachedQuestions",
          JSON.stringify(serverQuestions)
        );
      } catch (error) {
        console.error("질문 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  const addQuestion = async (questionData) => {
    const newQuestion = {
      id: Date.now(),
      author: questionData.author,
      question: questionData.question,
      target: questionData.target,
      timestamp: new Date().toLocaleString("ko-KR"),
    };

    const updatedQuestions = [newQuestion, ...questions];
    setQuestions(updatedQuestions);

    // 캐시 업데이트
    sessionStorage.setItem("cachedQuestions", JSON.stringify(updatedQuestions));

    // 질문을 텍스트 파일로 저장
    await saveQuestionToFile(newQuestion);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>질문하기</h1>
        <p>궁금한 것을 자유롭게 질문해보세요!</p>
      </header>

      <QuestionForm
        onAddQuestion={addQuestion}
        onTargetChange={setSelectedTarget}
      />
      {loading ? (
        <div className="loading">질문을 불러오는 중...</div>
      ) : (
        <QuestionsList questions={questions} selectedTarget={selectedTarget} />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/question" element={<QuestionPage />} />
          <Route
            path="/answer"
            element={
              <AdminProtectedRoute>
                <AnswerPage />
              </AdminProtectedRoute>
            }
          />
          <Route path="/answer/:answererName" element={<AnswerUrlPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/" element={<QuestionPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
