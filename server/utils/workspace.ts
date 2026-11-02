import { randomUUID } from 'node:crypto'
import { allDrafts, database, atomic, saveDraft } from './store'
import type { Draft, PublishedContent } from '../../shared/content'
import { publicSnapshot } from '../../shared/content'
import type { KnowledgeBase, SiteSettings, TaxonomyTerm, WorkspaceState } from '../../shared/workspace'
import { publicKnowledge } from '../../shared/workspace'

/** 读取工作台配置及稳定组织记录。
 * @returns 完整管理配置。
 * @throws 数据查询或解析失败时抛出异常。
 */
export function workspace(): WorkspaceState {
  const db = database()
  return { settings: JSON.parse((db.prepare('SELECT value FROM config WHERE key = ?').get('settings') as { value: string }).value), revision: Number((db.prepare('SELECT value FROM config WHERE key = ?').get('workspace-revision') as { value: string }).value), terms: (db.prepare('SELECT data FROM taxonomy').all() as { data: string }[]).map(r => JSON.parse(r.data)).sort((a, b) => a.position - b.position), bases: (db.prepare('SELECT data FROM knowledge').all() as { data: string }[]).map(r => JSON.parse(r.data)) }
}
/** 按当前术语名称展示内容，不改变正文或发布版本。
 * @param item 内容版本。
 * @param terms 可选术语列表。
 * @returns 更新显示名称后的内容。
 * @throws 无。
 */
export function resolveTerms<T extends Draft | PublishedContent>(item: T, terms = workspace().terms): T {
  const category = item.categoryId !== undefined ? item.categoryId ? terms.find(t => t.id === item.categoryId && t.kind === 'category')?.name || '' : '' : item.category
  const tags = item.tagIds ? item.tagIds.flatMap(id => { const t = terms.find(t => t.id === id && t.kind === 'tag'); return t ? [t.name] : [] }) : item.tags
  return { ...item, category, tags }
}
/** 读取仅可公开的发布快照。
 * @returns 公开内容集合。
 * @throws 数据库失败时抛出异常。
 */
export function publishedContent(): PublishedContent[] {
  const terms = workspace().terms
  return allDrafts().flatMap(d => { const p = publicSnapshot(d); return p ? [resolveTerms(p, terms)] : [] })
}
/** 读取经过内容权限过滤的知识库。
 * @returns 可公开的知识库与目录。
 * @throws 数据库失败时抛出异常。
 */
export function publicBases() {
  const content = publishedContent()
  return workspace().bases.flatMap(base => { const p = publicKnowledge(base, content); return p ? [p] : [] })
}
/** 增加配置修订号，供客户端检测并发编辑。
 * @returns 新修订号。
 * @throws 数据库失败时抛出异常。
 */
export function touchWorkspace(): number {
  const revision = workspace().revision + 1
  database().prepare('UPDATE config SET value = ? WHERE key = ?').run(String(revision), 'workspace-revision')
  return revision
}
/** 校验管理员读取的配置版本。
 * @param revision 客户端修订号。
 * @returns 无。
 * @throws 版本过期时返回 409。
 */
export function checkWorkspaceRevision(revision: number): void {
  if (revision !== workspace().revision) throw createError({ statusCode: 409, statusMessage: '配置已更新，请刷新后重试' })
}
/** 将已保存内容引用加入知识库指定章节。
 * @param baseId 知识库身份。
 * @param parentId 章节身份或根节点。
 * @param draft 新建的内容。
 * @returns 无。
 * @throws 知识库或章节不存在时返回 400。
 */
export function linkContent(baseId: string, parentId: string | null, draft: Draft): void {
  const base = workspace().bases.find(b => b.id === baseId)
  if (!base || (parentId && !base.nodes.some(n => n.id === parentId && !n.contentId))) throw createError({ statusCode: 400, statusMessage: '知识库或章节不存在' })
  base.nodes.push({ id: randomUUID(), parentId, title: draft.title, contentId: draft.id, position: base.nodes.filter(n => n.parentId === parentId).length })
  base.revision++; base.updatedAt = new Date().toISOString()
  database().prepare('UPDATE knowledge SET data = ? WHERE id = ?').run(JSON.stringify(base), base.id)
  touchWorkspace()
}
/** 为旧客户端或 Markdown 导入解析分类和标签，保留稳定身份。
 * @param categoryId 可选分类身份。
 * @param tagIds 可选标签身份。
 * @param category 旧分类名称。
 * @param tags 旧标签名称集合。
 * @returns 有效的组织关联。
 * @throws 显式传入的身份不存在时返回 400。
 */
export function contentReferences(categoryId: unknown, tagIds: unknown, category = '', tags: string[] = []) {
  const terms = workspace().terms
  const ensure = (kind: 'category' | 'tag', name: string): string | null => {
    const clean = name.trim().slice(0, 50); if (!clean) return null
    const known = terms.find(t => t.kind === kind && t.name.toLocaleLowerCase() === clean.toLocaleLowerCase())
    if (known) return known.id
    const term: TaxonomyTerm = { id: randomUUID(), kind, name: clean, enabled: true, position: terms.filter(t => t.kind === kind).length }
    database().prepare('INSERT INTO taxonomy VALUES (?, ?, ?)').run(term.id, kind, JSON.stringify(term)); terms.push(term); touchWorkspace(); return term.id
  }
  const categoryRef = categoryId !== undefined ? categoryId : ensure('category', category)
  if (categoryRef !== null && !terms.some(t => t.id === categoryRef && t.kind === 'category')) throw createError({ statusCode: 400, statusMessage: '分类不存在，请重新选择' })
  const tagRefs = tagIds !== undefined ? tagIds : tags.flatMap(t => { const id = ensure('tag', t); return id ? [id] : [] })
  if (!Array.isArray(tagRefs) || tagRefs.length > 20 || tagRefs.some(id => !terms.some(t => t.id === id && t.kind === 'tag'))) throw createError({ statusCode: 400, statusMessage: '标签不存在或超过数量限制' })
  return { categoryId: categoryRef as string | null, tagIds: [...new Set(tagRefs)] as string[] }
}
