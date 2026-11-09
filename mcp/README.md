# 博客 MCP 接入

本目录提供本机 stdio MCP 服务；源代码及三个 skills 由博客仓库维护，使用 Magpie Library 引用并分发。服务连接博客的 Agent 专用接口，线上和本地分别配置。

## 准备凭据

1. 分别在对应实例的后台「设置 → 数据管理 → Agent 凭据」创建凭据，选择需要的权限。默认有效期 90 天，密钥只显示一次。
2. 在本机终端运行对应命令，并在系统提示时粘贴凭据。-w 位于命令末尾，避免将密钥放进命令历史。

       security add-generic-password -U -a agent -s 'xiaojueshi-blog:https://www.xiaojueshi.top' -w
       security add-generic-password -U -a agent -s 'xiaojueshi-blog:http://127.0.0.1:3000' -w

   两条命令分别对应线上和本地实例，只配置实际使用的实例即可。不要把密钥粘贴到 Agent 对话。需要为某个 Agent 单独撤销时，创建另一枚凭据并用不同的账户名保存；为该 Agent 的 MCP 配置设置 XJS_BLOG_KEYCHAIN_ACCOUNT。

3. 目标服务必须可访问。线上使用 HTTPS；本地默认连接 http://127.0.0.1:3000。可在 MCP 进程配置中使用 XJS_BLOG_ONLINE_URL 或 XJS_BLOG_LOCAL_URL 指定对应实例；钥匙串服务名必须与实际 origin 完全一致。本地只接受 localhost、127.0.0.1 或 ::1。

## 在 Magpie 中注册

在 Magpie Library 的 MCP 服务中添加本机命令：Node 可执行文件为 mise 提供的 Node 22，参数为本仓库 mcp/server.mjs 的绝对路径。将仓库中 skills/blog-write、skills/blog-organize 和 skills/blog-publish 作为本地 skills 来源加入 Library，再分配给需要的 Agent。

Magpie 的具体导入界面和该机器安装版本的支持情况需要在配置时核验。源目录或 Node 路径移动后需要更新 Magpie 配置。全局接入适用于本机的 Codex、Claude Code、OpenCode、Cursor 和 Gemini CLI；每个客户端的发现与权限设置仍需实际检查。

写入编辑稿需要用户明确要求；发布、撤回、历史恢复和可能影响公开分类的操作先生成预览，并在用户确认后执行。预览最多有效 10 分钟，且只能由生成它的 MCP 进程确认；换 Agent、进程重启、预览失效或修订变化时需要重新预览和确认。写入超时后先读取状态再决定下一步。不要将凭据放入仓库、Magpie 配置明文、工具输出或聊天记录。
