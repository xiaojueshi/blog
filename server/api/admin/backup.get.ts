import { requireAdmin } from '../../utils/auth'
import { exportWorkspace, recordOperation } from '../../utils/backup'
import { resolveTerms } from '../../utils/workspace'
import { zipFiles } from '../../utils/archive'
/** 导出 JSON 恢复包或包含 Markdown、元数据和原始附件的标准 ZIP。
 * @param event 当前请求。
 * @returns 可下载的完整备份。
 * @throws 未登录或导出失败时返回错误。
 */
export default defineEventHandler(event => {
  requireAdmin(event); const backup = exportWorkspace(); const zip = getQuery(event).format === 'zip'
  setHeader(event, 'Content-Disposition', `attachment; filename="xiaojueshi-backup.${zip ? 'zip' : 'json'}"`)
  if (!zip) { recordOperation('生成导出', `${backup.content.length} 项内容、${backup.workspace?.bases.length || 0} 个知识库，JSON 格式`); return backup }
  const files = [{ name: 'backup.json', data: Buffer.from(JSON.stringify(backup, null, 2)) }]
  for (const raw of backup.content) {
    const d = resolveTerms(raw); const body = d.body.replace(/\/api\/assets\/([\w-]+)/g, (_, id) => { const asset = backup.assets.find(a => a.id === id); return asset ? `../attachments/${id}.${asset.mime.split('/')[1] === 'jpeg' ? 'jpg' : asset.mime.split('/')[1]}` : `/api/assets/${id}` })
    files.push({ name: `content/${d.id}.md`, data: Buffer.from(body) }, { name: `content/${d.id}.json`, data: Buffer.from(JSON.stringify({ ...d, body: undefined }, null, 2)) })
  }
  for (const a of backup.assets) files.push({ name: `attachments/${a.id}.${a.mime.split('/')[1] === 'jpeg' ? 'jpg' : a.mime.split('/')[1]}`, data: Buffer.from(a.data, 'base64') })
  files.push({ name: 'README.md', data: Buffer.from('# XIAOJUESHI 数据导出\n\ncontent/ 内为 Markdown 与元数据；attachments/ 为原始图片；backup.json 包含完整版本、目录和配置，可在设置 → 数据管理中预览恢复。\n\n不包含管理员密码与会话。\n') })
  const archive = zipFiles(files); recordOperation('生成导出', `${backup.content.length} 项内容、${backup.workspace?.bases.length || 0} 个知识库，ZIP 格式`); setHeader(event, 'Content-Type', 'application/zip'); return archive
})
