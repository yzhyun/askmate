import React from "react";

function QuestionsList({ questions, selectedTarget }) {
  // 선택된 대상자에 대한 질문만 필터링
  const filteredQuestions =
    selectedTarget && selectedTarget !== "전체"
      ? questions.filter((q) => q.target === selectedTarget)
      : questions;

  if (questions.length === 0) {
    return (
      <div className="questions-list">
        <div className="questions-header">질문 목록</div>
        <div className="no-questions">
          아직 등록된 질문이 없습니다. 첫 번째 질문을 등록해보세요!
        </div>
      </div>
    );
  }

  return (
    <div className="questions-list">
      <div className="questions-header">
        질문 목록 ({filteredQuestions.length}개)
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="no-questions">
          {selectedTarget
            ? `${selectedTarget}에게 한 질문이 없습니다.`
            : "아직 등록된 질문이 없습니다."}
        </div>
      ) : (
        filteredQuestions.map((question) => (
          <div key={question.id} className="question-item">
            <div className="question-simple">
              [{question.target}] {question.question}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default QuestionsList;
