# Hệ thống Quản trị Xe hơi 1M+

Nền tảng quản lý kho xe, bán hàng, khách hàng, báo cáo cho doanh nghiệp ô tô quy mô lớn (1 triệu+ xe).

---

## Cấu trúc project

```
nexjs_1_million/
├── dev.sh                          Script khởi động tự động (macOS)
├── docker-compose.yml              PostgreSQL + Redis (tuỳ chọn)
├── .logs/                          Log runtime (gitignored)
│   ├── backend.log
│   └── frontend.log
├── frontend/                       Next.js 15 (App Router)
│   └── src/
│       ├── app/(dashboard)/
│       │   ├── dashboard/          Trang tổng quan
│       │   ├── vehicles/           Kho xe (infinite scroll)
│       │   ├── customers/          Khách hàng
│       │   ├── orders/             Đơn hàng bán xe
│       │   ├── reports/            Báo cáo & xuất Excel
│       │   └── notifications/      Thông báo
│       ├── components/layout/
│       │   ├── Sidebar.tsx
│       │   └── NotificationBell.tsx
│       ├── hooks/                  TanStack Query hooks
│       └── store/                  Zustand auth store
└── backend/                        NestJS
    ├── config.yml                  Cấu hình chính (commit được)
    ├── config.local.yml            Override local/prod (KHÔNG commit)
    ├── config.local.yml.example
    ├── prisma/schema.prisma
    └── src/
        ├── auth/                   JWT + Refresh Token
        ├── inventory/vehicles/     Kho xe
        ├── catalog/brands/         Hãng xe
        ├── sales/
        │   ├── customers/          Khách hàng
        │   └── orders/             Đơn hàng (state machine)
        ├── reports/                Báo cáo tồn kho & doanh số
        ├── notifications/          Hệ thống thông báo
        └── common/
            ├── config/             Config loader (YAML)
            ├── database/           Repository pattern + Prisma
            └── export/             ExcelJS export
```

---

## ⚡ Khởi động nhanh (macOS — SQLite, không cần cài gì thêm)

```bash
# Cấp quyền thực thi (chỉ cần 1 lần)
chmod +x dev.sh

# Chạy toàn bộ hệ thống
./dev.sh
```

Script tự động làm tất cả:
- Load Node 20 qua nvm
- Kill tiến trình cũ trên port 3000 / 3001
- Set `config.yml` → `database.type: sqlite`
- Cài dependencies nếu thiếu
- Chạy `prisma generate` + `db push`
- Start backend (NestJS) + frontend (Next.js)
- Stream log trực tiếp ra terminal

Sau khi khởi động:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |

---

## Lệnh dev.sh

```bash
./dev.sh            # Dev mode — hot-reload (mặc định)
./dev.sh prod       # Production mode — build rồi mới start
./dev.sh stop       # Chỉ dừng tất cả tiến trình
```

### Xem log riêng từng service

```bash
tail -f .logs/backend.log
tail -f .logs/frontend.log
```

### Dừng hệ thống

```bash
./dev.sh stop
# hoặc nhấn Ctrl+C ngay trong terminal đang chạy
```

---

## Cấu hình Database

Mọi cấu hình nằm trong `backend/config.yml`. Không kết nối DB trực tiếp trong code — dùng Repository Pattern + DI token để dễ đổi DB sau này.

### SQLite (mặc định — dev nhanh, không cần server)

```yaml
# backend/config.yml
database:
  type: sqlite
  name: ./dev.db
```

### PostgreSQL

```yaml
database:
  type: postgresql
  host: localhost
  port: 5432
  username: postgres
  password: password
  name: car_admin_db
  ssl: false
```

### MySQL

```yaml
database:
  type: mysql
  host: localhost
  port: 3306
  username: root
  password: password
  name: car_admin_db
```

> Sau khi đổi `type`, cập nhật `provider` trong `prisma/schema.prisma` rồi chạy `npx prisma migrate dev`.

### Cấu hình production (không commit password)

Tạo file `backend/config.local.yml` (đã gitignore) — được merge đè lên `config.yml`:

```yaml
database:
  host: prod-db.example.com
  password: super-secret-password
  ssl: true

jwt:
  secret: very-long-random-production-secret
  refresh_secret: another-long-random-secret
```

---

## Cách chạy thủ công (không dùng dev.sh)

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push          # SQLite
# hoặc: npx prisma migrate dev  # PostgreSQL/MySQL

npm run start:dev           # dev với hot-reload
# → http://localhost:3001/api/v1
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Cách 3: Dùng Docker (PostgreSQL + Redis)

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Kiểm tra
docker-compose ps
```

Sau đó đổi `config.yml` sang `type: postgresql` và chạy backend thủ công như trên.

---

## Cách 4: PostgreSQL không dùng Docker

### macOS (Homebrew)

```bash
brew install postgresql@16 redis
brew services start postgresql@16
psql postgres -c "CREATE USER postgres WITH PASSWORD 'password' SUPERUSER;"
psql postgres -c "CREATE DATABASE car_admin_db OWNER postgres;"
brew services start redis
```

### Ubuntu / Debian

```bash
sudo apt update && sudo apt install -y postgresql redis-server
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
sudo -u postgres createdb car_admin_db
sudo systemctl enable --now postgresql redis-server
```

### PostgreSQL online miễn phí

| Dịch vụ | Ghi chú |
|---------|---------|
| [Neon](https://neon.tech) | Free tier, serverless PostgreSQL |
| [Supabase](https://supabase.com) | Free tier, PostgreSQL + nhiều tính năng |
| [Railway](https://railway.app) | Free tier, PostgreSQL + Redis |

Sau khi có Connection String, đặt vào `config.local.yml`:
```yaml
database:
  type: postgresql
  host: ep-xxx.neon.tech
  username: user
  password: secret
  name: neondb
  ssl: true
```

---

## Tài khoản mẫu

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | password123 | ADMIN |
| manager@demo.com | password123 | SALES_MANAGER |
| staff@demo.com | password123 | SALES_STAFF |
| accountant@demo.com | password123 | ACCOUNTANT |

---

## API Endpoints

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/auth/login` | Đăng nhập |
| GET | `/api/v1/auth/me` | Profile hiện tại |
| POST | `/api/v1/auth/refresh` | Refresh token |

### Kho xe
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/vehicles` | Danh sách xe (cursor pagination) |
| GET | `/api/v1/vehicles/stats` | Thống kê kho |
| GET | `/api/v1/vehicles/:id` | Chi tiết xe |
| POST | `/api/v1/vehicles` | Thêm xe |
| PUT | `/api/v1/vehicles/:id` | Cập nhật xe |
| DELETE | `/api/v1/vehicles/:id` | Xóa xe |

### Danh mục
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/catalog/brands` | Danh sách hãng xe |
| POST | `/api/v1/catalog/brands` | Thêm hãng xe |
| PUT | `/api/v1/catalog/brands/:id` | Cập nhật hãng xe |

### Khách hàng
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/customers` | Danh sách khách hàng |
| GET | `/api/v1/customers/search` | Tìm kiếm |
| GET | `/api/v1/customers/:id` | Chi tiết |
| POST | `/api/v1/customers` | Thêm khách hàng |
| PUT | `/api/v1/customers/:id` | Cập nhật |
| DELETE | `/api/v1/customers/:id` | Xóa |

### Đơn hàng
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/orders` | Danh sách đơn hàng |
| GET | `/api/v1/orders/summary` | Thống kê hôm nay & MTD |
| GET | `/api/v1/orders/:id` | Chi tiết đơn |
| POST | `/api/v1/orders` | Tạo đơn hàng |
| PUT | `/api/v1/orders/:id/confirm` | Xác nhận đơn |
| PUT | `/api/v1/orders/:id/approve` | Phê duyệt đơn |
| PUT | `/api/v1/orders/:id/deliver` | Bàn giao xe |
| PUT | `/api/v1/orders/:id/cancel` | Hủy đơn |
| POST | `/api/v1/orders/:id/payments` | Ghi nhận thanh toán |

### Báo cáo
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/reports/inventory` | Báo cáo tồn kho |
| GET | `/api/v1/reports/sales` | Báo cáo doanh số |
| GET | `/api/v1/reports/inventory/export` | Xuất Excel tồn kho |
| GET | `/api/v1/reports/sales/export` | Xuất Excel doanh số |

### Thông báo
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/notifications` | Danh sách thông báo |
| GET | `/api/v1/notifications/unread-count` | Số chưa đọc |
| PUT | `/api/v1/notifications/:id/read` | Đánh dấu đã đọc |
| PUT | `/api/v1/notifications/read-all` | Đọc tất cả |

---

## Phân quyền (RBAC)

| Role | Kho xe | Khách hàng | Đơn hàng | Phê duyệt | Báo cáo |
|------|--------|------------|----------|-----------|---------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| SALES_MANAGER | Xem | ✅ | ✅ | ✅ | ✅ |
| SALES_STAFF | Xem | ✅ | Tạo/Xem | — | — |
| INVENTORY_MANAGER | ✅ | — | Xem | — | Xem |
| ACCOUNTANT | Xem | Xem | Xem | — | ✅ |
| VIEWER | Xem | — | — | — | Xem |

---

## Troubleshooting

### Port đã bị dùng
```bash
# Dùng dev.sh — tự động kill port cũ
./dev.sh

# Hoặc kill thủ công
lsof -ti tcp:3001 | xargs kill -9
lsof -ti tcp:3000 | xargs kill -9
```

### Lỗi nvm / Node version
```bash
# Cài nvm nếu chưa có
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Cài Node 20
nvm install 20
nvm use 20
```

### Prisma lỗi schema (SQLite không hỗ trợ Decimal)
```bash
cd backend
# Đổi Decimal → Float trong schema.prisma rồi
npx prisma db push --accept-data-loss
```

### Lỗi kết nối PostgreSQL
```bash
# macOS — kiểm tra PostgreSQL đang chạy
brew services list | grep postgresql
brew services restart postgresql@16

# Kiểm tra port
lsof -i :5432
```

### Xem log chi tiết khi lỗi
```bash
# Xem log backend
tail -100 .logs/backend.log

# Xem log frontend
tail -100 .logs/frontend.log
```
