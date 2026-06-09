/**
 * E2E Tests — Auth Module
 *
 * Yêu cầu: DATABASE_URL trỏ đến SQLite test DB
 * Chạy: npm run test:e2e -- --testPathPattern=auth
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp, closeTestApp, seedTestData } from './helpers/test-app.factory';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await seedTestData(prisma);
  });

  afterAll(() => closeTestApp(app, prisma));

  // ── POST /api/v1/auth/login ───────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('200 + trả về accessToken khi credentials đúng', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test-admin@auto.com', password: 'Test@1234' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('test-admin@auto.com');
      expect(res.body.user.role).toBe('ADMIN');
      // Không được lộ passwordHash
      expect(res.body.user.passwordHash).toBeUndefined();

      adminToken = res.body.accessToken;
    });

    it('401 khi email không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@auto.com', password: 'Test@1234' })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it('401 khi password sai', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test-admin@auto.com', password: 'wrong-password' })
        .expect(401);
    });

    it('400 khi email không đúng format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'Test@1234' })
        .expect(400);
    });

    it('400 khi thiếu password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test-admin@auto.com' })
        .expect(400);
    });
  });

  // ── GET /api/v1/auth/me ───────────────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    it('200 + trả về profile khi có JWT hợp lệ', async () => {
      // Đảm bảo có token
      if (!adminToken) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'test-admin@auto.com', password: 'Test@1234' });
        adminToken = res.body.accessToken;
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.email).toBe('test-admin@auto.com');
    });

    it('401 khi không có Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('401 khi token bị giả mạo', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer fake.token.here')
        .expect(401);
    });
  });

  // ── POST /api/v1/auth/refresh ─────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    it('200 + trả về accessToken mới từ refreshToken hợp lệ', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test-admin@auto.com', password: 'Test@1234' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('401 khi refreshToken không hợp lệ', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);
    });
  });

  // ── GET /api/v1/auth/users ────────────────────────────────────────────────
  describe('GET /api/v1/auth/users', () => {
    it('200 + danh sách users khi ADMIN request', async () => {
      if (!adminToken) {
        const r = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'test-admin@auto.com', password: 'Test@1234' });
        adminToken = r.body.accessToken;
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('401 khi không có token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/users')
        .expect(401);
    });
  });
});
