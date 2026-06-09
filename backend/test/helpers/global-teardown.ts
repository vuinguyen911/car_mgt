/**
 * Chạy sau tất cả e2e test suites — dọn dẹp test DB
 */
import * as path from 'path';
import * as fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '../../test-e2e.db');

export default async function globalTeardown() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('\n🧹 E2E Teardown: đã xóa test database');
  }
}
