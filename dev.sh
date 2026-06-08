#!/usr/bin/env bash
# ============================================================
# dev.sh — Start / Restart Backend + Frontend (macOS)
# Usage:
#   ./dev.sh            # dev mode (hot-reload)
#   ./dev.sh prod       # production mode (build first)
#   ./dev.sh stop       # chỉ kill các tiến trình
# ============================================================

set -euo pipefail

# ── Màu sắc ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}[dev]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }
sep()  { echo -e "${CYAN}────────────────────────────────────────${NC}"; }

# ── Cấu hình ───────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
PID_FILE="$LOG_DIR/dev.pids"

BACKEND_PORT=3001
FRONTEND_PORT=3000
MODE="${1:-dev}"   # dev | prod | stop

# ── Node version (nvm) ─────────────────────────────────────
load_nvm() {
  if command -v nvm &>/dev/null; then return; fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    source "$HOME/.nvm/nvm.sh"
  elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    source "/opt/homebrew/opt/nvm/nvm.sh"
  fi
  if ! command -v nvm &>/dev/null; then
    warn "nvm không tìm thấy — dùng node hiện tại: $(node --version 2>/dev/null || echo 'N/A')"
    return
  fi
  # Ưu tiên node 20; fallback node 18
  if nvm ls 20 &>/dev/null 2>&1 | grep -q "v20"; then
    nvm use 20 --silent
  elif nvm ls 18 &>/dev/null 2>&1 | grep -q "v18"; then
    nvm use 18 --silent
  fi
}

# ── Kill tiến trình trên port ──────────────────────────────
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    ok "Killed port $port (PIDs: $pids)"
  fi
}

# ── Kill từ PID file ───────────────────────────────────────
kill_from_pidfile() {
  if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
}

# ── Dừng tất cả ────────────────────────────────────────────
stop_all() {
  log "Dừng các tiến trình cũ..."
  kill_from_pidfile
  kill_port "$BACKEND_PORT"
  kill_port "$FRONTEND_PORT"
  ok "Đã dừng tất cả."
}

# ── Đảm bảo SQLite ─────────────────────────────────────────
ensure_sqlite_config() {
  local cfg="$BACKEND_DIR/config.yml"
  if [ ! -f "$cfg" ]; then
    err "Không tìm thấy $cfg"; exit 1
  fi
  # Set db type = sqlite nếu chưa
  if ! grep -q "^  type: sqlite" "$cfg"; then
    # macOS sed cần ''
    sed -i '' 's/^  type: .*/  type: sqlite/' "$cfg"
    ok "config.yml → database.type = sqlite"
  else
    ok "database.type đã là sqlite"
  fi
}

# ── Prisma generate + migrate ──────────────────────────────
setup_db() {
  log "Kiểm tra Prisma schema..."
  cd "$BACKEND_DIR"

  # Đảm bảo prisma schema dùng sqlite provider
  local schema="$BACKEND_DIR/prisma/schema.prisma"
  if grep -q 'provider = "postgresql"' "$schema"; then
    sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' "$schema"
    # SQLite không hỗ trợ Decimal → dùng Float
    sed -i '' 's/@db\.Decimal([^)]*)//' "$schema"
    ok "Đã chuyển Prisma provider → sqlite"
  fi

  npx prisma generate --silent 2>/dev/null || npx prisma generate
  # migrate dev cần tên; dùng deploy để không cần interactive
  npx prisma migrate deploy 2>/dev/null || {
    warn "migrate deploy thất bại, thử db push..."
    npx prisma db push --accept-data-loss 2>/dev/null || true
  }
  ok "DB sẵn sàng"
  cd "$ROOT_DIR"
}

# ── Install dependencies nếu cần ──────────────────────────
install_deps() {
  local dir=$1
  local name=$2
  if [ ! -d "$dir/node_modules" ]; then
    log "Cài đặt dependencies $name..."
    (cd "$dir" && npm install --silent)
    ok "$name dependencies đã cài"
  fi
}

# ── Chạy Backend ───────────────────────────────────────────
start_backend() {
  log "Khởi động Backend (NestJS) — port $BACKEND_PORT..."
  cd "$BACKEND_DIR"

  local cmd
  if [ "$MODE" = "prod" ]; then
    log "Build backend..."
    npm run build 2>&1 | tail -5
    cmd="node dist/main"
  else
    cmd="npx nest start --watch"
  fi

  # shellcheck disable=SC2094
  eval "$cmd" >> "$BACKEND_LOG" 2>&1 &
  local pid=$!
  echo "$pid" >> "$PID_FILE"
  ok "Backend PID=$pid | log: .logs/backend.log"
  cd "$ROOT_DIR"
}

# ── Chạy Frontend ──────────────────────────────────────────
start_frontend() {
  log "Khởi động Frontend (Next.js) — port $FRONTEND_PORT..."
  cd "$FRONTEND_DIR"

  local cmd
  if [ "$MODE" = "prod" ]; then
    log "Build frontend..."
    npm run build 2>&1 | tail -10
    cmd="npm run start"
  else
    cmd="npm run dev"
  fi

  eval "$cmd" >> "$FRONTEND_LOG" 2>&1 &
  local pid=$!
  echo "$pid" >> "$PID_FILE"
  ok "Frontend PID=$pid | log: .logs/frontend.log"
  cd "$ROOT_DIR"
}

# ── Chờ service sẵn sàng ──────────────────────────────────
wait_for_port() {
  local port=$1 name=$2 retries=30
  log "Chờ $name (port $port)..."
  local i=0
  while ! lsof -i tcp:"$port" &>/dev/null; do
    sleep 1
    i=$((i+1))
    if [ $i -ge $retries ]; then
      warn "$name chưa sẵn sàng sau ${retries}s — kiểm tra log"
      return 1
    fi
  done
  ok "$name sẵn sàng!"
}

# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════
sep
echo -e "${BOLD}  Car Admin Dev Script — macOS${NC}"
echo -e "  Mode: ${YELLOW}$MODE${NC} | DB: ${GREEN}SQLite${NC}"
sep

# Chỉ stop
if [ "$MODE" = "stop" ]; then
  stop_all
  exit 0
fi

# Chuẩn bị
mkdir -p "$LOG_DIR"
: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"

# Load node 20
load_nvm
log "Node: $(node --version) | npm: $(npm --version)"

# Stop tiến trình cũ
stop_all

# Config & DB
ensure_sqlite_config
install_deps "$BACKEND_DIR" "Backend"
install_deps "$FRONTEND_DIR" "Frontend"
setup_db

sep
# Start services
start_backend
sleep 3  # cho NestJS bootstrap trước

start_frontend

sep
# Chờ cả 2 sẵn sàng
wait_for_port "$BACKEND_PORT" "Backend" || true
wait_for_port "$FRONTEND_PORT" "Frontend" || true

sep
echo -e "${BOLD}${GREEN}  🚀 Hệ thống đã khởi động!${NC}"
echo ""
echo -e "  Frontend  →  ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  Backend   →  ${CYAN}http://localhost:${BACKEND_PORT}/api/v1${NC}"
echo -e "  Swagger   →  ${CYAN}http://localhost:${BACKEND_PORT}/api/docs${NC}  (nếu bật)"
echo ""
echo -e "  Logs:"
echo -e "    Backend   tail -f ${YELLOW}.logs/backend.log${NC}"
echo -e "    Frontend  tail -f ${YELLOW}.logs/frontend.log${NC}"
echo ""
echo -e "  Dừng:  ${RED}./dev.sh stop${NC}  hoặc  ${RED}Ctrl+C${NC}"
sep

# Ctrl+C → stop all
trap 'echo ""; log "Nhận Ctrl+C — dừng tất cả..."; stop_all; exit 0' INT TERM

# Giữ script sống, stream log ra terminal
tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
