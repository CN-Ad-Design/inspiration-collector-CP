# 灵感收集器 · Inspiration Collector

> AI 驱动的视觉灵感素材管理工具

🎯 **立即访问：https://inspiration-collector.xyz**

---

## 项目简介

灵感收集器是一款基于 AI 的视觉素材管理工具，帮助设计师、创意工作者快速收集、整理和提取网页中的视觉灵感。

### 核心功能

- 📸 **图片收藏**：一键保存喜欢的视觉图片和配色方案
- 🏷️ **智能标签**：自动为每张图片生成内容标签，方便分类检索
- 🔍 **关键词搜索**：通过标签和描述快速找到灵感素材
- 👩‍🎨 **多账号支持**：每人独立的素材库，数据互不干扰
- 🎨 **设计参数提取**：框选图片区域，AI 自动生成 CSS/Figma 设计参数

---

## 技术栈

| 模块 | 技术 |
|---|---|
| 前端框架 | React + TypeScript + Vite |
| 状态管理 | Zustand |
| 路由 | React Router |
| 样式 | Tailwind CSS |
| AI 服务 | GLM-4V-Flash |
| 部署平台 | Vercel |

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 部署流程

本项目通过 Vercel 自动部署：

1. 代码推送到 GitHub 仓库的 `main` 分支
2. Vercel 自动检测到变更，触发新一轮构建
3. 几分钟后，新版本自动上线到 https://inspiration-collector.xyz

```bash
# 推送代码即触发部署
git push origin main
```

---

## 仓库信息

- **GitHub 仓库**：https://github.com/CN-Ad-Design/inspiration-collector-CP
- **所属组织**：[CN-Ad-Design](https://github.com/CN-Ad-Design)

---

© CN-Ad-Design Team
