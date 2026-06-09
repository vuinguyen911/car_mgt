/**
 * E2E Tests — Customers Module
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp, closeTestApp, seedTestData } from './helpers/test-app.factory';

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;
  let createdCustomerId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await seedTestData(prisma);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test-admin@auto.com', password: 'Test@1234' });
    token = loginRes.body.accessToken;
  });

  afterAll(() => closeTestApp(app, prisma));

  // ── POST /customers ───────────────────────────────────────────────────────
  describe('POST /api/v1/customers', () => {
    it('201 + tạo khách hàng cá nhân', async () => {
      const dto = {
        fullName: 'Nguyễn Văn Test',
        phone: `09${Date.now().toString().slice(-8)}`,
        email: `nv-test-${Date.now()}@example.com`,
        type: 'INDIVIDUAL',
        idNumber: `${Date.now()}`.slice(-12),
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(res.body.fullName).toBe(dto.fullName);
      expect(res.body.type).toBe('INDIVIDUAL');
      createdCustomerId = res.body.id;
    });

    it('201 + tạo khách hàng doanh nghiệp với taxCode', async () => {
      const dto = {
        fullName: 'Công ty TNHH Test',
        phone: `08${Date.now().toString().slice(-8)}`,
        type: 'CORPORATE',
        taxCode: `${Date.now()}`.slice(-10),
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(res.body.type).toBe('CORPORATE');
    });

    it('400 khi thiếu fullName', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '0901234567', type: 'INDIVIDUAL' })
        .expect(400);
    });

    it('401 khi không có token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers')
        .send({ fullName: 'Test', phone: '0900000001', type: 'INDIVIDUAL' })
        .expect(401);
    });
  });

  // ── GET /customers ────────────────────────────────────────────────────────
  describe('GET /api/v1/customers', () => {
    it('200 + trả về danh sách khách hàng', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('search hoạt động đúng', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers?search=Nguyễn')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  // ── GET /customers/:id ────────────────────────────────────────────────────
  describe('GET /api/v1/customers/:id', () => {
    it('200 + trả về chi tiết khách hàng', async () => {
      if (!createdCustomerId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(createdCustomerId);
    });

    it('404 khi ID không tồn tại', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── PATCH /customers/:id ──────────────────────────────────────────────────
  describe('PATCH /api/v1/customers/:id', () => {
    it('200 + cập nhật địa chỉ', async () => {
      if (!createdCustomerId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ address: '123 Lê Lợi, Quận 1, TP.HCM' })
        .expect(200);

      expect(res.body.address).toBe('123 Lê Lợi, Quận 1, TP.HCM');
    });
  });

  // ── DELETE /customers/:id ─────────────────────────────────────────────────
  describe('DELETE /api/v1/customers/:id', () => {
    it('200 + xóa khách hàng thành công', async () => {
      if (!createdCustomerId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBeDefined();
    });
  });
});
