# 部署与回滚

## Cloudflare 免费方案

运行 `pnpm build:cloudflare`，再运行 `pnpm exec wrangler deploy --config wrangler.jsonc`。首次部署前通过 `pnpm exec wrangler login` 在浏览器授权。当前配置使用 Workers 静态资源、Nuxt SSR 与 SQLite Durable Object；不要求开通付费 Workers 或 R2，不创建 D1。

所有动态请求路由到固定名称的工作台对象；数据库适配保留 SQL 事务、修订冲突和备份原子恢复。静态资源由 Workers Assets 提供。图片按 512KiB 的 base64 分片写入 SQL，保留原有最大 5MB 限制，避免平台单行 2MB 上限。正文与元数据的单行仍受平台限制。读者访问受 Workers 和 Durable Objects 免费额度约束，超额后需要等待额度恢复或由用户决定是否升级。

Node.js 部署仍可使用 `pnpm build`、`DATA_DIR=/持久化目录 pnpm preview`，JSON/ZIP 导入导出可在两种部署间迁移；账号密码与会话不包含在备份中。当前本地个人数据库不会自动上传，线上首次使用演示内容。

## 首次管理员初始化

部署完成后生成至少 32 字符的随机初始化密钥，以标准输入传给 Wrangler：

```sh
openssl rand -hex 32 | pnpm exec wrangler secret put ADMIN_SETUP_TOKEN --config wrangler.jsonc
```

不要将密钥提交到 GitHub。访问线上 `/admin`，用户亲自填写新管理员密码及初始化密钥。只有尚未初始化的实例使用此密钥，完成后运行 `pnpm exec wrangler secret delete ADMIN_SETUP_TOKEN --config wrangler.jsonc` 移除。禁止公开无密钥初始化，不能沿用本地测试密码。

## GitHub 持续集成与部署

`.github/workflows/ci.yml` 检查类型、Node 原生测试、单元测试、Node 生产构建、Playwright，并在独立任务中执行 Cloudflare 构建、上传包检查与 workerd 持久化冒烟测试。

仓库配置 `CLOUDFLARE_API_TOKEN` Actions Secret 后，`.github/workflows/deploy.yml` 在 main 检查通过后自动部署相同提交；也支持手动触发。Token 应限定到目标账号及本项目所需 Workers Scripts 编辑权限。不要将个人 OAuth 登录配置提交到仓库；本机 Wrangler 登录与 GitHub Actions 凭据分别管理。尚未配置 Secret 时，部署工作流会记录提示并跳过发布，不影响项目检查结果。

## 回滚与数据

代码使用追加提交替换旧源码，保留旧版本分支与完整 Git 历史，不使用强制推送。Workers 控制台可回滚到历史部署；代码回滚不会回滚数据库。数据变更前下载完整 ZIP 或 JSON，导入采用只新增恢复；勿以重新部署代替数据备份。

需要自定义域名时，在 Cloudflare 控制台为 Worker 添加域名，并确认域名由本人管理。当前默认使用 workers.dev，不改动旧站 DNS。

## 本地 Workers 验收

```sh
pnpm build:cloudflare
export TEST_ADMIN_PASSWORD="$(openssl rand -hex 16)"
export TEST_SETUP_TOKEN="$(openssl rand -hex 32)"
printf 'ADMIN_SETUP_TOKEN="%s"\n' "$TEST_SETUP_TOKEN" > .dev.vars
pnpm preview:cloudflare --port 3102
# 在另一个终端设置相同测试变量后运行
pnpm test:cloudflare
```

Wrangler 测试数据库位于 `.wrangler`，与 Node.js 的 `.data` 分离。验收包括初始化、登录、私密、发布、冲突、3MB 图片分片与原字节校验、完整备份、仅新增恢复、撤回及 SSR。`.dev.vars` 已排除版本控制，只含本机测试值。
