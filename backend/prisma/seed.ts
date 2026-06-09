import { PrismaClient, UserRole, VehicleStatus, VehicleCondition, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Dữ liệu mẫu ─────────────────────────────────────────────────────────────
const BRANDS = [
  { name: 'Toyota', country: 'Japan', models: [
    { name: 'Camry', segment: 'sedan', variants: [
      { trim: '2.5Q', year: 2024, engine: 'hybrid', price: 1_235_000_000 },
      { trim: '2.5G', year: 2024, engine: 'hybrid', price: 1_120_000_000 },
      { trim: '2.0E', year: 2023, engine: 'gasoline', price: 980_000_000 },
    ]},
    { name: 'Fortuner', segment: 'suv', variants: [
      { trim: '2.8 Legender 4x4', year: 2024, engine: 'diesel', price: 1_426_000_000 },
      { trim: '2.4G 4x2 AT', year: 2024, engine: 'diesel', price: 1_096_000_000 },
      { trim: '2.4G 4x2 MT', year: 2023, engine: 'diesel', price: 1_022_000_000 },
    ]},
    { name: 'Vios', segment: 'sedan', variants: [
      { trim: '1.5E CVT', year: 2024, engine: 'gasoline', price: 479_000_000 },
      { trim: '1.5G CVT', year: 2024, engine: 'gasoline', price: 548_000_000 },
    ]},
    { name: 'Hilux', segment: 'pickup', variants: [
      { trim: '2.8 Rocco 4x4 AT', year: 2024, engine: 'diesel', price: 996_000_000 },
      { trim: '2.4E 4x2 MT', year: 2023, engine: 'diesel', price: 716_000_000 },
    ]},
  ]},
  { name: 'Honda', country: 'Japan', models: [
    { name: 'CR-V', segment: 'suv', variants: [
      { trim: 'L AWD', year: 2024, engine: 'hybrid', price: 1_218_000_000 },
      { trim: 'G', year: 2024, engine: 'gasoline', price: 998_000_000 },
      { trim: 'E', year: 2023, engine: 'gasoline', price: 908_000_000 },
    ]},
    { name: 'Civic', segment: 'sedan', variants: [
      { trim: 'RS', year: 2024, engine: 'turbo', price: 870_000_000 },
      { trim: 'G', year: 2024, engine: 'turbo', price: 760_000_000 },
      { trim: 'E', year: 2023, engine: 'turbo', price: 720_000_000 },
    ]},
    { name: 'City', segment: 'sedan', variants: [
      { trim: 'RS', year: 2024, engine: 'gasoline', price: 599_000_000 },
      { trim: 'G', year: 2023, engine: 'gasoline', price: 539_000_000 },
    ]},
  ]},
  { name: 'Hyundai', country: 'Korea', models: [
    { name: 'Tucson', segment: 'suv', variants: [
      { trim: '2.0 AT Đặc biệt', year: 2024, engine: 'gasoline', price: 838_000_000 },
      { trim: '2.0 AT Tiêu chuẩn', year: 2024, engine: 'gasoline', price: 750_000_000 },
    ]},
    { name: 'Santa Fe', segment: 'suv', variants: [
      { trim: '2.5T-GDi Cao cấp', year: 2024, engine: 'turbo', price: 1_280_000_000 },
      { trim: '2.2 CRDi Đặc biệt', year: 2023, engine: 'diesel', price: 1_150_000_000 },
    ]},
    { name: 'Accent', segment: 'sedan', variants: [
      { trim: '1.4 AT Đặc biệt', year: 2024, engine: 'gasoline', price: 542_000_000 },
      { trim: '1.4 MT Tiêu chuẩn', year: 2023, engine: 'gasoline', price: 479_000_000 },
    ]},
  ]},
  { name: 'KIA', country: 'Korea', models: [
    { name: 'Seltos', segment: 'suv', variants: [
      { trim: '1.4T Premium', year: 2024, engine: 'turbo', price: 789_000_000 },
      { trim: '1.4T Deluxe', year: 2024, engine: 'turbo', price: 719_000_000 },
    ]},
    { name: 'Sportage', segment: 'suv', variants: [
      { trim: '2.0 AT Luxury', year: 2024, engine: 'gasoline', price: 899_000_000 },
      { trim: '2.0 AT Signature', year: 2024, engine: 'gasoline', price: 979_000_000 },
    ]},
    { name: 'K3', segment: 'sedan', variants: [
      { trim: '2.0 AT Luxury', year: 2024, engine: 'gasoline', price: 629_000_000 },
      { trim: '1.6 AT Deluxe', year: 2023, engine: 'gasoline', price: 569_000_000 },
    ]},
  ]},
  { name: 'Mazda', country: 'Japan', models: [
    { name: 'CX-5', segment: 'suv', variants: [
      { trim: '2.5 Signature', year: 2024, engine: 'gasoline', price: 979_000_000 },
      { trim: '2.0 Luxury', year: 2024, engine: 'gasoline', price: 829_000_000 },
      { trim: '2.0 Premium', year: 2023, engine: 'gasoline', price: 769_000_000 },
    ]},
    { name: 'Mazda3', segment: 'sedan', variants: [
      { trim: '2.0L Signature', year: 2024, engine: 'gasoline', price: 809_000_000 },
      { trim: '1.5L Luxury', year: 2024, engine: 'gasoline', price: 699_000_000 },
    ]},
    { name: 'CX-8', segment: 'suv', variants: [
      { trim: '2.5T Premium AWD', year: 2024, engine: 'turbo', price: 1_319_000_000 },
      { trim: '2.5 Luxury', year: 2023, engine: 'gasoline', price: 1_149_000_000 },
    ]},
  ]},
  { name: 'Mercedes-Benz', country: 'Germany', models: [
    { name: 'C-Class', segment: 'sedan', variants: [
      { trim: 'C200 Avantgarde', year: 2024, engine: 'turbo', price: 1_799_000_000 },
      { trim: 'C300 AMG', year: 2024, engine: 'turbo', price: 2_399_000_000 },
    ]},
    { name: 'GLC', segment: 'suv', variants: [
      { trim: 'GLC 200 4MATIC', year: 2024, engine: 'turbo', price: 2_699_000_000 },
      { trim: 'GLC 300 4MATIC AMG', year: 2024, engine: 'turbo', price: 3_100_000_000 },
    ]},
  ]},
  { name: 'VinFast', country: 'Vietnam', models: [
    { name: 'VF 8', segment: 'suv', variants: [
      { trim: 'Plus', year: 2024, engine: 'electric', price: 1_057_600_000 },
      { trim: 'Eco', year: 2024, engine: 'electric', price: 921_200_000 },
    ]},
    { name: 'VF 9', segment: 'suv', variants: [
      { trim: 'Plus', year: 2024, engine: 'electric', price: 1_559_000_000 },
      { trim: 'Eco', year: 2024, engine: 'electric', price: 1_388_900_000 },
    ]},
    { name: 'VF 6', segment: 'suv', variants: [
      { trim: 'Plus', year: 2024, engine: 'electric', price: 720_000_000 },
      { trim: 'Eco', year: 2024, engine: 'electric', price: 646_000_000 },
    ]},
  ]},
];

const COLORS_DATA = [
  { name: 'Trắng Ngọc Trai', hex: '#F5F5F0', type: 'pearl' },
  { name: 'Đen Ánh Kim', hex: '#1A1A1A', type: 'metallic' },
  { name: 'Bạc Ánh Kim', hex: '#C0C0C0', type: 'metallic' },
  { name: 'Đỏ Cờ', hex: '#CC0000', type: 'solid' },
  { name: 'Xanh Dương Metallic', hex: '#1E3A8A', type: 'metallic' },
  { name: 'Nâu Đất', hex: '#8B4513', type: 'metallic' },
  { name: 'Xám Bạc', hex: '#808080', type: 'metallic' },
  { name: 'Xanh Lá Đậm', hex: '#166534', type: 'metallic' },
];

const BRANCH_DATA = [
  { id: 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', name: 'Showroom Quận 1 – TP.HCM', city: 'TP.HCM', province: 'TP. Hồ Chí Minh', address: '123 Nguyễn Huệ' },
  { id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', name: 'Showroom Quận 7 – TP.HCM', city: 'TP.HCM', province: 'TP. Hồ Chí Minh', address: '456 Nguyễn Thị Thập' },
  { id: 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', name: 'Showroom Hà Nội', city: 'Hà Nội', province: 'Hà Nội', address: '789 Hoàng Quốc Việt' },
  { id: 'b4b4b4b4-b4b4-b4b4-b4b4-b4b4b4b4b4b4', name: 'Showroom Đà Nẵng', city: 'Đà Nẵng', province: 'Đà Nẵng', address: '321 Nguyễn Văn Linh' },
];

const USER_DATA = [
  { email: 'admin@demo.com', name: 'Nguyễn Văn Admin', role: UserRole.ADMIN },
  { email: 'manager@demo.com', name: 'Trần Thị Manager', role: UserRole.SALES_MANAGER },
  { email: 'staff1@demo.com', name: 'Lê Văn Hùng', role: UserRole.SALES_STAFF },
  { email: 'staff2@demo.com', name: 'Phạm Thị Lan', role: UserRole.SALES_STAFF },
  { email: 'staff3@demo.com', name: 'Hoàng Minh Tuấn', role: UserRole.SALES_STAFF },
  { email: 'inventory@demo.com', name: 'Vũ Thị Hoa', role: UserRole.INVENTORY_MANAGER },
  { email: 'accountant@demo.com', name: 'Đặng Văn Kế', role: UserRole.ACCOUNTANT },
  { email: 'viewer@demo.com', name: 'Bùi Thị Xem', role: UserRole.VIEWER },
  { email: 'staff@demo.com', name: 'Nhân viên Demo', role: UserRole.SALES_STAFF },
];

const CUSTOMER_DATA = [
  { name: 'Nguyễn Văn An', phone: '0901234501', province: 'TP. Hồ Chí Minh' },
  { name: 'Trần Thị Bình', phone: '0901234502', province: 'Hà Nội' },
  { name: 'Lê Văn Cường', phone: '0901234503', province: 'Đà Nẵng' },
  { name: 'Phạm Thị Dung', phone: '0901234504', province: 'TP. Hồ Chí Minh' },
  { name: 'Hoàng Minh Đức', phone: '0901234505', province: 'Bình Dương' },
  { name: 'Vũ Thị Em', phone: '0901234506', province: 'Đồng Nai' },
  { name: 'Đặng Văn Phúc', phone: '0901234507', province: 'Hải Phòng' },
  { name: 'Bùi Thị Giang', phone: '0901234508', province: 'Cần Thơ' },
  { name: 'Đinh Văn Hải', phone: '0901234509', province: 'TP. Hồ Chí Minh' },
  { name: 'Cao Thị Ý', phone: '0901234510', province: 'Hà Nội' },
  { name: 'Ngô Văn Khoa', phone: '0901234511', province: 'TP. Hồ Chí Minh' },
  { name: 'Dương Thị Liên', phone: '0901234512', province: 'Đà Nẵng' },
  { name: 'Mai Văn Mạnh', phone: '0901234513', province: 'Hà Nội' },
  { name: 'Lý Thị Nga', phone: '0901234514', province: 'TP. Hồ Chí Minh' },
  { name: 'Trương Văn Ổn', phone: '0901234515', province: 'Khánh Hòa' },
  { name: 'Công ty TNHH ABC', phone: '0281234501', province: 'TP. Hồ Chí Minh', type: 'CORPORATE', taxCode: '0123456789' },
  { name: 'Công ty CP XYZ', phone: '0281234502', province: 'Hà Nội', type: 'CORPORATE', taxCode: '0987654321' },
  { name: 'Tập đoàn Phú Thịnh', phone: '0281234503', province: 'Đà Nẵng', type: 'CORPORATE', taxCode: '0111222333' },
  { name: 'Phan Văn Quang', phone: '0901234516', province: 'Quảng Nam' },
  { name: 'Hồ Thị Rằm', phone: '0901234517', province: 'TP. Hồ Chí Minh' },
  { name: 'Điền Văn Sơn', phone: '0901234518', province: 'Bình Phước' },
  { name: 'Lâm Thị Tươi', phone: '0901234519', province: 'Tiền Giang' },
  { name: 'Khâu Văn Uyển', phone: '0901234520', province: 'Hà Nội' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d;
}
function genVin(prefix: string, idx: number) {
  return `${prefix}${String(idx).padStart(10, '0')}`.slice(0, 17).toUpperCase();
}

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-showroom' },
    update: {},
    create: { name: 'Demo Auto Group', slug: 'demo-showroom', plan: 'enterprise' },
  });
  console.log(`✓ Tenant: ${tenant.name}`);

  // ── Branches ──────────────────────────────────────────────────────────────
  const branches = await Promise.all(BRANCH_DATA.map(b =>
    prisma.branch.upsert({
      where: { id: b.id },
      update: {},
      create: { ...b, tenantId: tenant.id },
    })
  ));
  console.log(`✓ ${branches.length} chi nhánh`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = await Promise.all(USER_DATA.map((u, i) =>
    prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branches[i % branches.length].id,
        email: u.email,
        passwordHash: hash,
        fullName: u.name,
        role: u.role,
        isActive: true,
      },
    })
  ));
  console.log(`✓ ${users.length} users (admin@demo.com / password123)`);

  // ── Colors ────────────────────────────────────────────────────────────────
  const colors: { id: string }[] = [];
  for (const c of COLORS_DATA) {
    let color = await prisma.color.findFirst({ where: { hexCode: c.hex } });
    if (!color) {
      color = await prisma.color.create({ data: { name: c.name, hexCode: c.hex, colorType: c.type } });
    }
    colors.push(color);
  }
  console.log(`✓ ${colors.length} màu xe`);

  // ── Brands / Models / Variants ────────────────────────────────────────────
  let totalVariants = 0;
  const allVariants: { variantId: string; basePrice: number; brand: string }[] = [];

  for (const brandDef of BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { id: `brand-${brandDef.name.toLowerCase().replace(/\s/g, '-').slice(0,20)}-000000001` },
      update: {},
      create: {
        id: `brand-${brandDef.name.toLowerCase().replace(/\s/g, '-').slice(0,20)}-000000001`,
        tenantId: tenant.id,
        name: brandDef.name,
        country: brandDef.country,
      },
    });

    for (const modelDef of brandDef.models) {
      let model = await prisma.model.findFirst({ where: { brandId: brand.id, name: modelDef.name } });
      if (!model) {
        model = await prisma.model.create({
          data: { brandId: brand.id, name: modelDef.name, segment: modelDef.segment },
        });
      }

      for (const variantDef of modelDef.variants) {
        let variant = await prisma.variant.findFirst({
          where: { modelId: model.id, year: variantDef.year, trimLevel: variantDef.trim },
        });
        if (!variant) {
          variant = await prisma.variant.create({
            data: {
              modelId: model.id,
              year: variantDef.year,
              trimLevel: variantDef.trim,
              engineType: variantDef.engine,
              transmission: 'auto',
              driveType: variantDef.engine === 'diesel' && variantDef.trim.includes('4x4') ? 'awd' : 'fwd',
              seats: modelDef.segment === 'suv' && modelDef.name.includes('CX-8') ? 7 : 5,
              doors: 4,
              basePrice: variantDef.price,
              currency: 'VND',
            },
          });
        }
        allVariants.push({ variantId: variant.id, basePrice: variantDef.price, brand: brandDef.name });
        totalVariants++;
      }
    }
  }
  console.log(`✓ ${BRANDS.length} hãng xe / ${totalVariants} phiên bản`);

  // ── Customers ─────────────────────────────────────────────────────────────
  const customerRecords: { id: string }[] = [];
  for (let i = 0; i < CUSTOMER_DATA.length; i++) {
    const c = CUSTOMER_DATA[i];
    let cust = await prisma.customer.findFirst({ where: { tenantId: tenant.id, phone: c.phone } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          fullName: c.name,
          phone: c.phone,
          email: `customer${i + 1}@email.com`,
          type: (c as any).type ?? 'INDIVIDUAL',
          taxCode: (c as any).taxCode ?? null,
          province: c.province,
        },
      });
    }
    customerRecords.push(cust);
  }
  console.log(`✓ ${customerRecords.length} khách hàng`);

  // ── Vehicles (1000 xe) ────────────────────────────────────────────────────
  const existingCount = await prisma.vehicle.count({ where: { tenantId: tenant.id } });
  const TARGET = 1000;
  const toCreate = TARGET - existingCount;

  if (toCreate <= 0) {
    console.log(`✓ Đã có ${existingCount} xe — bỏ qua tạo xe`);
  } else {
    console.log(`⏳ Tạo ${toCreate} xe (batch 50)...`);
    const STATUSES: VehicleStatus[] = ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'RESERVED', 'SOLD'];
    const CONDITIONS: VehicleCondition[] = ['NEW', 'NEW', 'NEW', 'NEW', 'USED'];
    const LOT_ZONES = ['A', 'B', 'C', 'D', 'E'];

    let created = 0;
    const BATCH = 50;

    while (created < toCreate) {
      const batchSize = Math.min(BATCH, toCreate - created);
      const ops: any[] = [];

      for (let i = 0; i < batchSize; i++) {
        const idx = existingCount + created + i + 1;
        const v = rand(allVariants);
        const branch = rand(branches);
        const status = rand(STATUSES);
        const condition = rand(CONDITIONS);
        const daysAgo = randInt(0, 180);
        const vin = genVin(`VN${String(idx).padStart(2,'0')}`, idx);
        const costPrice = Math.round(v.basePrice * 0.85);
        const sellingPrice = v.basePrice + randInt(-10_000_000, 30_000_000);
        const odometer = condition === 'NEW' ? 0 : randInt(5000, 80000);

        ops.push(
          prisma.vehicle.upsert({
            where: { vin },
            update: {},
            create: {
              tenantId: tenant.id,
              branchId: branch.id,
              variantId: v.variantId,
              exteriorColorId: rand(colors).id,
              vin,
              condition,
              status,
              odometerKm: odometer,
              costPrice,
              sellingPrice,
              minPrice: Math.round(costPrice * 1.02),
              lotLocation: `${rand(LOT_ZONES)}-${String(randInt(1,20)).padStart(2,'0')}-${String(randInt(1,10)).padStart(2,'0')}`,
              importDate: randDate(daysAgo + 30),
              statusLogs: { create: { toStatus: status, note: 'Seed data' } },
            },
          })
        );
      }

      await prisma.$transaction(ops as any);
      created += batchSize;
      process.stdout.write(`\r  → ${existingCount + created}/${TARGET} xe`);
    }
    console.log(`\n✓ Đã tạo ${created} xe mới (tổng ${await prisma.vehicle.count({ where: { tenantId: tenant.id } })} xe)`);
  }

  // ── Sales Orders (50 đơn mẫu) ─────────────────────────────────────────────
  const orderCount = await prisma.salesOrder.count({ where: { tenantId: tenant.id } });
  if (orderCount < 50) {
    const toCreateOrders = 50 - orderCount;
    const availableVehicles = await prisma.vehicle.findMany({
      where: { tenantId: tenant.id, status: 'SOLD' },
      take: toCreateOrders * 2,
    });
    const salesStaff = users.filter(u => u.role === UserRole.SALES_STAFF || u.role === UserRole.SALES_MANAGER);

    let orderIdx = orderCount;
    for (let i = 0; i < Math.min(toCreateOrders, availableVehicles.length); i++) {
      orderIdx++;
      const vehicle = availableVehicles[i];
      const customer = rand(customerRecords);
      const salesperson = rand(salesStaff);
      const branch = branches.find(b => b.id === vehicle.branchId) ?? branches[0];
      const date = randDate(90);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const orderNumber = `SO-${year}${month}-${String(orderIdx).padStart(5, '0')}`;
      const listPrice = Number(vehicle.sellingPrice ?? 1_000_000_000);
      const discount = randInt(0, 3) * 10_000_000;
      const finalPrice = listPrice - discount;
      const statuses: OrderStatus[] = ['DELIVERED', 'DELIVERED', 'PAID', 'CONFIRMED', 'DRAFT'];
      const status = rand(statuses);

      try {
        await prisma.salesOrder.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            orderNumber,
            customerId: customer.id,
            vehicleId: vehicle.id,
            salespersonId: salesperson.id,
            listPrice,
            discountAmount: discount,
            finalPrice,
            depositAmount: Math.round(finalPrice * 0.1),
            paymentMethod: rand(['CASH', 'BANK_TRANSFER', 'LOAN', 'INSTALLMENT']),
            status,
            approvedBy: ['DELIVERED', 'PAID'].includes(status) ? salesStaff[0].id : null,
            approvedAt: ['DELIVERED', 'PAID'].includes(status) ? date : null,
            deliveryDate: status === 'DELIVERED' ? new Date(date.getTime() + 7 * 86400_000) : null,
            createdAt: date,
            payments: {
              create: {
                amount: status === 'DELIVERED' ? finalPrice : Math.round(finalPrice * 0.1),
                method: 'BANK_TRANSFER',
                paidAt: date,
                note: 'Seed payment',
                receivedBy: salesperson.id,
              },
            },
          },
        });
      } catch {
        // bỏ qua nếu trùng orderNumber
      }
    }
    console.log(`✓ Tạo đơn hàng mẫu (tổng ${await prisma.salesOrder.count({ where: { tenantId: tenant.id } })} đơn)`);
  } else {
    console.log(`✓ Đã có ${orderCount} đơn hàng — bỏ qua`);
  }

  console.log('\n🎉 Seed hoàn tất!');
  console.log('━'.repeat(40));
  console.log('  Tài khoản đăng nhập:');
  console.log('  admin@demo.com       / password123  (ADMIN)');
  console.log('  manager@demo.com     / password123  (SALES_MANAGER)');
  console.log('  staff1@demo.com      / password123  (SALES_STAFF)');
  console.log('  accountant@demo.com  / password123  (ACCOUNTANT)');
  console.log('━'.repeat(40));
}

main().catch(console.error).finally(() => prisma.$disconnect());
