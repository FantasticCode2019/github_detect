<div align="center">

# GitGuard AI

**为开源仓库和企业团队打造的 GitHub PR 守门人**

自动检测白名单之外的 Pull Request，一键批量关闭，告别 AI Bot 和陌生账号带来的代码噪音。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](docker-compose.yml)

[English](README.en.md) · **中文**

</div>

---

## 为什么需要 GitGuard AI？

AI 编程工具大爆发之后，开源仓库和企业 GitHub 组织正在面临一个新问题：**大量来自陌生账号（包括 AI Bot）的 PR 涌入**，维护者不得不逐一审查，耗费大量精力，真正有价值的贡献反而被淹没。

GitGuard AI 的解决思路直接有效：**维护一份可信用户白名单，白名单之外的 PR 自动标记，支持批量一键关闭或快速放行**。不需要复杂的机器学习模型，不需要昂贵的 SaaS 订阅，自托管、完全可控。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| **白名单管控** | 按仓库维护可信 GitHub 用户名列表，白名单外的 PR 自动标记 |
| **一键批量关闭** | 勾选多条检测结果，一次操作批量关闭所有问题 PR |
| **快速放行（Approve）** | 点击 Approve 将作者加入白名单，同时撤销检测标记 |
| **PR 扫描** | 对已存在的 Open PR 执行一次性白名单扫描，立即找出漏网之鱼 |
| **实时 Dashboard** | 监控仓库数量、待处理 PR 数、检测趋势图，全局一目了然 |
| **GitHub Webhook** | 新 PR 提交后自动触发检测，无需手动操作 |
| **GitHub OAuth 登录** | 直接使用 GitHub 账号登录，无需额外注册 |
| **多仓库管理** | 同时接入多个仓库，每个仓库独立维护白名单 |

---

## 界面预览

**Dashboard 总览**

![Dashboard 截图](docs/screenshots/dashboard.png)

**PR 检测列表（Flagged Pull Requests）**

![Detections 截图](docs/screenshots/detections.png)

**白名单管理（Whitelist）**

![Whitelist 截图](docs/screenshots/whitelist.png)

---

## 技术栈

**前端**
- React 19 + TypeScript 5.9
- Vite 7 构建
- Tailwind CSS + shadcn/ui 组件库
- Zustand 状态管理
- Recharts 图表
- React Router DOM

**后端**
- Node.js 20 + Express.js
- Prisma ORM
- JWT + GitHub OAuth 认证
- GitHub Webhook 集成
- 后台同步 Worker

**数据库 & 基础设施**
- PostgreSQL 16
- Redis 7（缓存）
- Docker Compose 一键部署
- Nginx 反向代理

---

## 快速开始

### 方式一：Docker Compose（推荐）

**1. 克隆仓库**

```bash
git clone https://github.com/your-username/gitguard-ai.git
cd gitguard-ai
```

**2. 配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env`，填入以下必填项：

```env
# GitHub OAuth App（在 GitHub Settings → Developer settings → OAuth Apps 创建）
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://your-domain:3001/auth/github/callback

# GitHub Webhook 密钥（自定义一个随机字符串）
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# JWT 密钥（自定义一个随机字符串）
JWT_SECRET=your_jwt_secret

# 前端访问地址
FRONTEND_URL=http://your-domain:80
VITE_API_URL=http://your-domain:3001
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

**3. 启动所有服务**

```bash
docker compose up -d
```

服务启动后：
- 前端：`http://localhost:80`
- 后端 API：`http://localhost:3001`

---

### 方式二：本地开发环境

**环境要求**
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

**1. 启动后端**

```bash
cd server
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库连接和 GitHub OAuth 信息

# 初始化数据库
npm run db:migrate

# （可选）填充示例数据
npm run db:seed

# 启动开发服务器（端口 3001）
npm run dev
```

**2. 启动前端**

```bash
# 回到项目根目录
cd ..
npm install

# 配置前端环境变量
cp .env.local.example .env.local
# 填入 VITE_API_URL 和 VITE_GITHUB_CLIENT_ID

# 启动开发服务器（端口 5173）
npm run dev
```

**3. 配置 GitHub OAuth App**

1. 前往 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. **Homepage URL**：`http://localhost:5173`
3. **Authorization callback URL**：`http://localhost:3001/auth/github/callback`
4. 将 Client ID 和 Client Secret 分别填入前端 `.env.local` 和后端 `server/.env`

**4. 配置 GitHub Webhook（可选，用于自动检测新 PR）**

1. 进入目标 GitHub 仓库 → Settings → Webhooks → Add webhook
2. **Payload URL**：`http://your-domain:3001/webhooks/github`
3. **Content type**：`application/json`
4. **Secret**：与 `.env` 中 `GITHUB_WEBHOOK_SECRET` 一致
5. 勾选 **Pull requests** 事件

---

## 使用流程

```
1. 用 GitHub 账号登录
       ↓
2. 添加要监控的仓库
       ↓
3. 在「Whitelist」中添加可信贡献者用户名
       ↓
4. 点击「Scan PRs」扫描已有 Open PR
       ↓
5. 在「Flagged PRs」中审查检测结果
   ├─ 点击「Approve」→ 加入白名单，撤销标记
   └─ 点击「Close PR」→ 直接关闭该 PR

后续新 PR 提交时，Webhook 自动触发检测，无需手动操作。
```

---

## 项目结构

```
github_detect/
├── src/                    # 前端 React 应用
│   ├── components/         # UI 组件
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx   # 总览仪表盘
│   │   ├── Detections.tsx  # PR 检测列表
│   │   ├── Whitelist.tsx   # 白名单管理
│   │   └── Repositories.tsx
│   ├── lib/                # API 客户端
│   ├── store/              # Zustand 状态管理
│   └── types/              # TypeScript 类型定义
├── server/                 # 后端 Express 服务
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # 认证、错误处理
│   │   ├── services/       # 业务逻辑（同步 Worker 等）
│   │   └── utils/
│   └── prisma/
│       └── schema.prisma   # 数据库模型
├── docker-compose.yml      # 一键部署配置
├── Dockerfile.frontend     # 前端镜像
└── nginx.conf              # Nginx 配置
```

---

## 主要 API 接口

| 接口 | 说明 |
|------|------|
| `POST /auth/github` | GitHub OAuth 登录 |
| `GET /repositories` | 获取已接入仓库列表 |
| `POST /repositories` | 添加仓库 |
| `GET /detections` | 获取 PR 检测结果列表 |
| `POST /detections/bulk-close` | 批量关闭 PR |
| `POST /detections/:id/resolve` | 放行并加入白名单 |
| `GET /whitelist` | 获取白名单 |
| `POST /whitelist` | 添加可信用户 |
| `DELETE /whitelist/:id` | 移除白名单条目 |
| `POST /whitelist/scan` | 扫描现有 Open PR |
| `POST /webhooks/github` | GitHub Webhook 接收端点 |

---

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交改动：`git commit -m 'feat: add your feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 发起 Pull Request

---

## License

[MIT](LICENSE)
