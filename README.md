# XIAOJUESHI

以 Nuxt、Vue、TypeScript 构建的个人内容工作台与公开博客。

## 本地运行

```sh
mise install
pnpm install
pnpm dev
```

打开终端打印的本机地址。访问 `/admin`，首次在服务器本机设置至少 12 个字符的管理员密码。初始化后不开放注册。不要将尚未初始化的工作台直接部署到公网。

本地数据库与图片保存在 `.data/workspace.sqlite`，不会进入版本控制。`DATA_DIR` 可指定独立数据目录。管理员会话有效期为一天；密码使用带随机盐的 scrypt 摘要保存。

## 当前实现

- 响应式首页、文章与随笔列表、中文关键词搜索、阅读页、知识库分层目录与章节阅读、项目及关于页、RSS。
- 单管理员登录、默认私密的内容编辑、自动保存、独立发布快照、撤回发布、修订冲突检测和历史恢复。
- CodeMirror Markdown 编辑与共用渲染管线，代码高亮、GFM 表格与任务列表、公式、脚注、Mermaid。
- PNG、JPEG、WebP、GIF 图片上传；只有公开发布快照实际引用的图片才允许未登录访问。
- Markdown 批量导入、JSON/ZIP 完整备份；导入先预览再确认，令牌检测过期计划，事务保证原子恢复。ZIP 包含 Markdown、组织结构、历史和原始图片；恢复不包含管理员密码或会话。
- 独立内容组织页面：内置类型改名、排序和停用，分类迁移、标签合并，以及内容批量分类和标签操作。
- 知识库支持嵌套章节、收录现有内容、章节内新建笔记、目录排序、归档与恢复；公开目录自动过滤私密内容。
- 设置页面包含基本信息、外观、编辑与发布、数据管理四个 Tab；支持浅色、深色与跟随系统，前后台和编辑器同步适配。
- Node.js + SQLite 与 Cloudflare Workers + SQLite Durable Object 双运行方式，参见 [部署说明](docs/DEPLOYMENT.md)。

初始文章均为明确标记的演示内容，可通过工作台编辑。知识库、类型、分类、标签与站点设置均持久化存储，升级时保留旧正文与原始 JSON。提示块目前使用引用样式，专用提示块语法待补充。

## 验证

```sh
pnpm test:core
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`test:core` 使用 Node 原生测试，无需安装第三方依赖。其余命令依赖 `pnpm install` 完成。

Playwright 需要先完成生产构建。它在 3100 端口启动开发服务、使用独立的 `.data/e2e-runs/<运行编号>/source`，另在 3101 端口启动生产服务、使用对应的 `restore` 目录 验证独立数据库恢复。在 1440、768、390、320px 生成 36 组公开页面整页截图，另生成 72 组工作台与知识库的深浅主题截图，检查桌面与手机编辑器。截图位于 `test-results`，报告位于 `playwright-report`。

已验证正文、私人编辑稿和图片恢复到独立数据库，以及同库合并不覆盖行为。移动端中文输入和软键盘仍需真机补验。代表截图保存在 `docs/screenshots`。

## 生产构建

```sh
pnpm build
pnpm preview
```

开发服务运行期间如需同时构建，可运行 `NUXT_BUILD_DIR=.nuxt-production pnpm build`，避免共用 Nuxt 构建目录。

当前产物运行在 Node.js。浏览器备份恢复测试已实际运行生产产物；Cloudflare 可运行 `pnpm deploy:cloudflare`，首次需要 Wrangler 授权；线上管理员初始化、GitHub Actions Secret 和回滚方式见 [部署说明](docs/DEPLOYMENT.md)。

## 文档

- `docs/PROJECT.md`：需求与验收标准。
- `docs/IMPLEMENTATION.md`：本轮进展和验证限制。
- `GLOSSARY.md`：领域词汇。
- `docs/adr/0001-portable-content-workspace.md`：架构决策。
- `docs/adr/0002-knowledge-and-taxonomy.md`：知识库、组织结构及迁移约定。
