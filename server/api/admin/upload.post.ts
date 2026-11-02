import { randomUUID } from 'node:crypto'
import { requireAdmin } from '../../utils/auth'
import { database, getDraft } from '../../utils/store'
/** 处理当前路由请求并执行相应的权限与数据规则。
 * @param event 当前 H3 请求事件。
 * @returns 当前接口的响应数据。
 * @throws 参数无效、权限不足或存储失败时返回相应错误。
 */
export default defineEventHandler(async event => {
  requireAdmin(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')
  const contentId = parts?.find(p => p.name === 'contentId')?.data.toString()
  if (!file || !contentId || !getDraft(contentId)) throw createError({ statusCode: 400, statusMessage: '请先保存笔记，再上传图片' })
  if (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type || '') || file.data.length > 5 * 1024 * 1024) throw createError({ statusCode: 400, statusMessage: '支持 PNG、JPEG、WebP、GIF，最大 5MB' })
  const id = randomUUID()
  database().prepare('INSERT INTO assets VALUES (?, ?, ?, ?)').run(id, file.data.toString('base64'), file.type!, contentId)
  return { url: `/api/assets/${id}` }
})
