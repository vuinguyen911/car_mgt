## Tổng hợp hệ thống quản trị xe hơi 1M+

---

## 1. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN WEB APP                            │
│                    Next.js 15 (App Router)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                       API GATEWAY                               │
│              NestJS (REST + WebSocket Gateway)                  │
│         Auth │ Rate Limit │ Logging │ Multi-tenant              │
└──┬───────────┬────────────┬─────────────┬───────────────────────┘
   │           │            │             │
   ▼           ▼            ▼             ▼
PostgreSQL   MongoDB    Elasticsearch   Redis
(OLTP,       (Report    (Search,        (Cache,
 source      snapshots, analytics)      Session,
 of truth)   dashboard)                 Queue)
                                         │
                                       BullMQ
                                    (Import/Export
                                      Jobs)
```

---

## 2. Toàn bộ chức năng hệ thống

```
HỆ THỐNG QUẢN TRỊ XE HƠI
│
├── 1. AUTH & PHÂN QUYỀN
│   ├── Đăng nhập / Đăng xuất (JWT + Refresh Token)
│   ├── 2FA (TOTP/Email OTP)
│   ├── Quản lý phiên đăng nhập (revoke session)
│   ├── RBAC: Super Admin / Admin / Manager / Staff / Accountant / Viewer
│   ├── Phân quyền theo chi nhánh
│   └── Audit log mọi hành động
│
├── 2. QUẢN LÝ DANH MỤC
│   ├── Hãng xe (Brand): CRUD, logo, xuất xứ
│   ├── Dòng xe (Model): phân khúc, segment
│   ├── Phiên bản (Variant): năm, trim, thông số kỹ thuật
│   └── Màu sắc: nội/ngoại thất, mã màu
│
├── 3. QUẢN LÝ KHO XE (INVENTORY)
│   ├── Danh sách xe (1M+ records, virtual scroll, cursor pagination)
│   ├── Thêm / Sửa / Xóa xe đơn lẻ
│   ├── Import hàng loạt CSV (BullMQ queue, progress realtime)
│   ├── Export Excel / CSV theo filter
│   ├── Tìm kiếm nâng cao (Elasticsearch: full-text, faceted)
│   ├── Lịch sử trạng thái từng xe
│   ├── Quản lý vị trí kho (lô - hàng - ô)
│   ├── Cảnh báo xe tồn lâu (>30/60/90 ngày)
│   └── QR Code / Barcode theo VIN
│
├── 4. QUẢN LÝ BÁN HÀNG (SALES)
│   ├── Tạo đơn hàng, báo giá
│   ├── Đặt cọc / Giữ xe (reserve)
│   ├── Approve đơn (Manager+)
│   ├── Hợp đồng mua bán
│   ├── Theo dõi thanh toán (tiền mặt / chuyển khoản / trả góp)
│   ├── Bàn giao xe (delivery checklist)
│   ├── Hủy đơn + hoàn cọc
│   └── Lịch sử đơn hàng theo xe / khách hàng
│
├── 5. QUẢN LÝ NHẬP HÀNG (PROCUREMENT)
│   ├── Đơn nhập hàng (Purchase Order)
│   ├── Quản lý nhà cung cấp
│   ├── Nhận hàng, kiểm tra chất lượng
│   ├── Công nợ nhà cung cấp
│   └── Lịch sử giao dịch theo nhà cung cấp
│
├── 6. QUẢN LÝ KHÁCH HÀNG (CRM)
│   ├── Hồ sơ khách hàng cá nhân / doanh nghiệp
│   ├── Lịch sử mua xe / dịch vụ
│   ├── Phân khúc khách hàng (RFM: Champions / Loyal / At Risk / Lost)
│   ├── Chăm sóc khách hàng (follow-up reminder)
│   ├── Hợp đồng bảo hành
│   └── Nguồn khách hàng (walk-in / referral / ads)
│
├── 7. QUẢN LÝ BẢO DƯỠNG (SERVICE)
│   ├── Tiếp nhận xe vào xưởng
│   ├── Phiếu dịch vụ (routine / repair / warranty / recall)
│   ├── Phân công kỹ thuật viên
│   ├── Quản lý phụ tùng thay thế
│   ├── Thanh toán dịch vụ
│   ├── Đánh giá chất lượng dịch vụ
│   └── Lịch bảo dưỡng định kỳ (nhắc nhở khách)
│
├── 8. BÁO CÁO & PHÂN TÍCH
│   ├── Dashboard realtime (cập nhật 5 phút)
│   ├── Báo cáo tồn kho (ngày / tháng / aging)
│   ├── Báo cáo doanh số (ngày / tháng / quý / năm)
│   ├── Báo cáo hiệu suất nhân viên
│   ├── Báo cáo mua hàng & công nợ
│   ├── Báo cáo dịch vụ
│   ├── Báo cáo khách hàng (CRM analytics)
│   ├── So sánh MoM / YoY / Target vs Actual
│   └── Xuất báo cáo PDF / Excel
│
├── 9. QUẢN LÝ HỆ THỐNG
│   ├── Multi-tenant (nhiều công ty)
│   ├── Quản lý chi nhánh / showroom
│   ├── Quản lý user & phân quyền
│   ├── Cài đặt hệ thống (tiền tệ, thuế, hoa hồng)
│   ├── Notification (in-app + email + Zalo OA)
│   └── Backup & restore dữ liệu
│
└── 10. TIỆN ÍCH
    ├── Import / Export dữ liệu hàng loạt
    ├── Template Excel chuẩn
    ├── Realtime notification (WebSocket)
    ├── Dark / Light mode
    └── Mobile responsive (tablet-friendly)
```

---

## 3. Tech Stack đầy đủ

### Frontend

```
Next.js 15 (App Router)
├── UI Framework
│   ├── shadcn/ui          — component library
│   ├── Tailwind CSS 4     — styling
│   └── Radix UI           — accessibility primitives
│
├── Data & State
│   ├── TanStack Table v8  — virtual scroll, 1M+ rows
│   ├── TanStack Query v5  — server state, cache, pagination
│   ├── TanStack Virtual   — row virtualization
│   └── Zustand            — client global state
│
├── Forms & Validation
│   ├── React Hook Form    — form management
│   └── Zod                — schema validation (share với backend)
│
├── Charts & Visualization
│   ├── Recharts           — dashboard charts
│   └── ECharts            — báo cáo phức tạp, heatmap
│
└── Utilities
    ├── date-fns            — xử lý ngày tháng
    ├── xlsx / SheetJS      — export Excel client-side
    ├── react-dropzone      — upload file CSV
    └── socket.io-client    — realtime WebSocket
```

### Backend

```
NestJS (Node.js)
├── API
│   ├── REST API           — CRUD operations
│   ├── WebSocket Gateway  — realtime dashboard, notifications
│   └── Bull Board UI      — monitor import/export jobs
│
├── ORM & Database
│   ├── Prisma ORM         — type-safe, migrations
│   └── Drizzle ORM        — raw SQL performance (báo cáo nặng)
│
├── Auth
│   ├── Passport.js        — strategy (JWT, Local)
│   ├── JWT + Refresh Token
│   └── CASL               — granular permission (RBAC)
│
├── Queue & Jobs
│   ├── BullMQ             — import/export queue
│   └── Bull Board         — UI monitor jobs
│
├── Validation
│   └── class-validator + Zod (shared với frontend)
│
└── Utilities
    ├── Multer             — file upload
    ├── ExcelJS            — generate Excel server-side
    ├── PDFKit             — generate PDF báo cáo
    ├── nodemailer         — gửi email
    └── winston            — structured logging
```

### Infrastructure

```
Infrastructure
├── Containerization
│   ├── Docker + Docker Compose (dev)
│   └── Kubernetes (production)
│
├── CI/CD
│   ├── GitHub Actions
│   └── Deploy: Vercel (frontend) + AWS ECS (backend)
│
├── Monitoring
│   ├── Grafana + Prometheus — metrics
│   ├── Sentry              — error tracking
│   └── Datadog             — APM (production)
│
└── Storage
    └── AWS S3 + CloudFront  — ảnh xe, file export
```

---

## 4. Database — Toàn bộ Schema

### PostgreSQL (OLTP — Source of Truth)

```
PostgreSQL Schema
│
├── SYSTEM
│   ├── tenants              — Đa công ty
│   ├── branches             — Chi nhánh / showroom
│   ├── users                — Tài khoản hệ thống
│   ├── permissions          — Danh sách quyền
│   ├── role_permissions     — Mapping role ↔ permission
│   └── audit_logs *         — Lịch sử thao tác (partitioned by month)
│
├── CATALOG (Danh mục)
│   ├── brands               — Hãng xe
│   ├── models               — Dòng xe
│   ├── variants             — Phiên bản (năm, trim, thông số)
│   └── colors               — Màu sắc
│
├── INVENTORY (Kho xe)
│   ├── vehicles *           — Xe cụ thể (partitioned by year)
│   ├── vehicle_images       — Ảnh xe
│   └── vehicle_status_logs  — Lịch sử trạng thái
│
├── SALES (Bán hàng)
│   ├── customers            — Khách hàng
│   ├── sales_orders         — Đơn bán hàng
│   └── payments             — Thanh toán
│
├── PROCUREMENT (Nhập hàng)
│   ├── suppliers            — Nhà cung cấp
│   ├── purchase_orders      — Đơn nhập
│   └── purchase_order_items — Chi tiết đơn nhập
│
├── SERVICE (Bảo dưỡng)
│   ├── service_orders       — Phiếu dịch vụ
│   └── service_parts        — Phụ tùng sử dụng
│
├── REPORT WAREHOUSE
│   ├── report_inventory_daily      — Tồn kho ngày
│   ├── report_vehicle_aging        — Aging xe
│   ├── report_sales_daily          — Doanh số ngày
│   ├── report_sales_monthly        — Doanh số tháng
│   ├── report_salesperson_perf     — Hiệu suất nhân viên
│   ├── report_procurement_monthly  — Nhập hàng tháng
│   ├── report_service_monthly      — Dịch vụ tháng
│   └── report_customer_analytics   — CRM analytics
│
└── SYSTEM UTILS
    └── notifications        — Thông báo in-app

* Partitioned tables
```

### Indexes quan trọng

```sql
-- vehicles (table lớn nhất — 1M+ rows)
CREATE INDEX idx_vehicles_tenant_status   ON vehicles(tenant_id, status);
CREATE INDEX idx_vehicles_vin             ON vehicles(vin);
CREATE INDEX idx_vehicles_branch          ON vehicles(branch_id);
CREATE INDEX idx_vehicles_variant         ON vehicles(variant_id);
CREATE INDEX idx_vehicles_plate           ON vehicles(plate_number)
  WHERE plate_number IS NOT NULL;

-- sales_orders
CREATE INDEX idx_orders_tenant_status     ON sales_orders(tenant_id, status);
CREATE INDEX idx_orders_customer          ON sales_orders(customer_id);
CREATE INDEX idx_orders_salesperson       ON sales_orders(salesperson_id);
CREATE INDEX idx_orders_date              ON sales_orders(created_at DESC);

-- audit_logs (partitioned — index per partition tự động)
CREATE INDEX idx_audit_entity             ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_user               ON audit_logs(user_id, created_at DESC);
```

### MongoDB (Report Snapshots & Dashboard)

```
MongoDB Collections
│
├── realtime_dashboard       — Dashboard 5-phút snapshot
│   └── Document per tenant+branch+date
│
├── report_snapshots         — Báo cáo đã tính sẵn
│   └── { type, period, tenant_id, branch_id, data: {...} }
│
└── vehicle_search_cache     — Sync từ PG → search cache
    └── Aggregated document cho Elasticsearch sync
```

### Elasticsearch (Search & Analytics)

```
Elasticsearch Indices
│
├── vehicles                 — Full-text search xe
│   ├── Fields: brand, model, year, vin, plate, color, status
│   ├── Facets: brand, model, year, price_range, condition
│   └── Analyzer: vi_analyzer (tiếng Việt)
│
└── sales_analytics          — Aggregation báo cáo
    └── Fields: date, branch, brand, model, revenue, profit
```

### Redis (Cache & Realtime)

```
Redis Key Structure
│
├── STRING
│   ├── session:{token}                    TTL: 24h
│   ├── report:daily:{tenant}:{date}       TTL: 1h
│   └── report:monthly:{tenant}:{ym}       TTL: 6h
│
├── HASH
│   └── vehicle:{id}:summary               TTL: 15m
│
├── ZSET (Sorted Set)
│   └── sales:ranking:{tenant}:{ym}        TTL: 1 month
│
├── SET
│   └── vehicles:available:{branch}        TTL: 5m
│
├── STREAM
│   └── audit:stream                       — Event sourcing realtime
│
└── LIST
    └── import:job:queue                   — BullMQ backing store
```

---

## 5. Luồng dữ liệu chính

```
LUỒNG 1: Import 1M xe
CSV Upload → S3 → BullMQ Job → Validate → Batch Insert PG (1000/job)
         → Sync Elasticsearch → Update Redis cache → WebSocket notify

LUỒNG 2: Tạo đơn bán
Sales Staff tạo đơn → Reserve xe (PG transaction) → Notify Manager
         → Manager approve → Update vehicle status → Generate hợp đồng PDF
         → Gửi email khách hàng → Trigger report recalculation

LUỒNG 3: Dashboard realtime
Cron 5 phút → Aggregate PG → Write MongoDB snapshot
            → Invalidate Redis cache → WebSocket push → UI update

LUỒNG 4: Search xe
User nhập query → Elasticsearch → Faceted results (<50ms)
               → Click xe → Fetch detail từ PG (source of truth)

LUỒNG 5: Báo cáo tháng
Cron 23:59 ngày cuối tháng → ETL từ PG → Write report_sales_monthly
         → Generate Excel → Upload S3 → Notify Accountant/Manager
```

---

## 6. Phân quyền — Ma trận đầy đủ

| Module | Super Admin | Admin | Sales Mgr | Inventory Mgr | Sales Staff | Accountant | Viewer |
|--------|:-----------:|:-----:|:---------:|:-------------:|:-----------:|:----------:|:------:|
| Quản lý tenant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quản lý user | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Danh mục xe | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | 👁 |
| Xem tồn kho | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sửa xe | ✅ | ✅ | ❌ | ✅ | ✅* | ❌ | ❌ |
| Import hàng loạt | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Xem giá nhập | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Tạo đơn bán | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Approve đơn | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Nhập hàng | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Quản lý dịch vụ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Báo cáo doanh số | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Báo cáo tài chính | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Cấu hình hệ thống | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*\* Giới hạn field — không sửa được giá nhập*

---

## 7. Lộ trình phát triển

```
PHASE 1 — MVP (8 tuần)
├── Auth + RBAC + Multi-tenant
├── Danh mục xe (Brand/Model/Variant)
├── CRUD xe + Import CSV cơ bản
├── Tìm kiếm + Filter (PostgreSQL full-text)
└── Dashboard đơn giản

PHASE 2 — Core (6 tuần)
├── Module Bán hàng (đơn hàng, thanh toán)
├── Module Khách hàng (CRM cơ bản)
├── Báo cáo tồn kho + doanh số
├── Export Excel / PDF
└── Notification (in-app + email)

PHASE 3 — Advanced (6 tuần)
├── Elasticsearch (full-text + faceted search)
├── Realtime dashboard (WebSocket + Redis)
├── Module Dịch vụ bảo dưỡng
├── Import/Export hàng loạt (BullMQ)
└── Báo cáo nâng cao (MoM/YoY/KPI)

PHASE 4 — Scale (4 tuần)
├── MongoDB report snapshots
├── PostgreSQL partitioning + Read replicas
├── Performance tuning
├── Mobile responsive hoàn chỉnh
└── Monitoring (Grafana + Sentry)
```
