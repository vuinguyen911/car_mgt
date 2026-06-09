/**
 * Chạy trước tất cả e2e test suites:
 * - Set DATABASE_URL cho SQLite test DB
 * - Chạy prisma db push để sync schema
 */
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '../../test-e2e.db');
const TEST_DB_URL  = `file:${TEST_DB_PATH}`;

export default async function globalSetup() {
  console.log('\n🔧 E2E Setup: khởi tạo test database...');

  // Xóa DB cũ nếu có
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('   Đã xóa DB cũ');
  }

  // Sync schema vào test DB
  process.env.DATABASE_URL = TEST_DB_URL;
  try {
    execSync('npx prisma db push --skip-generate --force-reset', {
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
      cwd: path.join(__dirname, '../../'),
    });
    console.log('   Schema synced ✓');
  } catch (err) {
    console.error('   Prisma db push thất bại:', err);
    throw err;
  }
}
