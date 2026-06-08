# Hệ thống Quản trị Xe hơi 1M+

## Cấu trúc project

```
nexjs_1_million/
├── frontend/                   Next.js 15 (App Router)
├── backend/
│   ├── config.yml              Cấu hình chính (commit được)
│   ├── config.local.yml        Override local/production (KHÔNG commit)
│   ├── config.local.yml.example
│   ├── prisma/schema.prisma
│   └── src/
│       └── common/
│           ├── config/         ConfigLoader, AppConfig types
│           └── database/
│               ├── database.module.ts      Build URL từ config, export PrismaService
│               ├── prisma.service.ts       Kết nối qua DatabaseModule
│               ├── base.repository.ts      Interface gốc
│               └── repository.tokens.ts   Injection tokens
├── docker-compose.yml          PostgreSQL + Redis
└── Kien_Truc_He_Thong_Xe_Hoi.docx
```

## Cấu hình Database

Mọi cấu hình nằm trong `backend/config.yml`. Không kết nối DB trực tiếp trong code.

### Đổi sang MySQL
```yaml
# config.yml
database:
  type: mysql          # ← đổi từ postgresql sang mysql
  host: localhost
  port: 3306
  username: root
  password: password
  name: car_admin_db
```

Sau đó cập nhật `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "mysql"   # ← đổi provider
  url      = env("DATABASE_URL")
}
```

Chạy lại: `npx prisma migrate dev`

### Đổi sang SQLite (không cần server — dev nhanh)
```yaml
database:
  type: sqlite
  name: ./dev.db       # đường dẫn file
```

### Cấu hình production (không commit password)
Tạo file `backend/config.local.yml` (đã có trong `.gitignore`):
```yaml
database:
  host: prod-db.example.com
  password: super-secret-password
  ssl: true

jwt:
  secret: very-long-random-production-secret
  refresh_secret: another-long-random-secret
```

File `config.local.yml` được merge đè lên `config.yml` — không cần sửa file gốc.

---

## Cách 1: Dùng Docker (khuyến nghị)

### Yêu cầu
- Docker Desktop đã cài và đang chạy

```bash
# 1. Start PostgreSQL + Redis
docker-compose up -d

# 2. Kiểm tra đang chạy
docker-compose ps
```

---

## Cách 2: Không dùng Docker

### 2a. Cài đặt trên macOS (Homebrew)

```bash
# Cài PostgreSQL và Redis nếu chưa có
brew install postgresql@16 redis

# Start PostgreSQL
brew services start postgresql@16

# Tạo database và user
psql postgres -c "CREATE USER postgres WITH PASSWORD 'password' SUPERUSER;"
psql postgres -c "CREATE DATABASE car_admin_db OWNER postgres;"

# Start Redis
brew services start redis

# Kiểm tra
psql -U postgres -d car_admin_db -c "SELECT version();"
redis-cli ping   # → PONG
```

### 2b. Cài đặt trên Ubuntu / Debian

```bash
# PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server

# Cấu hình PostgreSQL
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
sudo -u postgres createdb car_admin_db

# Start services
sudo systemctl start postgresql redis-server
sudo systemctl enable postgresql redis-server

# Kiểm tra
psql -U postgres -d car_admin_db -c "SELECT version();"
redis-cli ping   # → PONG
```

### 2c. Cài đặt trên Windows

```powershell
# Cài qua winget
winget install PostgreSQL.PostgreSQL
winget install Redis.Redis

# Hoặc dùng Scoop
scoop install postgresql redis

# Tạo database (mở psql shell)
psql -U postgres
CREATE DATABASE car_admin_db;
\q

# Start Redis (PowerShell)
redis-server
```

### 2d. Dùng PostgreSQL online miễn phí (không cần cài gì)

```
Neon (neon.tech)     — Free tier, serverless PostgreSQL
Supabase             — Free tier, PostgreSQL + thêm nhiều tính năng
Railway              — Free tier, PostgreSQL + Redis

Sau khi tạo xong, copy Connection String vào DATABASE_URL trong .env
```

---

## Backend

```bash
cd backend

# Copy file cấu hình
cp .env.example .env

# Chỉnh sửa .env nếu cần (mặc định đã dùng localhost)
# DATABASE_URL="postgresql://postgres:password@localhost:5432/car_admin_db"
# REDIS_URL="redis://localhost:6379"

# Cài dependencies
npm install

# Tạo tables từ schema
npm run db:migrate

# Seed dữ liệu mẫu
npm run db:seed

# Chạy development server
npm run start:dev
# → http://localhost:3001/api/v1
```

---

## Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy development server
npm run dev
# → http://localhost:3000
```

---

## Tài khoản mẫu

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | password123 | ADMIN |
| staff@demo.com | password123 | SALES_STAFF |

---

## Troubleshooting

### Lỗi: "Connection refused" khi connect PostgreSQL
```bash
# macOS — kiểm tra PostgreSQL đang chạy
brew services list | grep postgresql

# Restart nếu cần
brew services restart postgresql@16

# Kiểm tra port 5432
lsof -i :5432
```

### Lỗi: "ECONNREFUSED" khi connect Redis
```bash
# Kiểm tra Redis
redis-cli ping

# Start thủ công nếu chưa chạy
redis-server --daemonize yes

# macOS
brew services restart redis
```

### Lỗi: Prisma migrate fail
```bash
# Kiểm tra DATABASE_URL trong .env đúng chưa
cat backend/.env | grep DATABASE_URL

# Reset và migrate lại (xóa toàn bộ data)
npm run db:reset

# Nếu dùng Neon/Supabase — thêm ?sslmode=require vào cuối URL
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

### Lỗi: Port đã được dùng
```bash
# Tìm process đang dùng port 3001
lsof -i :3001
kill -9 <PID>

# Hoặc đổi port trong backend/.env
PORT=3002
```

---

## API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| POST | /api/v1/auth/login | Đăng nhập |
| GET | /api/v1/auth/me | Profile hiện tại |
| POST | /api/v1/auth/refresh | Refresh token |
| GET | /api/v1/vehicles | Danh sách xe (cursor pagination) |
| GET | /api/v1/vehicles/stats | Thống kê kho |
| GET | /api/v1/vehicles/:id | Chi tiết xe |
| POST | /api/v1/vehicles | Thêm xe mới |
| PUT | /api/v1/vehicles/:id | Cập nhật xe |
| DELETE | /api/v1/vehicles/:id | Xóa xe |
| GET | /api/v1/catalog/brands | Danh sách hãng xe |
| POST | /api/v1/catalog/brands | Thêm hãng xe |
| PUT | /api/v1/catalog/brands/:id | Cập nhật hãng xe |
