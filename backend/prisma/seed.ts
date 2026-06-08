import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-showroom' },
    update: {},
    create: { name: 'Demo Showroom', slug: 'demo-showroom', plan: 'enterprise' },
  });

  const branch = await prisma.branch.upsert({
    where: { id: 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1' },
    update: {},
    create: {
      id: 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
      tenantId: tenant.id,
      name: 'Showroom Quận 1 - TP.HCM',
      address: '123 Nguyễn Huệ',
      city: 'TP.HCM',
      province: 'TP. Hồ Chí Minh',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      email: 'admin@demo.com',
      passwordHash: hash,
      fullName: 'Admin Demo',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      email: 'staff@demo.com',
      passwordHash: hash,
      fullName: 'Nhân viên Demo',
      role: 'SALES_STAFF',
    },
  });

  const toyota = await prisma.brand.upsert({
    where: { id: 'toyota000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'toyota000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      name: 'Toyota',
      country: 'Japan',
    },
  });

  const camryModel = await prisma.model.create({
    data: { brandId: toyota.id, name: 'Camry', segment: 'sedan' },
  });

  const camryVariant = await prisma.variant.create({
    data: {
      modelId: camryModel.id,
      year: 2024,
      trimLevel: '2.5Q',
      engineCc: 2487,
      engineType: 'hybrid',
      transmission: 'auto',
      driveType: 'fwd',
      seats: 5,
      doors: 4,
      basePrice: 1235000000,
      currency: 'VND',
    },
  });

  const white = await prisma.color.create({ data: { name: 'Trắng Ngọc Trai', hexCode: '#F5F5F0', colorType: 'pearl' } });

  for (let i = 1; i <= 5; i++) {
    const vin = `JTDBE3EH4B${String(i).padStart(7, '0')}`;
    await prisma.vehicle.upsert({
      where: { vin },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        variantId: camryVariant.id,
        exteriorColorId: white.id,
        vin,
        plateNumber: i === 1 ? '51A-123.45' : undefined,
        condition: 'NEW',
        status: i === 1 ? 'SOLD' : i === 2 ? 'RESERVED' : 'AVAILABLE',
        odometerKm: i === 1 ? 12000 : 0,
        costPrice: 1050000000,
        sellingPrice: 1235000000,
        minPrice: 1150000000,
        lotLocation: `A-0${i}-01`,
        importDate: new Date('2024-01-15'),
        statusLogs: {
          create: { toStatus: i === 1 ? 'SOLD' : i === 2 ? 'RESERVED' : 'AVAILABLE', note: 'Seed data' },
        },
      },
    });
  }

  console.log('Seed completed!');
  console.log('Admin: admin@demo.com / password123');
  console.log('Staff: staff@demo.com / password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
