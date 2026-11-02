import { requireAdmin } from '../../utils/auth'
import { validateBackup, planImport, importWorkspace, recordOperation } from '../../utils/backup'
import { readZipManifest } from '../../utils/archive'
/** 预览或执行 Markdown、JSON、ZIP 导入。
 * @param event 当前请求。
 * @returns 导入计划或执行结果。
 * @throws 文件损坏返回 400，预览过期返回 409，写入失败回滚。
 */
export default defineEventHandler(async event => {
  requireAdmin(event)
  try {
    const parts = await readMultipartFormData(event); const action = parts?.find(p => p.name === 'action')?.data.toString() || 'plan'
    const files = parts?.filter(p => p.name === 'file') || []
    if (!files.length || files.reduce((sum, f) => sum + f.data.length, 0) > 100 * 1024 * 1024) throw createError({ statusCode: 400, statusMessage: '请选择文件，总大小不能超过 100MB' })
    let raw: unknown
    if (files.length === 1 && files[0]!.filename?.toLowerCase().endsWith('.zip')) raw = JSON.parse(readZipManifest(files[0]!.data))
    else if (files.length === 1 && files[0]!.filename?.toLowerCase().endsWith('.json')) raw = JSON.parse(files[0]!.data.toString())
    else {
      if (files.some(f => !f.filename?.toLowerCase().endsWith('.md'))) throw createError({ statusCode: 400, statusMessage: 'Markdown 可多选；JSON 或 ZIP 每次选择一个文件' })
      const { createHash } = await import('node:crypto'); const suppliedAt = parts?.find(p => p.name === 'importedAt')?.data.toString(); const now = suppliedAt && Number.isFinite(Date.parse(suppliedAt)) ? new Date(suppliedAt).toISOString() : '1970-01-01T00:00:00.000Z'
      raw = { format: 'xiaojueshi-workspace', version: 1, exportedAt: now, assets: [], history: [], content: files.map(f => { const body = f.data.toString(); const id = createHash('sha256').update(`${f.filename}\0${body}`).digest('hex').slice(0, 32); return { id, slug: id, title: (body.match(/^# (.+)$/m)?.[1] || f.filename!.replace(/\.md$/i, '')).slice(0, 200), body, summary: '', kind: 'note', category: '', tags: [], featured: false, visibility: 'private', revision: 1, createdAt: now, updatedAt: now, published: null } }) }
    }
    const backup = validateBackup(raw); const settings = parts?.find(p => p.name === 'restoreSettings')?.data.toString() === 'true'
    if (action === 'plan') return { plan: planImport(backup, settings) }
    if (action !== 'apply') throw createError({ statusCode: 400, statusMessage: '导入操作无效' })
    const token = parts?.find(p => p.name === 'token')?.data.toString()
    if (!token) throw createError({ statusCode: 400, statusMessage: '请先预览导入结果' })
    return { result: importWorkspace(backup, token, settings) }
  } catch (error) {
    const message = error instanceof Error ? error.message : '导入失败'
    recordOperation('导入失败', message, false)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 400, statusMessage: '文件解析失败：' + message.slice(0, 150) })
  }
})
