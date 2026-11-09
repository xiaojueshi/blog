import { randomUUID } from 'node:crypto'
import { saveDraft, getDraft, allDrafts, database, atomic } from './store'
import { contentReferences, workspace, resolveTerms, linkContent } from './workspace'
import type { Draft, ContentKind } from '../../shared/content'

/** 保存编辑稿，或对现有内容执行发布、撤回与历史恢复。
 * @param body 已经通过调用方权限检查的内容参数。
 * @returns 保存后的编辑稿。
 * @throws 参数无效、版本冲突或存储失败时抛出异常。
 */
export function applyContentAction(body: any): Draft {
  if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.body !== 'string' || body.body.length > 500000) throw createError({ statusCode: 400, statusMessage: '请填写标题，正文不超过 50 万字符' })
  if (body.id && typeof body.id !== 'string') throw createError({ statusCode: 400 })
  return atomic(() => {
    const previous = body.id ? getDraft(body.id) : null
    if (body.id && !previous) throw createError({ statusCode: 404 })
    const id = previous?.id || randomUUID()
    const slug = String(body.slug || id).trim()
    if (!/^[a-zA-Z0-9\u4e00-\u9fff_-]{1,120}$/.test(slug)) throw createError({ statusCode: 400, statusMessage: '链接标识仅支持文字、数字、短横线与下划线' })
    if (allDrafts().some(d => d.id !== id && (d.slug === slug || d.published?.slug === slug))) throw createError({ statusCode: 409, statusMessage: '链接标识已被使用' })
    const config = workspace()
    const kind = body.kind || config.settings.defaultKind
    if (!config.terms.some(t => t.kind === 'type' && t.id === kind && (t.enabled || previous?.kind === kind))) throw createError({ statusCode: 400, statusMessage: '此类型已停用，请选择其他类型' })
    const refs = contentReferences(body.categoryId, body.tagIds, String(body.category || ''), Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : [])
    const now = new Date().toISOString()
    const result: Draft = { id, title: body.title.trim(), slug, summary: String(body.summary || '').slice(0, 500), body: body.body, ...refs, kind: kind as ContentKind, category: String(body.category || '').slice(0, 50), tags: Array.isArray(body.tags) ? body.tags.filter((v: unknown) => typeof v === 'string').slice(0, 20).map((v: string) => v.slice(0, 40)) : [], featured: Boolean(body.featured), visibility: previous?.visibility || 'private', published: previous?.published || null, revision: previous?.revision || 0, createdAt: previous?.createdAt || now, updatedAt: now }
    Object.assign(result, resolveTerms(result))
    if (body.action === 'publish') {
      result.visibility = 'public'
      result.published = { id, title: result.title, slug, summary: result.summary, body: result.body, kind: result.kind, category: result.category, tags: result.tags, featured: result.featured, categoryId: result.categoryId, tagIds: result.tagIds, publishedAt: now }
    } else if (body.action === 'withdraw') { result.visibility = 'private'; result.published = null }
    if (body.action === 'restore') {
      const history = database().prepare('SELECT data FROM history WHERE id = ? AND revision = ?').get(id, Number(body.restoreRevision)) as { data: string } | undefined
      if (!history) throw createError({ statusCode: 404, statusMessage: '历史版本不存在' })
      const old = JSON.parse(history.data) as Draft
      Object.assign(result, { title: old.title, body: old.body, summary: old.summary, category: old.category, tags: old.tags, kind: old.kind, categoryId: config.terms.some(t => t.id === old.categoryId) ? old.categoryId : null, tagIds: old.tagIds?.filter(tagId => config.terms.some(t => t.id === tagId)) || [] })
      Object.assign(result, resolveTerms(result))
    }
    const saved = saveDraft(result, Number(body.revision || 0))
    if (!previous && body.knowledgeBaseId) linkContent(String(body.knowledgeBaseId), body.parentNodeId || null, saved)
    return saved
  })
}
