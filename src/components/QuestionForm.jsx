import React, { useState, useEffect, useRef } from "react";

function QuestionForm({ onAddQuestion, onTargetChange }) {
  const [formData, setFormData] = useState({
    author: "",
    question: "",
    target: "",
  });
  const [availableTargets, setAvailableTargets] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);

  useEffect(() => {
    // 데이터베이스에서 대상자와 회원 목록을 가져옵니다
    const loadData = async () => {
      try {
        // 캐시 무효화 - 항상 최신 데이터를 가져옴
        sessionStorage.removeItem("cachedTargets");
        sessionStorage.removeItem("cachedMembers");

        // 캐시가 없으면 API 호출
        const [targetsResponse, membersResponse] = await Promise.all([
          fetch("/api/get-current-active-targets"),
          fetch("/api/get-members"),
        ]);

        // 응답이 JSON인지 확인
        const targetsContentType = targetsResponse.headers.get("content-type");
        const membersContentType = membersResponse.headers.get("content-type");

        if (
          !targetsContentType ||
          !targetsContentType.includes("application/json") ||
          !membersContentType ||
          !membersContentType.includes("application/json")
        ) {
          console.error("JSON 응답이 아닙니다");
          setError("데이터를 불러오는데 실패했습니다.");
          return;
        }

        const targetsData = await targetsResponse.json();
        const membersData = await membersResponse.json();

        if (targetsData.success) {
          const activeTargets = targetsData.targets.map((t) => t.name);
          setAvailableTargets(activeTargets);
          sessionStorage.setItem(
            "cachedTargets",
            JSON.stringify(activeTargets)
          );

          // 첫 번째 target 자동 선택
          if (activeTargets.length > 0) {
            setFormData((prev) => ({
              ...prev,
              target: activeTargets[0],
            }));
            if (onTargetChange) {
              onTargetChange(activeTargets[0]);
            }
          }
        }

        if (membersData.success) {
          console.log(
            "QuestionForm - API에서 받은 members:",
            membersData.members
          );
          setAvailableMembers(membersData.members);
          sessionStorage.setItem(
            "cachedMembers",
            JSON.stringify(membersData.members)
          );

          setFormData((prev) => ({
            ...prev,
            author: "",
          }));
        }
      } catch (error) {
        console.error("데이터를 불러오는데 실패했습니다:", error);
        // API 호출 실패 시 빈 배열로 설정
        setAvailableTargets([]);
        setAvailableMembers([]);
        setFormData((prev) => ({
          ...prev,
          author: "",
        }));
      }
    };

    loadData();
  }, [onTargetChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 대상자가 변경되면 상위 컴포넌트에 알림
    if (name === "target" && onTargetChange) {
      onTargetChange(value);
    }
  };

  // 엔터키 핸들러
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.author.trim() ||
      !formData.question.trim() ||
      !formData.target.trim()
    ) {
      alert("이름, 질문, 대상자를 모두 입력해주세요!");
      return;
    }

    onAddQuestion(formData);
    setFormData({
      author: formData.author, // 선택된 이름 유지
      question: "",
      target: formData.target, // 현재 선택된 답변자 유지
    });
  };

  return (
    <form className="question-form" onSubmit={handleSubmit}>
      <div className="question-header">
        <div className="form-group author-group">
          <select
            id="author"
            name="author"
            value={formData.author}
            onChange={handleChange}
          >
            <option value=""></option>
            {availableMembers.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
          <label htmlFor="author">님이</label>
        </div>

        <div className="form-group target-group">
          <select
            id="target"
            name="target"
            value={formData.target}
            onChange={handleChange}
          >
            {availableTargets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
          <label htmlFor="target">님에게 질문합니다.</label>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="question">질문</label>
        <div className="question-input-container">
          <textarea
            id="question"
            name="question"
            value={formData.question}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="궁금한 것을 질문해보세요... (Enter: 등록, Shift+Enter: 줄바꿈)"
          />
          <button type="submit" className="submit-btn">
            질문 등록하기
          </button>
        </div>
      </div>
    </form>
  );
}

export default QuestionForm;
