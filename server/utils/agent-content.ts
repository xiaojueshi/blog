import { createHash } from 'node:crypto'
import { allDrafts, atomic, database, getDraft } from './store'
import { workspace, resolveTerms } from './workspace'
import { applyContentAction } from './content-actions'
import { applyBulkAction, applyTermAction } from './taxonomy-actions'
import type { Draft } from '../../shared/content'

/** 计算内容和分类的修订摘要，供影响公开内容的操作检测预览是否过期。
 * @returns 当前工作台与内容修订的摘要。
 * @throws 读取数据库失败时抛出异常。
 */
export function agentContentFingerprint(): string {
  const revisions = allDrafts().map(d => [d.id, d.revision] as const).sort((a, b) => a[0].localeCompare(b[0]))
  return createHash('sha256').update(JSON.stringify([workspace().revision, revisions])).digest('hex')
}

/** 读取 Agent 所需的类型、分类和标签，而不暴露站点设置或知识库。
 * @returns 分类信息、工作台修订和内容修订摘要。
 * @throws 读取数据库失败时抛出异常。
 */
export function agentWorkspace() {
  const state = workspace()
  return { terms: state.terms, revision: state.revision, fingerprint: agentContentFingerprint() }
}

/** 检索内容摘要，或按身份读取一篇完整编辑稿和发布版本。
 * @param id 可选的内容身份。
 * @param query 可选的标题、摘要、正文或标签关键词。
 * @returns 一篇完整内容或匹配的内容摘要。
 * @throws 指定内容不存在或读取失败时抛出异常。
 */
export function agentContent(id?: string, query = '') {
  const terms = workspace().terms
  if (id) {
    const draft = getDraft(id)
    if (!draft) throw createError({ statusCode: 404, statusMessage: '内容不存在' })
    return { ...resolveTerms(draft, terms), published: draft.published ? resolveTerms(draft.published, terms) : null }
  }
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return allDrafts().map(d => ({ ...resolveTerms(d, terms), published: d.published ? resolveTerms(d.published, terms) : null }))
    .filter(d => words.every(word => `${d.title} ${d.summary} ${d.body} ${d.category} ${d.tags.join(' ')} ${d.published?.title || ''} ${d.published?.summary || ''} ${d.published?.body || ''} ${d.published?.category || ''} ${(d.published?.tags || []).join(' ')}`.toLocaleLowerCase().includes(word)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(d => ({ id: d.id, title: d.title, slug: d.slug, summary: d.summary, kind: d.kind, category: d.category, categoryId: d.categoryId, tags: d.tags, tagIds: d.tagIds, visibility: d.visibility, revision: d.revision, updatedAt: d.updatedAt, published: d.published ? { title: d.published.title, slug: d.published.slug, category: d.published.category, categoryId: d.published.categoryId, tags: d.published.tags, tagIds: d.published.tagIds, publishedAt: d.published.publishedAt } : null }))
}

/** 读取内容的历史版本摘要，或查看指定历史版本。
 * @param id 内容身份。
 * @param revision 可选的历史修订号。
 * @returns 历史摘要列表或指定版本的完整内容。
 * @throws 参数无效、内容或版本不存在时抛出异常。
 */
export function agentHistory(id: string, revision?: number) {
  if (!id || !getDraft(id)) throw createError({ statusCode: 404, statusMessage: '内容不存在' })
  if (revision !== undefined) {
    if (!Number.isInteger(revision) || revision < 1) throw createError({ statusCode: 400, statusMessage: '历史版本无效' })
    const row = database().prepare('SELECT revision, data FROM history WHERE id = ? AND revision = ?').get(id, revision) as { revision: number; data: string } | undefined
    if (!row) throw createError({ statusCode: 404, statusMessage: '历史版本不存在' })
    return JSON.parse(row.data) as Draft
  }
  return (database().prepare('SELECT revision, data FROM history WHERE id = ? ORDER BY revision DESC LIMIT 30').all(id) as { revision: number; data: string }[]).map(row => {
    const draft = JSON.parse(row.data) as Draft
    return { revision: row.revision, title: draft.title, updatedAt: draft.updatedAt }
  })
}

/** 以受限字段保存编辑稿，或对指定修订执行发布、撤回和恢复。
 * @param input Agent 请求中的操作与内容字段。
 * @returns 更新后的编辑稿。
 * @throws 参数无效、版本冲突或保存失败时抛出异常。
 */
export function applyAgentContentAction(input: any): Draft {
  const action = input?.action || 'save'
  if (!['save', 'publish', 'withdraw', 'restore'].includes(action) || !Number.isInteger(input?.revision) || input.revision < 0) throw createError({ statusCode: 400, statusMessage: '内容操作或修订号无效' })
  if (input.id !== undefined && (typeof input.id !== 'string' || !input.id)) throw createError({ statusCode: 400, statusMessage: '内容身份无效' })
  const previous = input.id ? getDraft(input.id) : null
  if (input.id && !previous) throw createError({ statusCode: 404, statusMessage: '内容不存在' })
  if (action !== 'save' && !previous) throw createError({ statusCode: 400, statusMessage: '请先选择已有内容' })
  if (!previous && input.revision !== 0) throw createError({ statusCode: 400, statusMessage: '新内容修订号必须为零' })
  if (action === 'restore' && (!Number.isInteger(input.restoreRevision) || input.restoreRevision < 1)) throw createError({ statusCode: 400, statusMessage: '历史版本无效' })

  // 发布和撤回只使用服务端当前编辑稿，避免借发布权限改写正文。
  if (action !== 'save') return atomic(() => {
    if (!Number.isInteger(input.workspaceRevision) || input.workspaceRevision !== workspace().revision) throw createError({ statusCode: 409, statusMessage: '分类或标签已变化，请重新预览' })
    return applyContentAction({ ...previous, revision: input.revision, action, restoreRevision: input.restoreRevision })
  })
  const body = {
    id: previous?.id, revision: input.revision, action: 'save',
    title: input.title ?? previous?.title, slug: input.slug ?? previous?.slug,
    summary: input.summary ?? previous?.summary ?? '', body: input.body ?? previous?.body,
    kind: input.kind ?? previous?.kind, featured: input.featured ?? previous?.featured ?? false,
    categoryId: input.categoryId !== undefined ? input.categoryId : previous?.categoryId ?? null,
    tagIds: input.tagIds !== undefined ? input.tagIds : previous?.tagIds ?? [],
  }
  // 仅使用稳定 ID，避免保存时按名称隐式创建分类或标签。
  return applyContentAction(body)
}

/** 创建、重命名、合并或移除分类与标签。
 * @param input Agent 提交的分类操作和预览摘要。
 * @returns 最新组织配置与受影响内容数。
 * @throws 越权操作、过期预览或版本冲突时抛出异常。
 */
export function applyAgentTermAction(input: any) {
  return atomic(() => {
    const state = workspace()
    const term = state.terms.find(t => t.id === input?.id)
    if (!['create', 'rename', 'merge', 'remove'].includes(input?.action) || (input.action === 'create' ? !['category', 'tag'].includes(input.kind) : !term || term.kind === 'type')) throw createError({ statusCode: 400, statusMessage: '仅支持管理分类与标签' })
    if (input.action !== 'create' && (typeof input.fingerprint !== 'string' || input.fingerprint !== agentContentFingerprint())) throw createError({ statusCode: 409, statusMessage: '内容或分类已变化，请重新预览' })
    return applyTermAction(input)
  })
}

/** 批量调整分类或标签，同时校验预览时的工作台修订。
 * @param input 批量操作、目标与各项修订号。
 * @returns 更新数量。
 * @throws 预览过期、参数无效或内容冲突时回滚并抛出异常。
 */
export function applyAgentBulkAction(input: any) {
  return atomic(() => {
    if (!Number.isInteger(input?.workspaceRevision) || input.workspaceRevision !== workspace().revision) throw createError({ statusCode: 409, statusMessage: '分类或标签已变化，请重新预览' })
    return applyBulkAction(input)
  })
}
