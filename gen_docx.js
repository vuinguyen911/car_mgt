const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer
} = require("docx");
const fs = require("fs");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 36, color: "1F4E79", font: "Arial" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: "2E75B6", font: "Arial" })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: "404040", font: "Arial" })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts })]
  });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    shading: { fill: "F3F3F3", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 18, font: "Courier New", color: "333333" })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: headerBorders,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: "2E75B6", type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF", font: "Arial" })]
          })]
        }))
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, ci) => new TableCell({
          borders,
          width: { size: colWidths[ci], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? "FFFFFF" : "F5F9FF", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 150, right: 150 },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20, font: "Arial" })]
          })]
        }))
      }))
    ]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun("")] });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1F4E79" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "404040" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } },
          children: [new TextRun({ text: "He Thong Quan Tri Xe Hoi 1M+ | Kien Truc & Thiet Ke", size: 20, color: "2E75B6", font: "Arial" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } },
          children: [
            new TextRun({ text: "Trang ", size: 18, font: "Arial", color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "888888" }),
          ]
        })]
      })
    },
    children: [
      // TITLE
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 240 },
        children: [new TextRun({ text: "HE THONG QUAN TRI XE HOI", bold: true, size: 52, color: "1F4E79", font: "Arial" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "Kien Truc Toan Dien cho 1,000,000+ Xe", size: 30, color: "2E75B6", font: "Arial" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: "Phac boi: Claude Code  |  2025", size: 22, color: "888888", font: "Arial", italics: true })]
      }),

      // 1. KIEN TRUC TONG THE
      h1("1. Kien Truc Tong The"),
      p("He thong duoc xay dung theo mo hinh Polyglot Persistence, su dung nhieu loai database khac nhau cho tung muc dich:"),
      spacer(),
      ...([
        "CLIENT / ADMIN UI  (Next.js 15 - App Router)",
        "         |  HTTPS / WebSocket",
        "     API GATEWAY  (NestJS)",
        "  Auth | Rate Limit | Logging | Multi-tenant",
        "         |",
        " ________v_______________________________________",
        "|          |            |           |           |",
        "PostgreSQL  MongoDB  Elasticsearch  Redis",
        "(OLTP)    (Reports)  (Search)      (Cache/Queue)",
      ].map(line => code(line))),
      spacer(),
      makeTable(
        ["Database", "Vai tro", "Ly do chon"],
        [
          ["PostgreSQL", "Source of truth, OLTP", "ACID, quan he phuc tap, bao cao chinh xac"],
          ["MongoDB", "Report snapshots, Dashboard", "Document linh hoat, Aggregation Pipeline"],
          ["Elasticsearch", "Full-text search, Analytics", "Faceted search <50ms tren 1M records"],
          ["Redis", "Cache, Session, Queue", "Sub-ms latency, Pub/Sub, BullMQ backing"],
        ],
        [2200, 3000, 4800]
      ),
      spacer(),

      // 2. CHUC NANG HE THONG
      h1("2. Toan Bo Chuc Nang He Thong"),

      h2("2.1 Auth & Phan Quyen"),
      bullet("Dang nhap / Dang xuat (JWT + Refresh Token)"),
      bullet("2FA (TOTP / Email OTP)"),
      bullet("Quan ly phien dang nhap, revoke session"),
      bullet("RBAC: Super Admin / Admin / Manager / Staff / Accountant / Viewer"),
      bullet("Phan quyen theo chi nhanh"),
      bullet("Audit log moi hanh dong"),
      spacer(),

      h2("2.2 Quan Ly Danh Muc"),
      bullet("Hang xe (Brand): CRUD, logo, xuat xu"),
      bullet("Dong xe (Model): phan khuc, segment"),
      bullet("Phien ban (Variant): nam, trim, thong so ky thuat"),
      bullet("Mau sac: noi/ngoai that, ma mau hex"),
      spacer(),

      h2("2.3 Quan Ly Kho Xe (Inventory)"),
      bullet("Danh sach xe (1M+ records, virtual scroll, cursor pagination)"),
      bullet("Them / Sua / Xoa xe don le"),
      bullet("Import hang loat CSV (BullMQ queue, progress realtime)"),
      bullet("Export Excel / CSV theo filter"),
      bullet("Tim kiem nang cao (Elasticsearch: full-text, faceted)"),
      bullet("Lich su trang thai tung xe"),
      bullet("Quan ly vi tri kho (lo - hang - o)"),
      bullet("Canh bao xe ton lau (>30/60/90 ngay)"),
      bullet("QR Code / Barcode theo VIN"),
      spacer(),

      h2("2.4 Quan Ly Ban Hang (Sales)"),
      bullet("Tao don hang, bao gia"),
      bullet("Dat coc / Giu xe (reserve)"),
      bullet("Approve don hang (Manager+)"),
      bullet("Hop dong mua ban"),
      bullet("Theo doi thanh toan: tien mat / chuyen khoan / tra gop"),
      bullet("Ban giao xe (delivery checklist)"),
      bullet("Huy don + hoan coc"),
      bullet("Lich su don hang theo xe / khach hang"),
      spacer(),

      h2("2.5 Quan Ly Nhap Hang (Procurement)"),
      bullet("Don nhap hang (Purchase Order)"),
      bullet("Quan ly nha cung cap"),
      bullet("Nhan hang, kiem tra chat luong"),
      bullet("Cong no nha cung cap"),
      bullet("Lich su giao dich theo nha cung cap"),
      spacer(),

      h2("2.6 Quan Ly Khach Hang (CRM)"),
      bullet("Ho so khach hang ca nhan / doanh nghiep"),
      bullet("Lich su mua xe / dich vu"),
      bullet("Phan khuc khach hang (RFM: Champions / Loyal / At Risk / Lost)"),
      bullet("Cham soc khach hang (follow-up reminder)"),
      bullet("Hop dong bao hanh"),
      bullet("Nguon khach hang (walk-in / referral / ads)"),
      spacer(),

      h2("2.7 Quan Ly Bao Duong (Service)"),
      bullet("Tiep nhan xe vao xuong"),
      bullet("Phieu dich vu (routine / repair / warranty / recall)"),
      bullet("Phan cong ky thuat vien"),
      bullet("Quan ly phu tung thay the"),
      bullet("Thanh toan dich vu"),
      bullet("Lich bao duong dinh ky (nhac nho khach)"),
      spacer(),

      h2("2.8 Bao Cao & Phan Tich"),
      bullet("Dashboard realtime (cap nhat 5 phut)"),
      bullet("Bao cao ton kho (ngay / thang / aging)"),
      bullet("Bao cao doanh so (ngay / thang / quy / nam)"),
      bullet("Bao cao hieu suat nhan vien"),
      bullet("Bao cao mua hang & cong no"),
      bullet("Bao cao dich vu"),
      bullet("So sanh MoM / YoY / Target vs Actual"),
      bullet("Xuat bao cao PDF / Excel"),
      spacer(),

      h2("2.9 Quan Ly He Thong"),
      bullet("Multi-tenant (nhieu cong ty)"),
      bullet("Quan ly chi nhanh / showroom"),
      bullet("Quan ly user & phan quyen"),
      bullet("Cai dat he thong: tien te, thue, hoa hong"),
      bullet("Notification: in-app + email + Zalo OA"),
      spacer(),

      h2("2.10 Tien Ich"),
      bullet("Import / Export du lieu hang loat"),
      bullet("Template Excel chuan"),
      bullet("Realtime notification (WebSocket)"),
      bullet("Dark / Light mode"),
      bullet("Mobile responsive (tablet-friendly)"),
      spacer(),

      // 3. TECH STACK
      h1("3. Tech Stack Day Du"),

      h2("3.1 Frontend"),
      makeTable(
        ["Cong nghe", "Muc dich", "Diem manh", "Diem yeu"],
        [
          ["Next.js 15", "Framework chinh", "SSR, App Router, full-stack 1 repo", "Cold start serverless"],
          ["TanStack Table v8", "Data table", "Virtual scroll 1M+ rows, headless", "API phuc tap"],
          ["TanStack Query v5", "Server state", "Cache, background refetch", "Boilerplate nhieu"],
          ["TanStack Virtual", "Row virtualization", "Render chi rows visible", "Can config ky"],
          ["shadcn/ui", "UI Components", "Copy-paste, khong vendor lock-in", "Update thu cong"],
          ["Tailwind CSS 4", "Styling", "Utility-first, nhanh dev", "Class name dai"],
          ["Zustand", "Client state", "Nhe 1KB, don gian", "Khong co middleware manh"],
          ["React Hook Form", "Form", "Performance cao, it re-render", "Verbose voi form phuc tap"],
          ["Zod", "Validation", "Type-safe, share voi backend", "Bundle size"],
          ["Recharts / ECharts", "Charts", "Dashboard + bao cao phuc tap", "ECharts learning curve"],
        ],
        [1800, 1800, 2700, 2700]
      ),
      spacer(),

      h2("3.2 Backend"),
      makeTable(
        ["Cong nghe", "Muc dich", "Diem manh", "Diem yeu"],
        [
          ["NestJS", "API Framework", "Modular, DI, enterprise-ready", "Nang hon Express"],
          ["Prisma ORM", "Database access", "Type-safe, migration tu dong", "Cham voi query phuc tap"],
          ["Drizzle ORM", "Bao cao nang", "Gan raw SQL, nhe, nhanh", "Ecosystem non tre"],
          ["BullMQ", "Job Queue", "Retry tu dong, UI dashboard", "Phu thuoc Redis"],
          ["Passport.js", "Auth", "Nhieu strategy, chuyen biet", "Config verbose"],
          ["CASL", "Authorization", "Granular RBAC, type-safe", "Can thiet ke can than"],
          ["ExcelJS", "Export Excel", "Server-side, nhieu tinh nang", "Bo nho lon voi file lon"],
          ["PDFKit", "Export PDF", "Linh hoat, khong phu thuoc", "Styling mat cong"],
          ["Socket.io", "WebSocket", "Realtime, auto-reconnect", "Tiet kiem bandwidth"],
        ],
        [1800, 1800, 2700, 2700]
      ),
      spacer(),

      h2("3.3 Infrastructure"),
      makeTable(
        ["Component", "Cong nghe", "Ghi chu"],
        [
          ["Container", "Docker + Kubernetes", "Dev: docker-compose | Prod: K8s"],
          ["CI/CD", "GitHub Actions", "Auto deploy khi merge main"],
          ["Frontend deploy", "Vercel", "Edge network, auto scaling"],
          ["Backend deploy", "AWS ECS / Fargate", "Container managed, cost-effective"],
          ["Database", "AWS RDS PostgreSQL", "Multi-AZ, automated backup"],
          ["Cache", "AWS ElastiCache Redis", "Cluster mode, high availability"],
          ["Search", "Elastic Cloud / OpenSearch", "Managed, scaling tu dong"],
          ["File storage", "AWS S3 + CloudFront", "Anh xe, file export, CDN toan cau"],
          ["Monitoring", "Grafana + Prometheus + Sentry", "Metrics, alert, error tracking"],
          ["Logging", "Winston + Datadog", "Structured log, APM production"],
        ],
        [2000, 3000, 4000]
      ),
      spacer(),

      // 4. DATABASE SCHEMA
      h1("4. Database Schema"),

      h2("4.1 PostgreSQL - OLTP (Source of Truth)"),
      makeTable(
        ["Schema", "Table", "Mo ta"],
        [
          ["SYSTEM", "tenants", "Da cong ty (multi-tenant)"],
          ["SYSTEM", "branches", "Chi nhanh / showroom"],
          ["SYSTEM", "users", "Tai khoan he thong"],
          ["SYSTEM", "permissions", "Danh sach quyen chi tiet"],
          ["SYSTEM", "role_permissions", "Mapping role va quyen"],
          ["SYSTEM", "audit_logs *", "Lich su thao tac - partition theo thang"],
          ["CATALOG", "brands", "Hang xe (Toyota, Honda...)"],
          ["CATALOG", "models", "Dong xe (Camry, Civic...)"],
          ["CATALOG", "variants", "Phien ban: nam, trim, thong so ky thuat"],
          ["CATALOG", "colors", "Mau sac noi/ngoai that"],
          ["INVENTORY", "vehicles *", "Xe cu the 1M+ records - partition theo nam"],
          ["INVENTORY", "vehicle_images", "Anh xe (S3 URL)"],
          ["INVENTORY", "vehicle_status_logs", "Lich su trang thai tung xe"],
          ["SALES", "customers", "Khach hang ca nhan / doanh nghiep"],
          ["SALES", "sales_orders", "Don ban hang"],
          ["SALES", "payments", "Thanh toan (cash/transfer/installment)"],
          ["PROCUREMENT", "suppliers", "Nha cung cap"],
          ["PROCUREMENT", "purchase_orders", "Don nhap hang"],
          ["PROCUREMENT", "purchase_order_items", "Chi tiet don nhap"],
          ["SERVICE", "service_orders", "Phieu dich vu / bao duong"],
          ["SERVICE", "service_parts", "Phu tung su dung trong dich vu"],
          ["REPORT DW", "report_inventory_daily", "Snapshot ton kho theo ngay"],
          ["REPORT DW", "report_vehicle_aging", "Aging xe (xe ton bao nhieu ngay)"],
          ["REPORT DW", "report_sales_daily", "Doanh so theo ngay"],
          ["REPORT DW", "report_sales_monthly", "Doanh so theo thang + MoM/YoY"],
          ["REPORT DW", "report_salesperson_perf", "KPI hieu suat nhan vien"],
          ["REPORT DW", "report_procurement_monthly", "Bao cao nhap hang thang"],
          ["REPORT DW", "report_service_monthly", "Bao cao dich vu thang"],
          ["REPORT DW", "report_customer_analytics", "CRM analytics, phan khuc RFM"],
          ["UTILS", "notifications", "Thong bao in-app"],
        ],
        [1500, 2500, 5000]
      ),
      spacer(),
      p("* Partitioned tables: vehicles (partition theo nam), audit_logs (partition theo thang)", { italics: true, color: "666666" }),
      spacer(),

      h3("Index quan trong (vehicles - table 1M+ rows)"),
      code("CREATE INDEX idx_vehicles_tenant_status  ON vehicles(tenant_id, status);"),
      code("CREATE INDEX idx_vehicles_vin            ON vehicles(vin);"),
      code("CREATE INDEX idx_vehicles_branch         ON vehicles(branch_id);"),
      code("CREATE INDEX idx_vehicles_variant        ON vehicles(variant_id);"),
      code("CREATE INDEX idx_vehicles_plate          ON vehicles(plate_number) WHERE plate_number IS NOT NULL;"),
      spacer(),

      h2("4.2 MongoDB - Report Snapshots"),
      makeTable(
        ["Collection", "Mo ta", "Cap nhat"],
        [
          ["realtime_dashboard", "Dashboard snapshot moi 5 phut / tenant+branch", "Cron 5 phut"],
          ["report_snapshots", "Bao cao da tinh san: { type, period, data: {...} }", "Cuoi ngay / thang"],
          ["vehicle_search_cache", "Cache dong bo tu PG sang ES", "Realtime CDC"],
        ],
        [2500, 4000, 2500]
      ),
      spacer(),

      h2("4.3 Elasticsearch - Search & Analytics"),
      makeTable(
        ["Index", "Fields", "Tinh nang"],
        [
          ["vehicles", "brand, model, year, vin, plate, color, status, price", "Full-text, faceted search, filter sidebar"],
          ["sales_analytics", "date, branch, brand, model, revenue, profit", "Aggregation, histogram, time-series"],
        ],
        [2000, 4000, 3000]
      ),
      spacer(),

      h2("4.4 Redis - Cache & Realtime"),
      makeTable(
        ["Structure", "Key Pattern", "TTL", "Muc dich"],
        [
          ["STRING", "session:{token}", "24h", "User session"],
          ["STRING", "report:daily:{tenant}:{date}", "1h", "Bao cao ngay da tinh"],
          ["STRING", "report:monthly:{tenant}:{ym}", "6h", "Bao cao thang da tinh"],
          ["HASH", "vehicle:{id}:summary", "15m", "Cache thong tin co ban xe"],
          ["ZSET", "sales:ranking:{tenant}:{ym}", "1 thang", "Xep hang doanh so nhan vien"],
          ["SET", "vehicles:available:{branch}", "5m", "Danh sach xe san sang ban"],
          ["STREAM", "audit:stream", "-", "Event sourcing realtime"],
          ["LIST", "import:job:queue", "-", "BullMQ import CSV backing store"],
        ],
        [1200, 2800, 1000, 3800]
      ),
      spacer(),

      // 5. LUONG DU LIEU
      h1("5. Luong Du Lieu Chinh"),
      makeTable(
        ["Luong", "Mo ta", "Cong nghe"],
        [
          ["Import 1M xe", "CSV Upload -> S3 -> BullMQ Job -> Validate -> Batch Insert PG (1000/job) -> Sync ES -> Update Redis -> WS notify", "S3, BullMQ, PostgreSQL, ES, Redis, WebSocket"],
          ["Tao don ban", "Sales Staff tao don -> Reserve xe (PG transaction) -> Notify Manager -> Approve -> Update status -> Generate PDF -> Email khach hang", "PostgreSQL ACID, PDFKit, nodemailer"],
          ["Dashboard realtime", "Cron 5 phut -> Aggregate PG -> Write MongoDB -> Invalidate Redis -> WebSocket push -> UI update", "Cron, PG, MongoDB, Redis, Socket.io"],
          ["Search xe", "User nhap query -> Elasticsearch (<50ms) -> Click xe -> Fetch detail tu PG (source of truth)", "Elasticsearch, PostgreSQL, Redis cache"],
          ["Bao cao thang", "Cron 23:59 cuoi thang -> ETL tu PG -> Write report tables -> Generate Excel -> Upload S3 -> Notify", "Cron, ETL, ExcelJS, S3, Email"],
        ],
        [1200, 4500, 3300]
      ),
      spacer(),

      // 6. PHAN QUYEN
      h1("6. Phan Quyen Role (RBAC)"),

      h2("6.1 Mo ta cac Role"),
      makeTable(
        ["Role", "Mo ta", "Pham vi"],
        [
          ["SUPER_ADMIN", "Toan quyen he thong, quan ly tenant", "Toan he thong"],
          ["ADMIN", "Quan ly toan bo 1 cong ty", "1 cong ty"],
          ["SALES_MANAGER", "Xem bao cao, approve don hang, quan ly doi kinh doanh", "Chi nhanh duoc phan cong"],
          ["INVENTORY_MANAGER", "Quan ly kho, nhap hang, kiem tra ton kho", "Chi nhanh duoc phan cong"],
          ["SALES_STAFF", "Tao don hang, xem xe, cham soc khach hang", "Chi nhanh duoc phan cong"],
          ["ACCOUNTANT", "Xem/xuat bao cao tai chinh, khong sua xe", "Toan cong ty - read only"],
          ["VIEWER", "Chi xem dashboard, khong thao tac", "Duoc cap quyen cu the"],
        ],
        [2000, 4000, 3000]
      ),
      spacer(),

      h2("6.2 Ma Tran Quyen Chi Tiet"),
      makeTable(
        ["Module", "Super Admin", "Admin", "Sales Mgr", "Inv. Mgr", "Staff", "Accountant", "Viewer"],
        [
          ["Quan ly tenant", "Yes", "No", "No", "No", "No", "No", "No"],
          ["Quan ly user", "Yes", "Yes", "No", "No", "No", "No", "No"],
          ["Danh muc xe", "Yes", "Yes", "No", "Yes", "No", "No", "Xem"],
          ["Xem ton kho", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
          ["Sua xe", "Yes", "Yes", "No", "Yes", "Co han *", "No", "No"],
          ["Import hang loat", "Yes", "Yes", "No", "Yes", "No", "No", "No"],
          ["Xem gia nhap", "Yes", "Yes", "Yes", "Yes", "No", "Yes", "No"],
          ["Tao don ban", "Yes", "Yes", "Yes", "No", "Yes", "No", "No"],
          ["Approve don", "Yes", "Yes", "Yes", "No", "No", "No", "No"],
          ["Nhap hang", "Yes", "Yes", "No", "Yes", "No", "No", "No"],
          ["Bao cao doanh so", "Yes", "Yes", "Yes", "No", "No", "Yes", "No"],
          ["Bao cao tai chinh", "Yes", "Yes", "No", "No", "No", "Yes", "No"],
          ["Cau hinh he thong", "Yes", "Yes", "No", "No", "No", "No", "No"],
        ],
        [2200, 1100, 1000, 1100, 1100, 1000, 1200, 900]
      ),
      spacer(),
      p("* Co han: Staff chi sua duoc mot so field, khong sua duoc gia nhap", { italics: true, color: "666666" }),
      spacer(),

      // 7. LO TRINH
      h1("7. Lo Trinh Phat Trien (4 Phase)"),
      makeTable(
        ["Phase", "Noi dung", "Thoi gian", "Ket qua"],
        [
          ["Phase 1 - MVP",
           "Auth + RBAC + Multi-tenant\nDanh muc xe (Brand/Model/Variant)\nCRUD xe + Import CSV co ban\nTim kiem + Filter (PG full-text)\nDashboard don gian",
           "8 tuan",
           "He thong co the su dung duoc, quan ly xe co ban"],
          ["Phase 2 - Core",
           "Module Ban hang (don hang, thanh toan)\nModule Khach hang (CRM co ban)\nBao cao ton kho + doanh so\nExport Excel / PDF\nNotification (in-app + email)",
           "6 tuan",
           "Luong ban hang hoan chinh tu tao don den thanh toan"],
          ["Phase 3 - Advanced",
           "Elasticsearch (full-text + faceted search)\nRealtime dashboard (WebSocket + Redis)\nModule Dich vu bao duong\nImport/Export hang loat (BullMQ)\nBao cao nang cao (MoM/YoY/KPI)",
           "6 tuan",
           "He thong day du tinh nang, search <50ms, dashboard realtime"],
          ["Phase 4 - Scale",
           "MongoDB report snapshots\nPostgreSQL partitioning + Read replicas\nPerformance tuning\nMobile responsive hoan chinh\nMonitoring: Grafana + Sentry",
           "4 tuan",
           "San sang cho 1M+ xe, high availability, monitoring day du"],
        ],
        [1500, 4000, 1200, 2300]
      ),
      spacer(),

      h2("Tong ket Stack chon lua"),
      makeTable(
        ["Layer", "Cong nghe", "Ly do chon"],
        [
          ["Frontend", "Next.js 15 + TanStack Table + shadcn/ui", "SSR, virtual scroll 1M rows, component san co"],
          ["Backend", "NestJS + Prisma + Drizzle", "Enterprise modular, type-safe, performance cao"],
          ["Primary DB", "PostgreSQL + Partitioning", "ACID, quan he phuc tap, partitioning 1M+ rows"],
          ["Report DB", "MongoDB", "Document linh hoat, Aggregation Pipeline manh"],
          ["Search", "Elasticsearch / Meilisearch", "Full-text, faceted, <50ms tren 1M records"],
          ["Cache", "Redis + BullMQ", "Sub-ms cache, job queue cho import/export"],
          ["Storage", "AWS S3 + CloudFront", "Anh xe, file export, CDN toan cau"],
          ["DevOps", "Docker + K8s + GitHub Actions", "Container, auto-scale, CI/CD tu dong"],
        ],
        [1500, 3500, 4000]
      ),
      spacer(),
      spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "--- Het tai lieu ---", size: 20, color: "888888", font: "Arial", italics: true })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/Users/vuinguyen/Downloads/3.Demo/nexjs_1_million/Kien_Truc_He_Thong_Xe_Hoi.docx", buffer);
  console.log("Done: Kien_Truc_He_Thong_Xe_Hoi.docx");
}).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
