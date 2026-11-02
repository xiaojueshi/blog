import type { ContentKind, Draft, PublishedContent } from './content'

/** 主题选择；system 跟随设备设置。 */
export type ThemePreference = 'light' | 'dark' | 'system'
/** 内容组织术语，身份不随名称变化。 */
export interface TaxonomyTerm { id: string; kind: 'type' | 'category' | 'tag'; name: string; position: number; enabled: boolean }
/** 知识库目录节点；没有 contentId 的节点是章节。 */
export interface KnowledgeNode { id: string; parentId: string | null; title: string; contentId: string | null; position: number }
/** 可独立公开的知识库。 */
export interface KnowledgeBase { id: string; slug: string; title: string; description: string; visibility: 'private' | 'public'; nodes: KnowledgeNode[]; revision: number; updatedAt: string; archived?: boolean }
/** 站点、主题及写作偏好，不包含账号机密。 */
export interface SiteSettings { name: string; description: string; github: string; seoTitle: string; theme: ThemePreference; defaultKind: ContentKind; autosaveSeconds: number; showReadingTime: boolean; codeWrap: boolean }
/** 管理员可读取的工作台配置。 */
export interface WorkspaceState { settings: SiteSettings; terms: TaxonomyTerm[]; bases: KnowledgeBase[]; revision: number }
/** 知识库公开目录附带已发布内容信息。 */
export interface PublicKnowledgeBase extends KnowledgeBase { entries: PublishedContent[]; items: string[] }
/** 内容发布及编辑使用的稳定组织关联。 */
export interface ContentReferences { categoryId?: string | null; tagIds?: string[] }
/** 带关联标识的内容版本。 */
export type ReferencedContent = (Draft | PublishedContent) & ContentReferences

/** 按章节深度优先展开目录，兄弟节点按显式顺序排列。
 * @param nodes 经过校验的节点集合。
 * @param parentId 起始章节，默认目录根。
 * @param depth 初始缩进深度。
 * @returns 附带深度的有序节点。
 * @throws 无。
 */
export function flattenNodes(nodes: KnowledgeNode[], parentId: string | null = null, depth = 0): (KnowledgeNode & { depth: number })[] {
  if (depth > 20) return []
  return nodes.filter(n => n.parentId === parentId).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .flatMap(n => [{ ...n, depth }, ...flattenNodes(nodes, n.id, depth + 1)])
}

/** 检查目录关系，阻止循环、重复身份及内容节点充当章节。
 * @param nodes 待保存节点。
 * @returns 目录是否有效。
 * @throws 无。
 */
export function validKnowledgeNodes(nodes: KnowledgeNode[]): boolean {
  if (nodes.length > 2000 || new Set(nodes.map(n => n.id)).size !== nodes.length) return false
  const map = new Map(nodes.map(n => [n.id, n]))
  return nodes.every(node => {
    if (!node.id || !node.title.trim() || node.title.length > 200 || !Number.isFinite(node.position)) return false
    const seen = new Set([node.id]); let parent = node.parentId
    while (parent) {
      const ancestor = map.get(parent)
      if (!ancestor || ancestor.contentId || seen.has(parent) || seen.size > 20) return false
      seen.add(parent); parent = ancestor.parentId
    }
    return true
  })
}

/** 构建公开知识库，隐藏私人内容、空章节与未发布标题。
 * @param base 知识库。
 * @param published 已完成访问过滤的公开内容。
 * @returns 安全公开视图，私密知识库返回空值。
 * @throws 无。
 */
export function publicKnowledge(base: KnowledgeBase, published: PublishedContent[]): PublicKnowledgeBase | null {
  if (base.visibility !== 'public' || base.archived) return null
  const available = new Map(published.map(p => [p.id, p]))
  const visible = new Set(base.nodes.filter(n => n.contentId && available.has(n.contentId)).map(n => n.id))
  for (const node of base.nodes.filter(n => visible.has(n.id))) {
    let parent = node.parentId; let depth = 0
    while (parent && depth++ < 21) { visible.add(parent); parent = base.nodes.find(n => n.id === parent)?.parentId || null }
  }
  const nodes = base.nodes.filter(n => visible.has(n.id)).map(n => ({ ...n, title: n.contentId ? available.get(n.contentId)!.title : n.title }))
  const items = [...new Set(flattenNodes(nodes).flatMap(n => n.contentId ? [n.contentId] : []))]
  return { ...base, nodes, items, entries: items.map(id => available.get(id)!) }
}

/** 导入前的只读预览结果。 */
export interface ImportPlan { token: string; add: number; skip: number; conflicts: string[]; assets: number; knowledge: number; terms: number; restoreSettings: boolean }
