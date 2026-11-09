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

当前 `wrangler.jsonc` 同时声明根域与 `www` 两个 Workers 自定义域名，再运行 `pnpm deploy:cloudflare` 即可。Cloudflare 会自动创建 DNS 记录并签发证书；绑定前必须移除同名旧记录，避免旧站点继续占用。规范域名是 `https://www.xiaojueshi.top`，根域请求由应用中间件 301 到该地址；`workers.dev` 地址保留为回退入口，不对外作为主域名。

## SEO、缓存与域名跳转

公开页会输出 canonical、Open Graph、Twitter 卡片、JSON-LD，并由 `/sitemap.xml` 汇总页面、文章与知识库目录；`/robots.txt` 禁止抓取 `/admin` 与 `/api/` 并声明 sitemap。知识库条目与文章内容相同时，canonical 指向文章主 URL，避免重复内容竞争。部署后请访问以下地址确认实际响应：

- `https://www.xiaojueshi.top/robots.txt`
- `https://www.xiaojueshi.top/sitemap.xml`
- `https://www.xiaojueshi.top/articles/markdown-guide`

Cloudflare 的 Managed robots.txt / Content Signals 功能可能覆盖源站 `robots.txt`。如果线上只看到 Cloudflare 注释而没有 `User-agent` 与 `Sitemap`，请在 Cloudflare 控制台关闭该托管规则，或确认它与源站文件合并后仍保留上述指令。提交搜索引擎前，先在 Google Search Console、Bing Webmaster Tools 与百度站长平台验证站点并提交 sitemap。

公开 HTML 已发送 `max-age=60`、`s-maxage=600`、`stale-while-revalidate=86400` 与 `CDN-Cache-Control`。`cloudflare/worker.js` 通过 Workers Cache API 缓存 `/`、`/articles*`、`/garden*`、`/projects`、`/about`、`/rss.xml`、`/sitemap.xml` 的成功 GET 响应；响应头 `x-xjs-cache` 会显示 `HIT` 或 `MISS`。Workers 自定义域名不会自动用 Zone Cache Rules 缓存 Worker 直接生成的响应，因此代码层缓存是实际生效路径；发布或撤回内容后最多等待 10 分钟。公开图片只使用浏览器 5 分钟私有缓存，不进入边缘缓存，以保证撤回后立即失效。浏览器缓存依赖 Cloudflare 的 Browser Cache TTL 设置为“遵循现有标头”，避免命中响应被统一改写为 4 小时。管理页、草稿附件和后台接口保持 `private, no-store`，不会进入缓存。

不建议接入第三方“Cloudflare 优选 IP”或不明来源的 CNAME 加速：这些 IP 通常按单一网络测速得出，无法覆盖不同省份、运营商和时段，也会让流量经过不受控的中间层。Cloudflare 官方的大陆网络需要企业方案与 ICP 备案；免费版只能通过缓存和换接入点缓解。

`server/middleware/canonical-host.ts` 会把 `http://` 与 `xiaojueshi.top` 的请求 301 到规范地址。根域与 `www` 都绑定到同一个 Worker，并建议开启 Always Use HTTPS 处理协议跳转。若更换主域名，构建时设置 `NUXT_PUBLIC_SITE_URL`，并同步更新 `public/robots.txt` 中的 sitemap 地址。

`server/middleware/legacy-redirects.ts` 会兼容旧 Astro 站点的公开入口：`/zh/`、`/blog/`、`/zh/blog/` 分别 301 到 `/`、`/articles`、`/articles`，`/zh/blog/markdown-style-guide/` 301 到 `/articles/markdown-guide`。规则仅匹配这些已知路径，不会把旧站未知文章误映射到新站；如果旧站还有真实文章，应先导出完整 URL 与正文，再逐篇建立映射。

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
