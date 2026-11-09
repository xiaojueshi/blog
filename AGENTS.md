# 项目协作规则

## 发布流程

新功能和修复上线必须遵循以下顺序，正常发布禁止跳过 GitHub CI：

1. 完成实现并在本地执行相关检查。
2. 创建 Git 提交并推送到 `origin/main`。
3. 等待 GitHub Actions 的“项目检查”成功。
4. 由 `.github/workflows/deploy.yml` 在 CI 成功后自动部署 Cloudflare。
5. 检查部署工作流确实执行了 `pnpm deploy:cloudflare`，并验证线上页面。

如果项目检查失败，追加修复提交并重新推送；如果部署失败，检查 GitHub Actions
日志并重新提交或重新触发部署。不得绕过 CI 直接在本机执行
`pnpm deploy:cloudflare`。

本地 `pnpm deploy:cloudflare` 仅限明确获用户授权的紧急故障处理。生产凭据只能
保存在 GitHub Actions Secret 中，禁止提交到仓库、写入文档或输出到对话。
