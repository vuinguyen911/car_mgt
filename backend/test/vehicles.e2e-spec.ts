/**
 * E2E Tests — Vehicles Module
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp, closeTestApp, seedTestData } from './helpers/test-app.factory';

describe('Vehicles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;
  let tenantId: string;
  let branchId: string;
  let variantId: string;
  let colorId: string;
  let createdVehicleId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const { tenant, branch, adminUser } = await seedTestData(prisma);
    tenantId = tenant.id;
    branchId = branch?.id ?? '';

    // Tạo Brand → Model → Variant cho test
    const brand = await (prisma as any).brand.upsert({
      where: { tenantId_name: { tenantId, name: 'Toyota' } },
      create: { tenantId, name: 'Toyota', country: 'Japan' },
      update: {},
    }).catch(async () => (prisma as any).brand.findFirst({ where: { tenantId, name: 'Toyota' } }));

    const model = await (prisma as any).vehicleModel.upsert({
      where: { brandId_name: { brandId: brand.id, name: 'Camry' } },
      create: { brandId: brand.id, name: 'Camry', segment: 'SEDAN' },
      update: {},
    }).catch(async () => (prisma as any).vehicleModel.findFirst({ where: { brandId: brand.id } }));

    const variant = await (prisma as any).vehicleVariant.findFirst({ where: { modelId: model.id } })
      ?? await (prisma as any).vehicleVariant.create({
        data: { modelId: model.id, year: 2024, trimLevel: '2.5Q', engineType: '2.5L', transmission: 'AT' },
      });
    variantId = variant.id;

    const color = await (prisma as any).color.findFirst({ where: { tenantId } })
      ?? await (prisma as any).color.create({ data: { tenantId, name: 'Trắng', hexCode: '#FFFFFF' } });
    colorId = color.id;

    // Login lấy token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test-admin@auto.com', password: 'Test@1234' });
    token = loginRes.body.accessToken;
  });

  afterAll(() => closeTestApp(app, prisma));

  // ── GET /vehicles ─────────────────────────────────────────────────────────
  describe('GET /api/v1/vehicles', () => {
    it('200 + trả về danh sách xe (có thể rỗng)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('hasMore');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('401 khi không có token', async () => {
      await request(app.getHttpServer()).get('/api/v1/vehicles').expect(401);
    });

    it('filter theo status hoạt động đúng', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles?status=AVAILABLE')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Tất cả item trả về phải có status AVAILABLE
      res.body.items.forEach((v: any) => {
        expect(v.status).toBe('AVAILABLE');
      });
    });

    it('pagination — limit hoạt động', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles?limit=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });
  });

  // ── POST /vehicles ────────────────────────────────────────────────────────
  describe('POST /api/v1/vehicles', () => {
    it('201 + tạo xe mới thành công', async () => {
      const dto = {
        vin: `VIN-E2E-${Date.now()}`,
        variantId,
        branchId,
        exteriorColorId: colorId,
        condition: 'NEW',
        odometerKm: 0,
        costPrice: 700000000,
        sellingPrice: 820000000,
        minPrice: 750000000,
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(res.body.vin).toBe(dto.vin);
      expect(res.body.status).toBe('AVAILABLE');       // default status
      expect(res.body.condition).toBe('NEW');
      createdVehicleId = res.body.id;
    });

    it('400 khi thiếu VIN', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({ variantId, condition: 'NEW' })
        .expect(400);
    });

    it('401 khi không có token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vehicles')
        .send({ vin: 'VIN-NO-AUTH', variantId, condition: 'NEW' })
        .expect(401);
    });
  });

  // ── GET /vehicles/:id ─────────────────────────────────────────────────────
  describe('GET /api/v1/vehicles/:id', () => {
    it('200 + trả về chi tiết xe vừa tạo', async () => {
      if (!createdVehicleId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/vehicles/${createdVehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(createdVehicleId);
      expect(res.body.condition).toBe('NEW');
    });

    it('404 khi ID không tồn tại', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/vehicles/non-existent-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── PATCH /vehicles/:id ───────────────────────────────────────────────────
  describe('PATCH /api/v1/vehicles/:id', () => {
    it('200 + cập nhật sellingPrice thành công', async () => {
      if (!createdVehicleId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vehicles/${createdVehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ sellingPrice: 830000000 })
        .expect(200);

      expect(Number(res.body.sellingPrice)).toBe(830000000);
    });
  });

  // ── GET /vehicles/stats ───────────────────────────────────────────────────
  describe('GET /api/v1/vehicles/stats', () => {
    it('200 + trả về stats đúng cấu trúc', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('byStatus');
      expect(res.body).toHaveProperty('byCondition');
    });
  });

  // ── DELETE /vehicles/:id ──────────────────────────────────────────────────
  describe('DELETE /api/v1/vehicles/:id', () => {
    it('200 + xóa xe thành công', async () => {
      if (!createdVehicleId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/vehicles/${createdVehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('404 khi xóa xe đã bị xóa', async () => {
      if (!createdVehicleId) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/vehicles/${createdVehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
