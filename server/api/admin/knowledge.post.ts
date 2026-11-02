import { randomUUID } from 'node:crypto'
import { requireAdmin } from '../../utils/auth'
import { atomic, database, getDraft } from '../../utils/store'
import { workspace, touchWorkspace } from '../../utils/workspace'
import { validKnowledgeNodes } from '../../../shared/workspace'
import type { KnowledgeBase, KnowledgeNode } from '../../../shared/workspace'
/** 保存或归档知识库；目录只引用正文，不复制正文。
 * @param event 当前请求。
 * @returns 已保存知识库。
 * @throws 校验失败返回 400，修订冲突返回 409。
 */
export default defineEventHandler(async event => {
  requireAdmin(event); const input = await readBody(event)
  return atomic(() => {
    const previous = workspace().bases.find(b => b.id === input?.id)
    if (input?.id && !previous) throw createError({ statusCode: 404, statusMessage: '知识库不存在' })
    if ((previous?.revision || 0) !== Number(input.revision || 0)) throw createError({ statusCode: 409, statusMessage: '目录已在其他窗口更新，请刷新后重试' })
    const id = previous?.id || randomUUID(); const title = String(input.title || '').trim(); const slug = String(input.slug || id).trim()
    if (!title || title.length > 100 || !/^[\w\u4e00-\u9fff-]{1,120}$/.test(slug) || workspace().bases.some(b => b.id !== id && b.slug === slug) || !['private','public'].includes(input.visibility)) throw createError({ statusCode: 400, statusMessage: '请输入名称、唯一链接和有效的公开状态' })
    if (!Array.isArray(input.nodes) || input.nodes.some((n: KnowledgeNode) => !n || typeof n.id !== 'string' || typeof n.title !== 'string' || (n.parentId !== null && typeof n.parentId !== 'string') || (n.contentId !== null && (typeof n.contentId !== 'string' || !getDraft(n.contentId)))) || !validKnowledgeNodes(input.nodes)) throw createError({ statusCode: 400, statusMessage: '目录无效：不能循环嵌套，章节必须存在，内容引用不能失效' })
    const base: KnowledgeBase = { id, title, slug, description: String(input.description || '').slice(0, 500), visibility: input.visibility, nodes: input.nodes.map((n: KnowledgeNode) => ({ id: n.id, title: n.title.trim(), parentId: n.parentId, contentId: n.contentId, position: n.position })), revision: (previous?.revision || 0) + 1, updatedAt: new Date().toISOString(), archived: Boolean(input.archived) }
    database().prepare('INSERT OR REPLACE INTO knowledge VALUES (?, ?)').run(base.id, JSON.stringify(base)); touchWorkspace(); return base
  })
})
