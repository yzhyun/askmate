import React, { useState, useEffect } from "react";
import { loadQuestionsFromServer } from "../utils/questionSaver";
import { api } from "../utils/api";

function AnswerPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState("전체");
  const [availableTargets, setAvailableTargets] = useState([]);
  const [answers, setAnswers] = useState({}); // 각 질문의 답변을 저장
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set()); // 답변이 완료된 질문 ID들
  const [editingQuestions, setEditingQuestions] = useState(new Set()); // 수정 중인 질문 ID들

  // 앱 로드 시 서버에서 질문과 대상자 불러오기
  useEffect(() => {
    const loadData = async () => {
      try {
        // 먼저 활성 회차가 있는지 확인
        const roundResponse = await fetch(
          "/api/rounds/current"
        );
        
        if (!roundResponse.ok) {
          console.error("API 호출 실패:", roundResponse.status);
          setQuestions([]);
          setAvailableTargets([]);
          return;
        }
        
        const contentType = roundResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("JSON 응답이 아닙니다:", contentType);
          setQuestions([]);
          setAvailableTargets([]);
          return;
        }
        
        const roundData = await api.get("/api/rounds/current");

        if (!roundData.success || !roundData.round) {
          setQuestions([]);
          setAvailableTargets([]);
          setLoading(false);
          return;
        }

        // 질문, 대상자, 답변을 병렬로 로드
        const [serverQuestions, targetsData, answersData] = await Promise.all([
          loadQuestionsFromServer(),
          api.get("/api/targets"),
          api.get("/api/get-data?type=answers"),
        ]);

        console.log("AnswerPage - 로드된 질문들:", serverQuestions);
        console.log("AnswerPage - 질문 개수:", serverQuestions.length);
        console.log("AnswerPage - 로드된 답변들:", answersData.answers);

        setQuestions(serverQuestions);

        // 답변들을 객체로 변환하여 저장
        const answersObj = {};
        answersData.answers.forEach((answer) => {
          answersObj[answer.question_id] = answer;
        });
        setAnswers(answersObj);

        // 답변이 있는 질문들을 answeredQuestions에 추가
        const answeredIds = new Set(
          answersData.answers.map((answer) => answer.question_id)
        );
        setAnsweredQuestions(answeredIds);

        // 데이터베이스에서 가져온 대상자 목록 사용
        if (targetsData.success) {
          const activeTargets = targetsData.targets
            .filter((t) => t.is_active)
            .map((t) => t.name);
          console.log("AnswerPage - 활성 대상자들:", activeTargets);
          setAvailableTargets(["전체", ...activeTargets]);
        } else {
          // 폴백: 질문에서 대상자 추출
          const targets = [...new Set(serverQuestions.map((q) => q.target))];
          console.log("AnswerPage - 폴백 대상자들:", targets);
          setAvailableTargets(["전체", ...targets]);
        }
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
        // 폴백: 질문에서만 대상자 추출
        try {
          const serverQuestions = await loadQuestionsFromServer();
          setQuestions(serverQuestions);
          const targets = [...new Set(serverQuestions.map((q) => q.target))];
          setAvailableTargets(["전체", ...targets]);
        } catch (fallbackError) {
          console.error("폴백 데이터 불러오기 실패:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 답변 저장 함수
  const saveAnswer = async (questionId, answerText) => {
    if (!answerText.trim()) {
      alert("답변을 입력해주세요!");
      return;
    }

    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    try {
      const result = await api.post("/api/save", {
        type: "answer",
        questionId: questionId,
        answerer: "익명",
        answer: answerText,
      });
      console.log("답변 저장 성공:", result.message);

      // 답변이 완료된 질문으로 표시
      setAnsweredQuestions((prev) => new Set([...prev, questionId]));

      // 답변 내용을 상태에 저장 (표시용)
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          id: result.answer?.id || questionId,
          question_id: questionId,
          answerer: "익명",
          answer: answerText,
          created_at: new Date().toISOString(),
        },
      }));

      return true; // 성공 여부 반환
    } catch (error) {
      console.error("답변 저장 중 오류:", error);
      alert("답변 저장에 실패했습니다.");
    }
  };

  // 답변 입력 핸들러
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer: value,
      },
    }));
  };

  // 엔터키 핸들러 - 답변 등록 후 다음 질문으로 포커스
  const handleKeyPress = async (e, questionId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const answerText = answers[questionId]?.answer || "";

      if (answerText.trim()) {
        let success = false;

        if (editingQuestions.has(questionId)) {
          // 수정 모드인 경우
          success = await updateAnswer(questionId, answerText);
        } else {
          // 새 답변 등록인 경우
          success = await saveAnswer(questionId, answerText);
        }

        // 성공한 경우에만 다음 질문으로 포커스 이동
        if (success) {
          focusNextQuestion(questionId);
        }
      }
    }
  };

  // 다음 질문으로 포커스 이동
  const focusNextQuestion = (currentQuestionId) => {
    const currentIndex = filteredQuestions.findIndex(
      (q) => q.id === currentQuestionId
    );
    if (currentIndex < filteredQuestions.length - 1) {
      const nextQuestionId = filteredQuestions[currentIndex + 1].id;
      setTimeout(() => {
        const nextTextarea = document.querySelector(
          `textarea[data-question-id="${nextQuestionId}"]`
        );
        if (nextTextarea) {
          nextTextarea.focus();
        }
      }, 100);
    }
  };

  // 답변 수정 시작
  const startEditing = (questionId) => {
    setEditingQuestions((prev) => new Set([...prev, questionId]));
    // 기존 답변 내용을 textarea에 설정
    if (answers[questionId]) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          answer: prev[questionId]?.answer || "",
        },
      }));
    }
  };

  // 답변 수정 취소
  const cancelEditing = (questionId) => {
    setEditingQuestions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
  };

  // 답변 수정 완료
  const updateAnswer = async (questionId, newAnswerText) => {
    if (!newAnswerText.trim()) {
      return;
    }

    try {
      const result = await api.post("/api/save", {
        type: "answer",
        questionId: questionId,
        answerer: "익명",
        answer: newAnswerText,
      });
      console.log("답변 수정 성공:", result.message);

      // 수정된 답변 내용을 상태에 저장
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          answer: newAnswerText,
          created_at: new Date().toISOString(),
        },
      }));

      // 수정 모드 종료
      setEditingQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });

      return true; // 성공 여부 반환
    } catch (error) {
      console.error("답변 수정 중 오류:", error);
      return false;
    }
  };

  // 선택된 대상자에 대한 질문만 필터링
  const filteredQuestions =
    selectedTarget === "전체"
      ? questions
      : questions.filter((q) => {
          console.log(
            `Comparing: "${q.target}" === "${selectedTarget}"`,
            q.target === selectedTarget
          );
          return q.target === selectedTarget;
        });

  // 디버깅을 위한 콘솔 로그
  console.log("Selected target:", selectedTarget);
  console.log("Selected target length:", selectedTarget.length);
  console.log(
    "Selected target char codes:",
    selectedTarget.split("").map((c) => c.charCodeAt(0))
  );
  console.log("All questions:", questions);
  console.log(
    "윤지현 질문들:",
    questions.filter((q) => q.target === "윤지현")
  );
  console.log(
    "김동현 질문들:",
    questions.filter((q) => q.target === "김동현")
  );

  // 윤지현과 김동현 질문의 target 필드 비교
  const yoonQuestions = questions.filter((q) => q.target === "윤지현");
  const kimQuestions = questions.filter((q) => q.target === "김동현");

  if (yoonQuestions.length > 0) {
    console.log("윤지현 질문 target 필드:", yoonQuestions[0].target);
    console.log(
      "윤지현 target char codes:",
      yoonQuestions[0].target.split("").map((c) => c.charCodeAt(0))
    );
  }

  if (kimQuestions.length > 0) {
    console.log("김동현 질문 target 필드:", kimQuestions[0].target);
    console.log(
      "김동현 target char codes:",
      kimQuestions[0].target.split("").map((c) => c.charCodeAt(0))
    );
  }

  console.log("Filtered questions:", filteredQuestions);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">질문을 불러오는 중...</div>
      </div>
    );
  }

  // 활성 회차가 없을 때 메시지 표시
  if (availableTargets.length === 0) {
    return (
      <div className="container">
        <div className="no-active-round">
          <h2>현재 활성 회차가 없습니다</h2>
          <p>관리자가 새 회차를 생성할 때까지 답변을 할 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>관리자 답변 페이지</h1>
        <p>모든 질문을 확인하고 관리자 권한으로 답변할 수 있습니다.</p>
      </header>

      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="target-filter">대상자 필터:</label>
          <select
            id="target-filter"
            value={selectedTarget}
            onChange={(e) => {
              console.log("Filter changed to:", e.target.value);
              setSelectedTarget(e.target.value);
            }}
            className="filter-select"
          >
            {availableTargets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
        </div>
        <div className="question-count">
          총 {filteredQuestions.length}개의 질문
        </div>
      </div>

      <div className="questions-list">
        {filteredQuestions.length === 0 ? (
          <div className="no-questions">
            {selectedTarget === "전체"
              ? "아직 받은 질문이 없습니다."
              : `${selectedTarget}님이 받은 질문이 없습니다.`}
          </div>
        ) : (
          <>
            <div className="questions-header">
              {selectedTarget === "전체"
                ? `모든 질문 (${filteredQuestions.length}개)`
                : `${selectedTarget}님이 받은 질문 (${filteredQuestions.length}개)`}
            </div>
            {filteredQuestions.map((question) => (
              <div key={question.id} className="question-item answer-item">
                <div className="question-simple">
                  [{question.target}] {question.question}
                </div>
                {answers[question.id] && !editingQuestions.has(question.id) ? (
                  <div className="answer-display">
                    <div className="answer-header">
                      <div className="answer-label">답변:</div>
                      <button
                        className="edit-btn"
                        onClick={() => startEditing(question.id)}
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
                        {new Date(
                          answers[question.id].created_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="answer-section">
                    <div className="answer-input-container">
                      <textarea
                        className="answer-input"
                        placeholder={
                          editingQuestions.has(question.id)
                            ? "답변을 수정하세요... (Enter: 등록, Shift+Enter: 줄바꿈)"
                            : "답변을 입력하세요... (Enter: 등록, Shift+Enter: 줄바꿈)"
                        }
                        rows="3"
                        value={
                          editingQuestions.has(question.id)
                            ? answers[question.id]?.answer || ""
                            : answers[question.id]?.answer || ""
                        }
                        onChange={(e) =>
                          handleAnswerChange(question.id, e.target.value)
                        }
                        onKeyPress={(e) => handleKeyPress(e, question.id)}
                        data-question-id={question.id}
                      />
                      {editingQuestions.has(question.id) ? (
                        <div className="edit-actions">
                          <button
                            className="save-btn"
                            onClick={() =>
                              updateAnswer(
                                question.id,
                                answers[question.id]?.answer || ""
                              )
                            }
                          >
                            수정 완료
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => cancelEditing(question.id)}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          className="answer-btn"
                          onClick={() =>
                            saveAnswer(
                              question.id,
                              answers[question.id]?.answer || ""
                            )
                          }
                        >
                          등록
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default AnswerPage;
