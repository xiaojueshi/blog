/** 内容类型：文章、随笔与笔记。 */
export type ContentKind = 'article' | 'thought' | 'note'
/** 独立编辑稿的数据结构。 */
export interface Draft {
  id: string; title: string; slug: string; summary: string; body: string
  kind: ContentKind; category: string; tags: string[]; featured: boolean
  categoryId?: string | null; tagIds?: string[]
  visibility: 'private' | 'public'; revision: number; updatedAt: string; createdAt: string
  published: PublishedContent | null
}
/** 公开发布快照，不包含未发布的编辑稿。 */
export interface PublishedContent {
  id: string; title: string; slug: string; summary: string; body: string
  kind: ContentKind; category: string; tags: string[]; featured: boolean
  categoryId?: string | null; tagIds?: string[]; publishedAt: string
}
/** 知识库目录，仅引用内容身份。 */
export interface Collection { id: string; title: string; description: string; icon: string; items: string[] }
/** 返回可供公共接口使用的独立快照。
 * @param draft 待检查的内容。
 * @returns 公开快照或空值。
 * @throws 无。
 */
export function publicSnapshot(draft: Draft): PublishedContent | null {
  return draft.visibility === 'public' && draft.published ? structuredClone(draft.published) : null
}
/** 对公开内容执行中文子串搜索，标题匹配优先。
 * @param items 已过滤权限的内容。
 * @param query 搜索关键词。
 * @param category 可选分类。
 * @returns 匹配并排序的内容。
 * @throws 无。
 */
export function searchContent(items: PublishedContent[], query = '', category = ''): PublishedContent[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return items.filter(item => (!category || item.category === category) && words.every(word => `${item.title} ${item.summary} ${item.body} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(word)))
    .sort((a, b) => Number(words.some(w => b.title.toLocaleLowerCase().includes(w))) - Number(words.some(w => a.title.toLocaleLowerCase().includes(w))) || b.publishedAt.localeCompare(a.publishedAt))
}
