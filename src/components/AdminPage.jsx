import React, { useState, useEffect } from "react";

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [activeTab, setActiveTab] = useState("rounds");
  const [members, setMembers] = useState([]);
  const [targets, setTargets] = useState([]);
  const [answererPasswords, setAnswererPasswords] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 새 멤버/회차 추가 폼 상태
  const [newMemberName, setNewMemberName] = useState("");
  const [newTargetName, setNewTargetName] = useState("");
  const [selectedAnswerers, setSelectedAnswerers] = useState([]);
  const [roundQuestions, setRoundQuestions] = useState({});
  const [isCreatingRound, setIsCreatingRound] = useState(false);
  const [unaskedMembers, setUnaskedMembers] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  // 질문과 답변 조회 관련 상태
  const [selectedRoundForQA, setSelectedRoundForQA] = useState("");
  const [selectedAnswererForQA, setSelectedAnswererForQA] = useState("");
  const [qaData, setQaData] = useState([]);
  const [loadingQA, setLoadingQA] = useState(false);

  // API 기본 URL
  const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

  // 답변자 통계 로드 함수
  const loadAnswererStats = async (roundsData, targetsData) => {
    const answererStats = {};
    for (const round of roundsData) {
      answererStats[round.id] = {};

      // 해당 회차의 targets만 필터링
      const roundTargets = targetsData.filter(
        (target) => target.round_id === round.id
      );

      try {
        const questionsRes = await fetch(
          `${API_BASE}/api/rounds/${round.id}/questions`,
          { cache: "no-cache" }
        );
        const answersRes = await fetch(
          `${API_BASE}/api/rounds/${round.id}/answers`,
          { cache: "no-cache" }
        );

        if (questionsRes.ok && answersRes.ok) {
          const questions = await questionsRes.json();
          const answers = await answersRes.json();

          const questionList = questions.questions || [];
          const answerList = answers.answers || [];

          roundTargets.forEach((target) => {
            const questionCount = questionList.filter(
              (q) => q.target === target.name
            ).length;
            const answerCount = answerList.filter(
              (a) => a.answerer === target.name
            ).length;
            answererStats[round.id][target.name] = {
              questions: questionCount,
              answers: answerCount,
            };
          });
        } else {
          roundTargets.forEach((target) => {
            answererStats[round.id][target.name] = {
              questions: 0,
              answers: 0,
            };
          });
        }
      } catch (error) {
        console.error(`회차 ${round.id} 통계 조회 오류:`, error);
        roundTargets.forEach((target) => {
          answererStats[round.id][target.name] = {
            questions: 0,
            answers: 0,
          };
        });
      }
    }
    setRoundQuestions(answererStats);
  };

  useEffect(() => {
    // 인증 상태 확인
    const authStatus = localStorage.getItem("adminAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  const handlePasswordSubmit = async () => {
    if (!adminPassword.trim()) {
      setMessage("비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem("adminAuthenticated", "true");
        loadData();
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          setMessage(errorData.error || "인증에 실패했습니다.");
        } else {
          setMessage("서버 응답 오류가 발생했습니다.");
        }
      }
    } catch (error) {
      setMessage("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, targetsRes, passwordsRes, roundsRes, currentRoundRes] =
        await Promise.all([
          fetch(`${API_BASE}/api/get-members`, { cache: "no-cache" }),
          fetch(`${API_BASE}/api/get-targets`, { cache: "no-cache" }),
          fetch(`${API_BASE}/api/get-answerer-passwords`, {
            cache: "no-cache",
          }),
          fetch(`${API_BASE}/api/rounds`, { cache: "no-cache" }),
          fetch(`${API_BASE}/api/rounds/current`, { cache: "no-cache" }),
        ]);

      // 먼저 기본 데이터들을 로드
      let membersData = [];
      let targetsData = [];
      let passwordsData = [];
      let roundsData = [];
      let currentRoundData = null;

      if (membersRes.ok) {
        const contentType = membersRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await membersRes.json();
          membersData = data.members || [];
          setMembers(membersData);
        }
      }

      if (targetsRes.ok) {
        const contentType = targetsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await targetsRes.json();
          targetsData = data.targets || [];
          setTargets(targetsData);
        }
      }

      if (passwordsRes.ok) {
        const contentType = passwordsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await passwordsRes.json();
          passwordsData = data.passwords || [];
          setAnswererPasswords(passwordsData);
        }
      }

      if (roundsRes.ok) {
        const contentType = roundsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await roundsRes.json();
          roundsData = data.rounds || [];
          setRounds(roundsData);
        }
      }

      if (currentRoundRes.ok) {
        const contentType = currentRoundRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await currentRoundRes.json();
          currentRoundData = data.round;
          setCurrentRound(currentRoundData);
        }
      }

      // 통계 데이터는 기본 데이터 로드 후 별도로 로드
      setTimeout(() => {
        loadAnswererStats(roundsData, targetsData);
      }, 100);
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      setMessage("데이터 로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const showModalMessage = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setShowModal(true);
  };

  // 멤버 관리
  const addMember = async () => {
    if (!newMemberName.trim()) {
      showMessage("멤버 이름을 입력해주세요.", true);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/add-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMemberName.trim() }),
      });

      if (response.ok) {
        setNewMemberName("");
        loadData();
        showMessage("멤버가 추가되었습니다.");
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          showMessage(error.error || "멤버 추가에 실패했습니다.", true);
        } else {
          showMessage("서버 응답 오류가 발생했습니다.", true);
        }
      }
    } catch (error) {
      showMessage("멤버 추가에 실패했습니다.", true);
    }
  };

  const deactivateMember = async (memberId) => {
    if (!confirm("이 멤버를 비활성화하시겠습니까?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/deactivate-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        loadData();
        showMessage("멤버가 비활성화되었습니다.");
      } else {
        showMessage("멤버 비활성화에 실패했습니다.", true);
      }
    } catch (error) {
      showMessage("멤버 비활성화에 실패했습니다.", true);
    }
  };

  // 답변자 링크 생성
  const generateAnswerUrl = async (answererName) => {
    try {
      const response = await fetch(`${API_BASE}/api/generate-answer-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answererName }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("JSON 응답이 아닙니다:", contentType);
        return;
      }
      const data = await response.json();
        const url = `${window.location.origin}/answer/${answererName}`;
        navigator.clipboard.writeText(url);
        showMessage(`링크가 클립보드에 복사되었습니다: ${url}`);
      } else {
        showMessage("링크 생성에 실패했습니다.", true);
      }
    } catch (error) {
      showMessage("링크 생성에 실패했습니다.", true);
    }
  };

  // 질문하지 않은 멤버 조회
  const getUnaskedMembers = async (answererName) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/unasked-members/${answererName}`
      );
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("JSON 응답이 아닙니다:", contentType);
        return;
      }
      const data = await response.json();

      if (data.success) {
        setUnaskedMembers((prev) => ({
          ...prev,
          [answererName]: data.unaskedMembers,
        }));

        if (data.unaskedMembers.length > 0) {
          // 5명씩 줄바꿈하여 표시
          const chunks = [];
          for (let i = 0; i < data.unaskedMembers.length; i += 5) {
            chunks.push(data.unaskedMembers.slice(i, i + 5).join(" "));
          }
          showModalMessage(
            `${answererName}님에게 질문하지 않은 멤버`,
            chunks.join("\n")
          );
        } else {
          showMessage(`${answererName}님에게 모든 멤버가 질문했습니다!`);
        }
      } else {
        showMessage("질문하지 않은 멤버 조회에 실패했습니다.", true);
      }
    } catch (error) {
      showMessage("질문하지 않은 멤버 조회에 실패했습니다.", true);
    }
  };

  // 회차 관리
  const addRound = async () => {
    if (selectedAnswerers.length === 0) {
      showMessage("최소 1명의 답변자를 선택해주세요.", true);
      return;
    }

    setIsCreatingRound(true);
    try {
      // 현재 날짜로 회차 제목 생성
      const today = new Date();
      const roundTitle = `${today.getFullYear()}년 ${
        today.getMonth() + 1
      }월 ${today.getDate()}일 회차`;

      const response = await fetch(`${API_BASE}/api/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: roundTitle,
          description: `생성일: ${today.toLocaleDateString()}`,
        }),
      });

      if (response.ok) {
        const roundData = await response.json();
        const newRoundId = roundData.round.id;

        // 선택된 답변자들을 타겟으로 추가
        const answererInfo = [];
        for (const answererName of selectedAnswerers) {
          // 답변자 추가
          await fetch(`${API_BASE}/api/add-target`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: answererName }),
          });

          // 4자리 비밀번호 생성 및 설정
          const autoPassword = Math.floor(
            1000 + Math.random() * 9000
          ).toString();
          await fetch(`${API_BASE}/api/set-answerer-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answererName: answererName,
              password: autoPassword,
            }),
          });

          // 답변자 정보 저장
          answererInfo.push({
            name: answererName,
            password: autoPassword,
            url: `${window.location.origin}/answer/${answererName}`,
          });
        }

        setSelectedAnswerers([]);
        loadData();

        showMessage(
          `새 회차가 생성되었고 이전 회차가 자동으로 종료되었습니다. ${selectedAnswerers.length}명의 답변자가 설정되었습니다.`
        );
      } else {
        const error = await response.json();
        showMessage(error.error || "회차 추가에 실패했습니다.", true);
      }
    } catch (error) {
      console.error("회차 추가 오류:", error);
      showMessage(`회차 추가에 실패했습니다: ${error.message}`, true);
    } finally {
      setIsCreatingRound(false);
    }
  };

  const clearAllData = async () => {
    if (
      !window.confirm(
        "⚠️ 경고: 모든 데이터를 삭제하시겠습니까?\n\n" +
          "• 모든 회차 데이터\n" +
          "• 모든 질문과 답변\n" +
          "• 모든 답변자 정보\n" +
          "• 모든 비밀번호\n\n" +
          "이 작업은 되돌릴 수 없습니다!"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/clear-all-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        loadData();
        showMessage("모든 데이터가 삭제되었습니다.");
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
        showMessage(errorData.error || "데이터 삭제에 실패했습니다.", true);
      }
    } catch (error) {
      showMessage("데이터 삭제 중 오류가 발생했습니다.", true);
    }
  };

  const dropForeignKeys = async () => {
    if (
      !window.confirm(
        "외래키 제약조건을 제거하시겠습니까?\n\n" +
          "이 작업은 데이터베이스 구조를 변경합니다.\n" +
          "삭제 작업이 더 자유로워집니다."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/drop-foreign-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        showMessage("외래키 제약조건이 제거되었습니다.");
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
        showMessage(
          errorData.error || "외래키 제약조건 제거에 실패했습니다.",
          true
        );
      }
    } catch (error) {
      showMessage("외래키 제약조건 제거 중 오류가 발생했습니다.", true);
    }
  };

  // 답변자 선택 관리
  const addAnswerer = async () => {
    if (!newTargetName.trim()) {
      showMessage("질문자를 선택해주세요.", true);
      return;
    }

    if (selectedAnswerers.includes(newTargetName)) {
      showMessage("이미 선택된 답변자입니다.", true);
      return;
    }

    setSelectedAnswerers((prev) => [...prev, newTargetName]);
    setNewTargetName("");
  };

  // 답변자 직접 추가 (콤보에서 선택 시)
  const addAnswererDirectly = (answererName) => {
    if (selectedAnswerers.includes(answererName)) {
      showMessage("이미 선택된 답변자입니다.", true);
      return;
    }

    setSelectedAnswerers((prev) => [...prev, answererName]);
  };

  // 질문과 답변 조회 함수
  const loadQAData = async () => {
    if (!selectedRoundForQA || !selectedAnswererForQA) {
      showMessage("회차와 답변자를 모두 선택해주세요.", true);
      return;
    }

    setLoadingQA(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/qa-data/${selectedRoundForQA}/${selectedAnswererForQA}`,
        { cache: "no-cache" }
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("JSON 응답이 아닙니다:", contentType);
        return;
      }
      const data = await response.json();
        setQaData(data.qaData || []);
        if (data.qaData && data.qaData.length === 0) {
          showMessage("해당 회차와 답변자에 대한 질문과 답변이 없습니다.");
        }
      } else {
        const error = await response.json();
        showMessage(error.error || "질문과 답변 조회에 실패했습니다.", true);
      }
    } catch (error) {
      console.error("질문과 답변 조회 오류:", error);
      showMessage("질문과 답변 조회 중 오류가 발생했습니다.", true);
    } finally {
      setLoadingQA(false);
    }
  };

  // 클립보드 복사 함수
  const copyQAToClipboard = async () => {
    if (qaData.length === 0) {
      showMessage("복사할 내용이 없습니다.", true);
      return;
    }

    const selectedRound = rounds.find(
      (r) => r.id === parseInt(selectedRoundForQA)
    );
    const roundTitle = selectedRound
      ? `${selectedRound.round_number}회차`
      : "회차";

    const qaText = qaData
      .map((qa, index) => {
        return `Q${index + 1}. ${qa.question}\nA${index + 1}. ${
          qa.answer || "(답변 없음)"
        }\n`;
      })
      .join("\n");

    const fullText = `${roundTitle} - ${selectedAnswererForQA}님의 질문과 답변\n\n${qaText}`;

    try {
      await navigator.clipboard.writeText(fullText);
      showMessage("질문과 답변이 클립보드에 복사되었습니다.");
    } catch (error) {
      showMessage("클립보드 복사에 실패했습니다.", true);
    }
  };

  const removeAnswerer = (memberName) => {
    setSelectedAnswerers((prev) => prev.filter((name) => name !== memberName));
  };

  // 인증되지 않은 경우 비밀번호 입력 폼 표시
  if (!isAuthenticated) {
    return (
      <div className="container">
        <header className="header">
          <h1>관리자 페이지</h1>
          <p>비밀번호를 입력해주세요.</p>
        </header>

        <div className="admin-login-form">
          <div className="form-group">
            <label htmlFor="adminPassword">관리자 비밀번호</label>
            <input
              type="password"
              id="adminPassword"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="관리자 비밀번호를 입력하세요"
              disabled={loading}
              className="admin-password-input"
            />
          </div>

          {message && <div className="error-message">{message}</div>}

          <button
            onClick={handlePasswordSubmit}
            className="admin-login-btn"
            disabled={loading}
          >
            {loading ? "인증 중..." : "로그인"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>관리자 페이지</h1>
        <p>질문자와 답변자를 관리하고 비밀번호를 설정할 수 있습니다.</p>
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem("adminAuthenticated");
            setIsAuthenticated(false);
            // 네비게이션 업데이트를 위해 storage 이벤트 발생
            window.dispatchEvent(
              new StorageEvent("storage", {
                key: "adminAuthenticated",
                newValue: null,
              })
            );
          }}
        >
          로그아웃
        </button>
      </header>

      {message && (
        <div
          className={`message ${
            message.includes("실패") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === "rounds" ? "active" : ""}`}
          onClick={() => setActiveTab("rounds")}
        >
          회차 관리
        </button>
        <button
          className={`tab-button ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          질문자 관리
        </button>
        <button
          className={`tab-button ${activeTab === "qa-viewer" ? "active" : ""}`}
          onClick={() => setActiveTab("qa-viewer")}
        >
          질문과 답변
        </button>
      </div>

      {loading && <div className="loading">로딩 중...</div>}

      {/* 회차 관리 탭 */}
      {activeTab === "rounds" && (
        <div className="admin-section">
          <h2>회차 관리</h2>

          {/* 새 회차 추가 */}
          <div className="add-round-section">
            <div className="add-round-card">
              {" "}
              <div className="answerer-selection">
                <div className="selection-info">
                  {selectedAnswerers.length > 0 ? (
                    <div className="answerer-tags">
                      {selectedAnswerers.map((name, index) => (
                        <span key={index} className="answerer-tag">
                          {name}
                          <button
                            type="button"
                            onClick={() => removeAnswerer(name)}
                            className="remove-answerer-btn"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="selection-count">
                      답변자를 선택해주세요
                    </span>
                  )}
                </div>
                <div className="selection-controls">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addAnswererDirectly(e.target.value);
                      }
                    }}
                    className="form-select-small"
                    style={{ width: "120px" }}
                  >
                    <option value="">답변자 선택</option>
                    {members
                      .filter((member) => member.is_active)
                      .filter(
                        (member) => !selectedAnswerers.includes(member.name)
                      )
                      .map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={addRound}
                    className="create-round-btn"
                    disabled={isCreatingRound}
                  >
                    {isCreatingRound ? "회차 생성 중..." : "새 회차 생성"}
                  </button>
                </div>

                {/* 로딩 애니메이션 */}
                {isCreatingRound && (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">
                      회차를 생성하고 답변자를 설정하는 중입니다... 🎯
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 회차 목록 */}
          <div className="rounds-list-section">
            <h3>회차 목록</h3>
            <div className="rounds-count">총 {rounds.length}개 회차</div>
            <div className="rounds-grid">
              {rounds.map((round) => {
                // 해당 회차의 답변자만 표시
                const roundTargets = targets.filter(
                  (target) => target.round_id === round.id
                );
                const allPasswords = answererPasswords;

                return (
                  <div
                    key={round.id}
                    className={`round-card ${round.is_active ? "active" : ""}`}
                  >
                    <div className="round-card-header">
                      <h4 className="round-card-title">
                        {round.round_number}회차(
                        {new Date(round.created_at).toLocaleDateString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}{" "}
                        생성)
                      </h4>
                      {round.is_active && (
                        <span className="active-badge">현재 활성</span>
                      )}
                    </div>

                    <div className="round-card-info">
                      <div className="round-answerers">
                        <h5>답변자 정보</h5>
                        <div className="answerers-list">
                          {roundTargets.map((target) => {
                            const passwordInfo = allPasswords.find(
                              (p) => p.answerer_name === target.name
                            );
                            const answerUrl = `${window.location.origin}/answer/${target.name}`;

                            // 해당 회차의 답변자 통계 가져오기
                            const stats = roundQuestions[round.id]?.[
                              target.name
                            ] || { questions: 0, answers: 0 };

                            return (
                              <div
                                key={target.id}
                                className="answerer-item-single"
                              >
                                <span className="answerer-name">
                                  {target.name}
                                </span>
                                <span className="answerer-stats">
                                  {stats.answers}/{stats.questions}
                                </span>
                                {passwordInfo && (
                                  <span className="answerer-password">
                                    패스워드: {passwordInfo.password}
                                  </span>
                                )}
                                <span className="answer-link">{answerUrl}</span>
                                <button
                                  onClick={() => generateAnswerUrl(target.name)}
                                  className="copy-link-btn"
                                >
                                  복사
                                </button>
                                <button
                                  onClick={() => getUnaskedMembers(target.name)}
                                  className="unasked-btn"
                                >
                                  질문안함({members.length - stats.questions})
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 질문자 관리 탭 */}
      {activeTab === "members" && (
        <div className="admin-section">
          <h2>질문자 관리</h2>

          <div className="add-form">
            <h3>새 질문자 추가</h3>
            <div className="form-row">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="질문자 이름"
                className="form-input"
              />
              <button onClick={addMember} className="add-btn">
                추가
              </button>
            </div>
          </div>

          <div className="list-section">
            <h3>질문자 목록 ({members.filter((m) => m.is_active).length}명)</h3>
            <div className="member-list">
              {members
                .filter((m) => m.is_active)
                .map((member) => (
                  <div key={member.id} className="list-item">
                    <span className="item-name">{member.name}</span>
                    <button
                      onClick={() => deactivateMember(member.id)}
                      className="deactivate-btn"
                    >
                      비활성화
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <pre>{modalContent}</pre>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={() => setShowModal(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 질문과 답변 조회 탭 */}
      {activeTab === "qa-viewer" && (
        <div className="admin-section">
          <h2>질문과 답변</h2>

          <div className="qa-viewer-controls">
            <div className="form-row">
              <div className="form-group">
                <label></label>
                <select
                  value={selectedRoundForQA}
                  onChange={(e) => setSelectedRoundForQA(e.target.value)}
                  className="form-select"
                >
                  <option value="">회차를 선택하세요</option>
                  {rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      {round.round_number}회차 (
                      {new Date(round.created_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      생성)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label></label>
                <select
                  value={selectedAnswererForQA}
                  onChange={(e) => setSelectedAnswererForQA(e.target.value)}
                  className="form-select"
                >
                  <option value="">답변자를 선택하세요</option>
                  {selectedRoundForQA &&
                    targets
                      .filter(
                        (target) =>
                          target.round_id === parseInt(selectedRoundForQA)
                      )
                      .map((target) => (
                        <option key={target.id} value={target.name}>
                          {target.name}
                        </option>
                      ))}
                </select>
              </div>

              <div className="form-group">
                <label></label>
                <button
                  onClick={loadQAData}
                  className="btn-primary"
                  disabled={
                    !selectedRoundForQA || !selectedAnswererForQA || loadingQA
                  }
                >
                  {loadingQA ? "조회 중..." : "조회"}
                </button>
              </div>
            </div>
          </div>

          {qaData.length > 0 && (
            <div className="qa-results">
              <div className="qa-header">
                <h3>
                  {
                    rounds.find((r) => r.id === parseInt(selectedRoundForQA))
                      ?.round_number
                  }
                  회차 - {selectedAnswererForQA}님
                </h3>
                <button onClick={copyQAToClipboard} className="btn-secondary">
                  클립보드 복사
                </button>
              </div>

              <div className="qa-list">
                {qaData.map((qa, index) => (
                  <div key={qa.question_id || index} className="qa-item">
                    <div className="question">
                      <strong>Q{index + 1}.</strong> {qa.question}
                    </div>
                    <div className="answer">
                      <strong>A{index + 1}.</strong>{" "}
                      {qa.answer || "(답변 없음)"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
