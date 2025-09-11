import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../utils/api";

function AnswerUrlPage() {
  const { answererName } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [answerTexts, setAnswerTexts] = useState({});
  const [editingQuestions, setEditingQuestions] = useState(new Set());
  const [savingQuestions, setSavingQuestions] = useState(new Set());
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [currentRoundId, setCurrentRoundId] = useState(null);

  // 페이지 로드 시 현재 활성 회차 가져오기
  useEffect(() => {
    const loadCurrentRound = async () => {
      try {
        const data = await api.get("/api/admin?action=rounds&type=current");
        if (data.success && data.round) {
          setCurrentRoundId(data.round.id);
        }
      } catch (error) {
        console.error("현재 활성 회차 조회 오류:", error);
      }
    };
    loadCurrentRound();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError("비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setAuthError("");

    try {
      // 답변자 인증을 위한 API 호출
      const data = await api.get(
        `/api/answer?action=auth&answererName=${encodeURIComponent(
          answererName
        )}&password=${encodeURIComponent(password)}`
      );

      if (data.success) {
        setIsAuthenticated(true);
        setQuestions(data.questions);

        // 답변들을 객체로 변환
        const answersObj = {};
        data.answers.forEach((answer) => {
          answersObj[answer.question_id] = answer;
        });
        setAnswers(answersObj);

        // 답변 텍스트 초기화
        const answerTextsObj = {};
        data.answers.forEach((answer) => {
          answerTextsObj[answer.question_id] = answer.answer;
        });
        setAnswerTexts(answerTextsObj);
      } else {
        setAuthError(data.error || "비밀번호가 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("인증 오류:", error);
      setAuthError("인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnswer = async (questionId) => {
    const answerText = answerTexts[questionId] || "";
    if (!answerText.trim()) {
      return;
    }

    if (!currentRoundId) {
      console.error("현재 활성 회차가 없습니다.");
      return;
    }

    // 해당 질문만 저장 중 상태로 설정
    setSavingQuestions((prev) => new Set([...prev, questionId]));

    try {
      // 답변 저장 API 호출
      const data = await api.post("/api/answer?action=auth", {
        answererName: answererName,
        password: password,
        questionId: questionId,
        answer: answerText,
        roundId: currentRoundId,
      });

      if (data.success) {
        setAnswers((prev) => ({ ...prev, [questionId]: data.answer }));
        setEditingQuestions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });

        // 답변 텍스트 초기화
        setAnswerTexts((prev) => ({ ...prev, [questionId]: "" }));

        console.log("답변 저장 성공:", data.answer);

        // 다음 질문으로 자동 이동
        const currentIndex = questions.findIndex((q) => q.id === questionId);
        if (currentIndex < questions.length - 1) {
          const nextQuestionId = questions[currentIndex + 1].id;
          // 다음 질문의 답변 입력창으로 포커스
          setTimeout(() => {
            const nextTextarea = document.querySelector(
              `textarea[data-question-id="${nextQuestionId}"]`
            );
            if (nextTextarea) {
              nextTextarea.focus();
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error("답변 저장 오류:", error);
      console.error("요청 데이터:", {
        answererName,
        password: "***",
        questionId,
        answer: answerText,
        roundId: currentRoundId,
      });
      
      // 사용자에게 에러 메시지 표시
      alert(`답변 저장에 실패했습니다: ${error.message || "알 수 없는 오류"}`);
    } finally {
      // 해당 질문의 저장 중 상태 해제
      setSavingQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const handleEdit = (questionId) => {
    setEditingQuestions((prev) => new Set([...prev, questionId]));
  };

  const handleKeyPress = (e, questionId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveAnswer(questionId);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswerTexts((prev) => ({ ...prev, [questionId]: value }));
  };

  // 조건부 렌더링을 Hook 사용 후로 이동
  if (!isAuthenticated) {
    return (
      <div className="container">
        <header className="header">
          <h1>답변하기</h1>
          <p>{answererName}님의 질문에 답변하려면 비밀번호를 입력해주세요.</p>
        </header>

        <div className="password-form">
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="password">비밀번호</label>
              <div className="password-input-container">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="4자리 비밀번호를 입력하세요"
                  maxLength="4"
                  className="password-input"
                />
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "확인 중..." : "확인"}
                </button>
              </div>
            </div>
            {authError && <div className="error-message">{authError}</div>}
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">질문을 불러오는 중...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container">
        <header className="header">
          <h1>답변하기</h1>
          <p>{answererName}님에게 온 질문들에 답변해주세요!</p>
        </header>

        <div className="questions-list">
          <div className="questions-header">질문 목록 (0개)</div>
          <div className="no-questions">
            {answererName}님에게 온 질문이 없습니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>답변하기</h1>
        <p>{answererName}님에게 온 질문들에 답변해주세요!</p>
      </header>

      <div className="questions-list">
        <div className="questions-header">질문 목록 ({questions.length}개)</div>
        {questions.map((question) => (
          <div key={question.id} className="question-item answer-item">
            <div className="question-simple">
              [{question.target}] {question.question}
            </div>
            <div className="question-meta">
              <span className="question-timestamp">
                {new Date(question.created_at).toLocaleString()}
              </span>
            </div>

            {answers[question.id] && !editingQuestions.has(question.id) ? (
              <div className="answer-display">
                <div className="answer-header">
                  <div className="answer-label">답변:</div>
                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(question.id)}
                  >
                    수정
                  </button>
                </div>
                <div className="answer-content">
                  {answers[question.id].answer}
                </div>
                <div className="answer-meta">
                  <span>답변자: {answers[question.id].answerer}</span>
                  <span>
                    {new Date(answers[question.id].created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="answer-section">
                <div className="answer-input-container">
                  <textarea
                    className="answer-input"
                    placeholder="답변을 입력하세요... (Enter: 등록, Shift+Enter: 줄바꿈)"
                    rows="3"
                    value={answerTexts[question.id] || ""}
                    onChange={(e) =>
                      handleAnswerChange(question.id, e.target.value)
                    }
                    onKeyPress={(e) => handleKeyPress(e, question.id)}
                    data-question-id={question.id}
                  />
                  <button
                    className="answer-btn"
                    onClick={() => handleSaveAnswer(question.id)}
                    disabled={savingQuestions.has(question.id)}
                  >
                    {savingQuestions.has(question.id)
                      ? "저장 중..."
                      : "답변 등록"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnswerUrlPage;
