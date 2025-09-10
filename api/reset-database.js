import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 모든 테이블 삭제 (CASCADE로 외래키도 함께 삭제)
    await sql`DROP TABLE IF EXISTS answers CASCADE`;
    await sql`DROP TABLE IF EXISTS questions CASCADE`;
    await sql`DROP TABLE IF EXISTS targets CASCADE`;
    await sql`DROP TABLE IF EXISTS answerer_passwords CASCADE`;
    await sql`DROP TABLE IF EXISTS question_visibility CASCADE`;
    await sql`DROP TABLE IF EXISTS rounds CASCADE`;
    await sql`DROP TABLE IF EXISTS members CASCADE`;
    await sql`DROP TABLE IF EXISTS admin_auth CASCADE`;

    // 테이블 생성
    await sql`
      CREATE TABLE members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE targets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        round_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE rounds (
        id SERIAL PRIMARY KEY,
        round_number INTEGER NOT NULL UNIQUE,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE questions (
        id SERIAL PRIMARY KEY,
        author VARCHAR(50) NOT NULL,
        target VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        round_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL,
        answerer VARCHAR(50) NOT NULL,
        answer TEXT NOT NULL,
        round_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(question_id)
      )
    `;

    await sql`
      CREATE TABLE answerer_passwords (
        id SERIAL PRIMARY KEY,
        answerer_name VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE question_visibility (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL,
        target_name VARCHAR(50) NOT NULL,
        is_visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE admin_auth (
        id INTEGER PRIMARY KEY DEFAULT 1,
        password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 기본 데이터 삽입
    await sql`
      INSERT INTO rounds (round_number, title, description, is_active) VALUES 
        (1, '1회차', '첫 번째 질문-답변 세션', true),
        (2, '2회차', '두 번째 질문-답변 세션', false)
    `;

    res.status(200).json({
      success: true,
      message: "데이터베이스가 성공적으로 초기화되었습니다.",
    });
  } catch (error) {
    console.error("데이터베이스 초기화 오류:", error);
    res.status(500).json({
      success: false,
      error: `데이터베이스 초기화에 실패했습니다: ${error.message}`,
    });
  }
}
