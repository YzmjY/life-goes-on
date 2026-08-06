# 墨井

> 掘地及泉，不见其源，唯见其清。

墨井是一个零依赖的 Markdown 静态博客生成器，专为简洁优雅的中文写作而设计。

---

## 特性

- **零依赖** — 不依赖任何 npm 包，仅使用 Node.js 内置模块
- **纯 Markdown** — 所有内容都是 `.md` 文件，无需数据库
- **目录模式** — 文章和配图放在同一个目录下，管理整洁
- **草稿支持** — `draft: true` 即可隐藏未完成的文章
- **暗色模式** — 自动跟随系统，支持手动切换
- **合集** — 系列文章独立管理，支持章节导航
- **标签、归档** — 自动生成，中文标签完整支持
- **分页** — 首页自动分页
- **RSS / Sitemap** — 自动生成
- **GitHub Pages** — 推送即部署，CI 自动发布

## 快速开始

```powershell
# 构建
node build.js

# 预览
node serve.js

# 构建（含草稿）
node build.js --drafts
```

或使用 npm：

```powershell
npm run build          # 生产构建
npm run drafts         # 构建（含草稿）
npm run dev            # 构建 + 本地预览
npm run serve          # 仅启动预览
```

## 编写文章

在 `content/posts/` 下创建 `.md` 文件：

```markdown
---
title: 我的文章
date: 2026-08-06
tags: [生活, 思考]
---

正文内容……
```

### 目录模式（推荐）

```
content/posts/
  my-post/
    index.md          # 文章内容
    photo.jpg         # 文章配图
```

Markdown 中直接引用：`![配图](photo.jpg)`

### 草稿

在 frontmatter 中添加 `draft: true`，构建时默认排除。

```markdown
---
title: 未完成的文章
date: 2026-08-06
draft: true
---
```

## 目录结构

```
life-goes-on/
├── content/
│   ├── posts/          # 文章（.md 或 目录）
│   ├── series/         # 合集
│   └── pages/          # 独立页面（关于等）
├── assets/             # 静态资源
├── lib/
│   ├── markdown.js     # Markdown 解析器
│   └── templates.js    # HTML 模板
├── build.js            # 构建脚本
├── serve.js            # 预览服务器
├── config.json         # 站点配置
└── make.ps1            # PowerShell 构建脚本
```

## 部署

推送至 GitHub 后，Actions 自动构建并部署到 GitHub Pages。

## License

MIT
