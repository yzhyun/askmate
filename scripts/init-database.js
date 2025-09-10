#!/usr/bin/env node

import dotenv from "dotenv";
import { initializeDatabase } from "../src/utils/database.js";

// 환경 변수 로드
dotenv.config({ path: ".env.local" });

console.log("🗄️  데이터베이스 초기화를 시작합니다...");

try {
  await initializeDatabase();
  console.log("✅ 데이터베이스 초기화가 완료되었습니다!");
  console.log("📋 생성된 테이블:");
  console.log("   - members (질문자 관리)");
  console.log("   - targets (답변자 관리)");
  console.log("   - questions (질문 저장)");
  console.log("   - answers (답변 저장)");
  console.log("   - answerer_passwords (답변자 비밀번호)");
  console.log("   - admin_auth (관리자 인증)");
  console.log("   - rounds (회차 관리)");
  console.log("\n🚀 이제 서버를 시작할 수 있습니다: npm run dev");
  process.exit(0);
} catch (error) {
  console.error("❌ 데이터베이스 초기화에 실패했습니다:");
  console.error(error.message);
  process.exit(1);
}
