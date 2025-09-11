import { sql } from "@vercel/postgres";
import { getAllTargets } from "../src/utils/database.js";

export default async function handler(req, res) {
  const { action } = req.query;

  // 데이터베이스 연결 테스트
  try {
    console.log("데이터베이스 연결 테스트 시작");
    const testQuery = await sql`SELECT 1 as test`;
    console.log("데이터베이스 연결 성공:", testQuery.rows);

    // 테이블 존재 여부 확인
    const tablesQuery = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rounds', 'answerer_passwords', 'members', 'targets', 'questions', 'answers')
      ORDER BY table_name
    `;
    console.log("존재하는 테이블들:", tablesQuery.rows);
  } catch (dbError) {
    console.error("데이터베이스 연결 실패:", dbError);
    return res.status(500).json({
      success: false,
      error: "데이터베이스 연결에 실패했습니다.",
      details: dbError.message,
    });
  }

  // 관리자 인증
  if (action === "login") {
    if (req.method === "GET") {
      try {
        const { password } = req.query;

        if (!password) {
          return res.status(400).json({ error: "비밀번호를 입력해주세요." });
        }

        // 관리자 비밀번호 확인
        const result = await sql`
          SELECT password FROM admin_auth WHERE id = 1
        `;

        if (result.rows.length === 0) {
          return res
            .status(401)
            .json({ error: "관리자 비밀번호가 설정되지 않았습니다." });
        }

        const storedPassword = result.rows[0].password;

        if (password === storedPassword) {
          res.status(200).json({
            success: true,
            message: "관리자 인증 성공",
          });
        } else {
          res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
        }
      } catch (error) {
        console.error("관리자 로그인 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 관리자 비밀번호 설정
  else if (action === "set-password") {
    if (req.method === "POST") {
      try {
        const { password } = req.body;

        if (!password) {
          return res.status(400).json({ error: "비밀번호를 입력해주세요." });
        }

        // 관리자 비밀번호 설정/업데이트
        const result = await sql`
          INSERT INTO admin_auth (id, password)
          VALUES (1, ${password})
          ON CONFLICT (id)
          DO UPDATE SET password = EXCLUDED.password
          RETURNING id, password
        `;

        res.status(200).json({
          success: true,
          message: "관리자 비밀번호가 설정되었습니다.",
        });
      } catch (error) {
        console.error("관리자 비밀번호 설정 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 멤버 관리
  else if (action === "members") {
    if (req.method === "GET") {
      // 멤버 목록 조회
      try {
        const result = await sql`
          SELECT id, name, is_active, created_at 
          FROM members 
          ORDER BY created_at DESC
        `;
        res.status(200).json({ success: true, members: result.rows });
      } catch (error) {
        console.error("멤버 조회 오류:", error);
        res.status(500).json({ error: "멤버 조회에 실패했습니다." });
      }
    } else if (req.method === "POST") {
      // 멤버 추가
      try {
        const { name } = req.body;

        if (!name || !name.trim()) {
          return res.status(400).json({ error: "멤버 이름이 필요합니다." });
        }

        const result = await sql`
          INSERT INTO members (name) 
          VALUES (${name.trim()}) 
          RETURNING id, name, is_active, created_at
        `;

        res.status(200).json({
          success: true,
          message: "멤버가 추가되었습니다.",
          member: result.rows[0],
        });
      } catch (error) {
        console.error("멤버 추가 오류:", error);
        if (error.code === "23505") {
          res.status(400).json({ error: "이미 존재하는 멤버입니다." });
        } else {
          res.status(500).json({ error: "멤버 추가에 실패했습니다." });
        }
      }
    } else if (req.method === "PUT") {
      // 멤버 비활성화
      try {
        const { memberId } = req.body;

        if (!memberId) {
          return res.status(400).json({ error: "멤버 ID가 필요합니다." });
        }

        const result = await sql`
          UPDATE members 
          SET is_active = false 
          WHERE id = ${memberId}
          RETURNING id, name, is_active
        `;

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "멤버를 찾을 수 없습니다." });
        }

        res.status(200).json({
          success: true,
          message: "멤버가 비활성화되었습니다.",
          member: result.rows[0],
        });
      } catch (error) {
        console.error("멤버 비활성화 오류:", error);
        res.status(500).json({ error: "멤버 비활성화에 실패했습니다." });
      }
    }
  }
  // 타겟 관리
  else if (action === "targets") {
    if (req.method === "GET") {
      // 타겟 목록 조회 (통계 정보 포함)
      try {
        const { includeStats } = req.query;
        const targets = await getAllTargets();

        if (includeStats === "true") {
          // 통계 정보 포함하여 반환
          const targetsWithStats = await Promise.all(
            targets.map(async (target) => {
              try {
                // 해당 답변자에게 온 질문 수
                const questionsResult = await sql`
                  SELECT COUNT(*) as count FROM questions 
                  WHERE target = ${target.name} AND round_id = ${target.round_id}
                `;

                // 해당 답변자의 답변 수
                const answersResult = await sql`
                  SELECT COUNT(*) as count FROM answers a
                  JOIN questions q ON a.question_id = q.id
                  WHERE a.answerer = ${target.name} AND q.round_id = ${target.round_id}
                `;

                return {
                  ...target,
                  questionCount: parseInt(questionsResult.rows[0].count),
                  answerCount: parseInt(answersResult.rows[0].count),
                };
              } catch (error) {
                console.error(`타겟 ${target.name} 통계 조회 오류:`, error);
                return {
                  ...target,
                  questionCount: 0,
                  answerCount: 0,
                };
              }
            })
          );

          res.status(200).json({ success: true, targets: targetsWithStats });
        } else {
          res.status(200).json({ success: true, targets: targets });
        }
      } catch (error) {
        console.error("대상자 조회 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    } else if (req.method === "POST") {
      // 타겟 추가
      try {
        const { name } = req.body;

        if (!name || !name.trim()) {
          return res.status(400).json({ error: "답변자 이름이 필요합니다." });
        }

        // 현재 활성 회차 조회
        const currentRound = await sql`
          SELECT id FROM rounds 
          WHERE is_active = true 
          ORDER BY created_at DESC 
          LIMIT 1
        `;

        if (currentRound.rows.length === 0) {
          return res.status(400).json({ error: "활성 회차가 없습니다." });
        }

        const roundId = currentRound.rows[0].id;

        const result = await sql`
          INSERT INTO targets (name, round_id, is_active) 
          VALUES (${name.trim()}, ${roundId}, true) 
          RETURNING id, name, round_id, is_active, created_at
        `;

        res.status(200).json({
          success: true,
          message: "답변자가 추가되었습니다.",
          target: result.rows[0],
        });
      } catch (error) {
        console.error("답변자 추가 오류:", error);
        if (error.code === "23505") {
          res.status(400).json({ error: "이미 존재하는 답변자입니다." });
        } else {
          res.status(500).json({ error: "답변자 추가에 실패했습니다." });
        }
      }
    }
  }
  // 회차 관리
  else if (action === "rounds") {
    if (req.method === "GET") {
      try {
        const { type } = req.query;
        console.log("회차 조회 요청:", { type, method: req.method });

        if (type === "current") {
          // 현재 활성 회차 조회
          console.log("현재 활성 회차 조회 시작");
          const currentRound = await sql`
            SELECT id, round_number, title, description, is_active, created_at 
            FROM rounds 
            WHERE is_active = true 
            ORDER BY created_at DESC 
            LIMIT 1
          `;

          console.log("현재 활성 회차 조회 결과:", currentRound.rows);

          if (currentRound.rows.length === 0) {
            return res.status(200).json({
              success: true,
              round: null,
              message: "활성 회차가 없습니다.",
            });
          }

          res.status(200).json({
            success: true,
            round: currentRound.rows[0],
          });
        } else {
          // 모든 회차 조회
          console.log("모든 회차 조회 시작");
          const rounds = await sql`
            SELECT id, round_number, title, description, is_active, created_at 
            FROM rounds 
            ORDER BY created_at DESC
          `;

          console.log("현재 모든 회차:", rounds.rows);

          res.status(200).json({
            success: true,
            rounds: rounds.rows,
          });
        }
      } catch (error) {
        console.error("회차 조회 오류:", error);
        console.error("오류 스택:", error.stack);
        res.status(500).json({
          success: false,
          error: "회차 조회에 실패했습니다.",
          details: error.message,
        });
      }
    } else if (req.method === "POST") {
      // 회차 생성
      try {
        const { title, description } = req.body;

        if (!title) {
          return res.status(400).json({ error: "회차 제목이 필요합니다." });
        }

        // 기존 활성 회차들을 비활성화
        await sql`UPDATE rounds SET is_active = false WHERE is_active = true`;

        // 다음 회차 번호 가져오기
        const nextRoundResult = await sql`
          SELECT COALESCE(MAX(round_number), 0) + 1 as next_number
          FROM rounds
        `;
        const nextRoundNumber = nextRoundResult.rows[0].next_number;

        // 새 회차 생성
        const result = await sql`
          INSERT INTO rounds (round_number, title, description, is_active, created_at)
          VALUES (${nextRoundNumber}, ${title}, ${
          description || ""
        }, true, CURRENT_TIMESTAMP)
          RETURNING id, round_number, title, description, is_active, created_at
        `;

        res.status(200).json({
          success: true,
          message: "회차가 생성되었습니다.",
          round: result.rows[0],
        });
      } catch (error) {
        console.error("회차 생성 오류:", error);
        res.status(500).json({ error: "회차 생성에 실패했습니다." });
      }
    } else if (req.method === "DELETE") {
      // 회차 정리 (모든 회차 삭제 후 1회차부터 다시 시작)
      try {
        // 모든 회차 삭제
        await sql`DELETE FROM rounds`;

        // 1회차 생성
        const result = await sql`
          INSERT INTO rounds (round_number, title, description, is_active, created_at)
          VALUES (1, '1회차', '첫 번째 질문-답변 세션', true, CURRENT_TIMESTAMP)
          RETURNING id, round_number, title, description, is_active, created_at
        `;

        res.status(200).json({
          success: true,
          message: "회차가 정리되었습니다. 1회차부터 다시 시작합니다.",
          round: result.rows[0],
        });
      } catch (error) {
        console.error("회차 정리 오류:", error);
        res.status(500).json({ error: "회차 정리에 실패했습니다." });
      }
    } else if (req.method === "DELETE") {
      // 개별 회차 삭제
      try {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({ error: "회차 ID가 필요합니다." });
        }

        // 회차와 관련된 모든 데이터 삭제
        await sql`DELETE FROM rounds WHERE id = ${parseInt(id)}`;

        res.status(200).json({
          success: true,
          message: "회차가 삭제되었습니다.",
        });
      } catch (error) {
        console.error("회차 삭제 오류:", error);
        res.status(500).json({ error: "회차 삭제에 실패했습니다." });
      }
    }
  }
  // 데이터베이스 초기화
  else if (action === "init-db") {
    if (req.method === "POST") {
      try {
        console.log("데이터베이스 초기화 시작");

        // 1. rounds 테이블 생성
        await sql`
          CREATE TABLE IF NOT EXISTS rounds (
            id SERIAL PRIMARY KEY,
            round_number INTEGER NOT NULL UNIQUE,
            title VARCHAR(100) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        console.log("rounds 테이블 생성 완료");

        // 2. answerer_passwords 테이블 생성
        await sql`
          CREATE TABLE IF NOT EXISTS answerer_passwords (
            id SERIAL PRIMARY KEY,
            answerer_name VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        console.log("answerer_passwords 테이블 생성 완료");

        // 3. members 테이블 생성
        await sql`
          CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        console.log("members 테이블 생성 완료");

        // 4. targets 테이블 생성
        await sql`
          CREATE TABLE IF NOT EXISTS targets (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        console.log("targets 테이블 생성 완료");

        // 5. questions 테이블 생성
        await sql`
          CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            author VARCHAR(50) NOT NULL,
            target VARCHAR(50) NOT NULL,
            question TEXT NOT NULL,
            round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        console.log("questions 테이블 생성 완료");

        // 6. answers 테이블 생성
        await sql`
          CREATE TABLE IF NOT EXISTS answers (
            id SERIAL PRIMARY KEY,
            question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
            answerer VARCHAR(50) NOT NULL,
            answer TEXT NOT NULL,
            round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(question_id, answerer)
          )
        `;
        console.log("answers 테이블 생성 완료");

        // 7. 기본 데이터 삽입
        await sql`
          INSERT INTO rounds (round_number, title, description, is_active) 
          VALUES (1, '1회차', '첫 번째 질문-답변 세션', true)
          ON CONFLICT (round_number) DO NOTHING
        `;
        console.log("기본 회차 데이터 삽입 완료");

        res.status(200).json({
          success: true,
          message: "데이터베이스가 성공적으로 초기화되었습니다.",
        });
      } catch (error) {
        console.error("데이터베이스 초기화 오류:", error);
        res.status(500).json({
          success: false,
          error: "데이터베이스 초기화에 실패했습니다.",
          details: error.message,
        });
      }
    }
  }
  // 답변자 비밀번호 관리
  else if (action === "passwords") {
    if (req.method === "GET") {
      // 답변자 비밀번호 조회
      try {
        console.log("답변자 비밀번호 조회 시작");
        const passwords = await sql`
          SELECT answerer_name, password, created_at 
          FROM answerer_passwords 
          ORDER BY created_at DESC
        `;

        console.log("답변자 비밀번호 조회 결과:", passwords.rows);

        res.status(200).json({
          success: true,
          passwords: passwords.rows,
        });
      } catch (error) {
        console.error("답변자 비밀번호 조회 오류:", error);
        console.error("오류 스택:", error.stack);
        res.status(500).json({
          success: false,
          error: "답변자 비밀번호 조회에 실패했습니다.",
          details: error.message,
        });
      }
    } else if (req.method === "POST") {
      // 답변자 비밀번호 설정
      try {
        const { answererName, password } = req.body;

        if (!answererName || !password) {
          return res
            .status(400)
            .json({ error: "답변자 이름과 비밀번호가 필요합니다." });
        }

        // 기존 비밀번호가 있으면 삭제하고 새로 생성
        await sql`DELETE FROM answerer_passwords WHERE answerer_name = ${answererName}`;

        const result = await sql`
          INSERT INTO answerer_passwords (answerer_name, password)
          VALUES (${answererName}, ${password})
          RETURNING id, answerer_name, password, created_at
        `;

        res.status(200).json({
          success: true,
          message: "답변자 비밀번호가 설정되었습니다.",
          password: result.rows[0],
        });
      } catch (error) {
        console.error("답변자 비밀번호 설정 오류:", error);
        res.status(500).json({ error: "답변자 비밀번호 설정에 실패했습니다." });
      }
    }
  }
  // 답변 URL 생성
  else if (action === "generate-url") {
    if (req.method === "POST") {
      try {
        const { answererName } = req.body;

        if (!answererName) {
          return res.status(400).json({ error: "답변자 이름이 필요합니다." });
        }

        // 답변자 비밀번호 조회
        const passwordResult = await sql`
          SELECT password FROM answerer_passwords 
          WHERE answerer_name = ${answererName}
        `;

        if (passwordResult.rows.length === 0) {
          return res
            .status(404)
            .json({ error: "답변자 비밀번호를 찾을 수 없습니다." });
        }

        const password = passwordResult.rows[0].password;

        res.status(200).json({
          success: true,
          message: "답변 URL이 생성되었습니다.",
          answererName: answererName,
          password: password,
          url: `/answer/${answererName}`,
        });
      } catch (error) {
        console.error("답변 URL 생성 오류:", error);
        res.status(500).json({ error: "답변 URL 생성에 실패했습니다." });
      }
    }
  }
  // 질문하지 않은 멤버 조회
  else if (action === "unasked-members") {
    if (req.method === "GET") {
      try {
        const { answererName } = req.query;

        if (!answererName) {
          return res.status(400).json({ error: "답변자 이름이 필요합니다." });
        }

        // 현재 활성 회차 조회
        const currentRound = await sql`
          SELECT id FROM rounds WHERE is_active = true ORDER BY created_at DESC LIMIT 1
        `;

        if (currentRound.rows.length === 0) {
          return res.status(200).json({
            success: true,
            unaskedMembers: [],
            message: "활성 회차가 없습니다.",
          });
        }

        const roundId = currentRound.rows[0].id;

        // 모든 활성 멤버 조회
        const allMembers = await sql`
          SELECT name FROM members WHERE is_active = true ORDER BY name
        `;

        // 해당 답변자에게 질문한 멤버들 조회
        const askedMembers = await sql`
          SELECT DISTINCT author FROM questions 
          WHERE target = ${answererName} AND round_id = ${roundId}
        `;

        const askedMemberNames = askedMembers.rows.map((row) => row.author);
        const unaskedMembers = allMembers.rows
          .map((row) => row.name)
          .filter((name) => !askedMemberNames.includes(name));

        res.status(200).json({
          success: true,
          unaskedMembers: unaskedMembers,
        });
      } catch (error) {
        console.error("질문하지 않은 멤버 조회 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 현재 활성 타겟 조회
  else if (action === "current-targets") {
    if (req.method === "GET") {
      try {
        // 현재 활성 회차의 답변자들 조회
        const targets = await sql`
          SELECT t.*, r.round_number, r.title as round_title
          FROM targets t
          JOIN rounds r ON t.round_id = r.id
          WHERE r.is_active = true AND t.is_active = true
          ORDER BY t.created_at ASC
        `;

        res.status(200).json({
          success: true,
          targets: targets.rows,
        });
      } catch (error) {
        console.error("현재 활성 회차 답변자 조회 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  }
  // 데이터 삭제
  else if (action === "clear-data") {
    if (req.method === "DELETE") {
      try {
        const { type } = req.query;

        if (type === "questions") {
          // 모든 질문 삭제
          await sql`DELETE FROM questions`;
          res.status(200).json({
            success: true,
            message: "모든 질문이 삭제되었습니다.",
          });
        } else if (type === "answers") {
          // 모든 답변 삭제
          await sql`DELETE FROM answers`;
          res.status(200).json({
            success: true,
            message: "모든 답변이 삭제되었습니다.",
          });
        } else {
          // 모든 데이터 삭제
          await sql`DELETE FROM answers`;
          await sql`DELETE FROM questions`;
          res.status(200).json({
            success: true,
            message: "모든 데이터가 삭제되었습니다.",
          });
        }
      } catch (error) {
        console.error("데이터 삭제 중 오류:", error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
}
