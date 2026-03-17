# GitGuard AI - AI Agent GitHub 管理平台

一个专门针对AI Agent自动提交代码和Issue的SaaS平台，帮助开源社区和企业维护高质量的代码协作环境。

## 🌐 在线演示

**前端界面**: https://utzeh4fdpjyce.ok.kimi.link

## 📋 项目概述

随着AI技术的快速发展，越来越多的开发者和组织开始使用AI Agent（如GitHub Copilot、CodeWhisperer等）来自动化代码提交、Issue创建和Pull Request管理。这带来了新的挑战：

- **质量管控难题**：AI生成的代码质量参差不齐
- **噪音信息激增**：自动化创建的Issue和PR数量庞大
- **安全风险**：难以识别恶意AI Agent或自动化攻击
- **协作混乱**：人机协作流程不清晰

GitGuard AI 通过以下核心功能解决这些问题：

| 功能模块 | 描述 |
|---------|------|
| 🔍 AI行为检测 | 智能识别AI生成的Issue/PR/Comment |
| 📊 智能分类过滤 | 基于规则+ML的自动分类与优先级排序 |
| ⚙️ 自动化工作流 | 可配置的自动化处理规则引擎 |
| 👥 团队协作 | 成员权限管理、审核分配、通知机制 |
| 📈 数据分析 | AI贡献度分析、质量报告、趋势洞察 |

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层 (Frontend)                        │
│                    React + TypeScript + Vite                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API网关层 (Gateway)                      │
│                    Express.js + Rate Limiting                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         服务层 (Services)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Repository │  │   AI Detect │  │      Rule Engine        │ │
│  │   Service   │  │   Service   │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Report    │  │    User     │  │    Webhook Handler      │ │
│  │   Service   │  │   Service   │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         数据层 (Data Layer)                      │
│  PostgreSQL  │  Redis  │  Elasticsearch  │  Kafka              │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **图表**: Recharts
- **路由**: React Router DOM

### 后端
- **运行时**: Node.js 20
- **框架**: Express.js
- **ORM**: Prisma
- **认证**: JWT + GitHub OAuth
- **API**: RESTful + WebSocket

### 数据库
- **主数据库**: PostgreSQL
- **缓存**: Redis
- **搜索引擎**: Elasticsearch

## 📁 项目结构

```
/mnt/okcomputer/output/
├── design-docs/                    # 设计文档
│   ├── 01-system-architecture.md   # 系统架构设计
│   └── 02-api-specification.yaml   # API接口规范
│
├── app/                           # 前端项目
│   ├── src/
│   │   ├── components/            # 组件
│   │   │   └── layout/            # 布局组件
│   │   ├── pages/                 # 页面
│   │   ├── store/                 # 状态管理
│   │   ├── lib/                   # 工具库
│   │   ├── types/                 # 类型定义
│   │   └── App.tsx                # 主应用
│   └── dist/                      # 构建输出
│
├── backend/                       # 后端项目
│   ├── src/
│   │   ├── routes/                # 路由
│   │   ├── middleware/            # 中间件
│   │   ├── types/                 # 类型定义
│   │   └── index.ts               # 入口文件
│   └── prisma/
│       └── schema.prisma          # 数据库模型
│
└── README.md                      # 项目说明
```

## 🚀 快速开始

### 环境要求
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 1. 克隆项目

```bash
git clone <repository-url>
cd gitguard-ai
```

### 2. 安装依赖

```bash
# 安装前端依赖
cd app && npm install

# 安装后端依赖
cd ../backend && npm install
```

### 3. 配置环境变量

```bash
# 后端环境变量
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库连接、GitHub OAuth等
```

### 4. 初始化数据库

```bash
# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev
```

### 5. 启动服务

```bash
# 启动后端服务 (端口3001)
npm run dev

# 启动前端服务 (端口5173)
cd ../app
npm run dev
```

## 📚 API文档

API接口遵循RESTful规范，详细文档见 `design-docs/02-api-specification.yaml`。

### 主要接口

| 接口 | 描述 |
|-----|------|
| `POST /auth/github` | GitHub OAuth登录 |
| `GET /repositories` | 获取仓库列表 |
| `GET /detections` | 获取AI检测结果 |
| `POST /rules` | 创建自动化规则 |
| `GET /analytics/overview` | 获取分析概览 |

## 🎯 核心功能

### 1. AI行为检测

使用机器学习模型分析以下指标：

- **写作模式分析**: 检测文本是否呈现AI生成特征
- **代码模式识别**: 识别AI生成的代码风格
- **模板相似度**: 检测与已知AI模板的相似性
- **响应时间异常**: 检测异常快速的响应
- **账户年龄信号**: 识别新建或低活跃度账户

### 2. 规则引擎

支持自定义自动化规则：

```json
{
  "name": "High Confidence AI PR Review",
  "conditions": {
    "operator": "AND",
    "conditions": [
      { "field": "target_type", "operator": "=", "value": "pull_request" },
      { "field": "ai_confidence", "operator": ">=", "value": 0.8 }
    ]
  },
  "actions": [
    { "action_type": "add_label", "action_config": { "label": "ai-generated" } },
    { "action_type": "request_review", "action_config": { "reviewers": ["senior-dev"] } }
  ]
}
```

### 3. 实时通知

支持多种通知渠道：
- 应用内通知
- 邮件通知
- Slack集成
- Webhook回调

## 📊 数据模型

### 核心实体

- **User**: 用户管理
- **Repository**: GitHub仓库
- **Issue**: GitHub Issue
- **PullRequest**: GitHub Pull Request
- **DetectionResult**: AI检测结果
- **Rule**: 自动化规则
- **Notification**: 通知消息

## 🔐 安全设计

1. **OAuth 2.0**: GitHub OAuth集成
2. **JWT Token**: 访问令牌 + 刷新令牌机制
3. **RBAC**: 基于角色的权限控制
4. **API Rate Limiting**: 按用户/组织限流
5. **Webhook签名验证**: 确保GitHub事件真实性

## 📈 性能优化

- **数据库索引**: 常用查询字段建立索引
- **Redis缓存**: 热点数据缓存
- **异步处理**: Webhook事件异步处理
- **分页查询**: 大数据集分页加载

## 🧪 测试

```bash
# 运行后端测试
cd backend
npm test

# 运行前端测试
cd ../app
npm test
```

## 🚢 部署

### Docker部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### Kubernetes部署

```bash
# 应用配置
kubectl apply -f k8s/
```

## 📝 开发计划

| 阶段 | 时间 | 目标 |
|-----|------|------|
| MVP | 4周 | 基础功能：仓库接入、AI检测、简单规则 |
| v1.0 | 8周 | 完整功能：规则引擎、通知、基础分析 |
| v1.5 | 12周 | 高级功能：高级分析、团队协作、API |
| v2.0 | 16周 | 企业功能：SSO、审计、私有化部署 |

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📧 联系

如有问题，请联系：api@gitguard.ai
