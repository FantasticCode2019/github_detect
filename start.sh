#!/usr/bin/env bash
# start.sh — 一键本地启动前端 + 后端（无 Docker）
# 用法: ./start.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 检查依赖 ─────────────────────────────────────────────
command -v node >/dev/null 2>&1 || err "未找到 node，请先安装 Node.js"
command -v npm  >/dev/null 2>&1 || err "未找到 npm"

# ── 安装前端依赖 ──────────────────────────────────────────
log "安装前端依赖..."
cd "$ROOT_DIR"
[ ! -d node_modules ] && npm install || log "前端 node_modules 已存在，跳过"

# ── 安装后端依赖 ──────────────────────────────────────────
log "安装后端依赖..."
cd "$SERVER_DIR"
[ ! -d node_modules ] && npm install || log "后端 node_modules 已存在，跳过"

# ── 生成 Prisma Client ───────────────────────────────────
log "生成 Prisma Client..."
npx prisma generate

# ── 运行数据库迁移 ────────────────────────────────────────
log "运行数据库迁移..."
npx prisma migrate dev --name init 2>/dev/null || warn "迁移可能已是最新，继续..."

# ── 清理函数：Ctrl+C 时同时终止前后端 ────────────────────
cleanup() {
  echo ""
  warn "正在停止所有服务..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# ── 启动后端 ──────────────────────────────────────────────
log "启动后端 (http://localhost:3001)..."
cd "$SERVER_DIR"
npm run dev &
BACKEND_PID=$!

# ── 启动前端 ──────────────────────────────────────────────
log "启动前端 (http://localhost:5173)..."
cd "$ROOT_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
log "所有服务已启动:"
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3001"
echo "  按 Ctrl+C 停止所有服务"
echo ""

# 等待任一子进程退出
wait
