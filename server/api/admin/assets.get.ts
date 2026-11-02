import { requireAdmin } from '../../utils/auth'
import { allDrafts, database } from '../../utils/store'
/** 列出附件与引用情况，不传输 base64 正文。
 * @param event 当前请求。
 * @returns 附件元数据及来源内容。
 * @throws 未登录返回 401。
 */
export default defineEventHandler(event => {
  requireAdmin(event); const drafts = allDrafts()
  return (database().prepare('SELECT id, mime, content_id, length(data) AS size FROM assets').all() as { id: string; mime: string; content_id: string; size: number }[]).map(a => {
    const owner = drafts.find(d => d.id === a.content_id); const url = `/api/assets/${a.id}`
    const references = drafts.filter(d => d.body.includes(url) || d.published?.body.includes(url)).map(d => ({ id: d.id, title: d.title }))
    return { id: a.id, mime: a.mime, size: Math.floor(a.size * .75), url, ownerId: owner?.id || null, ownerTitle: owner?.title || '来源内容不存在', references, public: Boolean(owner?.visibility === 'public' && owner.published?.body.includes(url)) }
  })
})
