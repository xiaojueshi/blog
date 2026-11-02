import { createHash, randomUUID } from 'node:crypto'
import type { Draft } from '../../shared/content'
import type { KnowledgeBase, SiteSettings, TaxonomyTerm, WorkspaceState, ImportPlan } from '../../shared/workspace'
import { validKnowledgeNodes } from '../../shared/workspace'
import { allDrafts, database, atomic } from './store'
import { workspace, touchWorkspace, contentReferences } from './workspace'
/** 完整可迁移备份格式；版本一仍支持读取。 */
export interface WorkspaceBackup { format: 'xiaojueshi-workspace'; version: 1 | 2; exportedAt: string; content: Draft[]; history: { id: string; revision: number; data: string }[]; assets: { id: string; data: string; mime: string; content_id: string }[]; workspace?: WorkspaceState }
/** 导出所有可迁移数据，不导出密码与会话。
 * @returns 完整备份。
 * @throws 数据库失败时抛出异常。
 */
export function exportWorkspace(): WorkspaceBackup {
  return { format: 'xiaojueshi-workspace', version: 2, exportedAt: new Date().toISOString(), content: allDrafts(), history: database().prepare('SELECT * FROM history').all() as WorkspaceBackup['history'], assets: database().prepare('SELECT * FROM assets').all() as WorkspaceBackup['assets'], workspace: workspace() }
}
/** 校验恢复清单与关联结构，避免半写入。
 * @param value 未信任的备份内容。
 * @returns 校验后的备份。
 * @throws 格式损坏时返回 400。
 */
export function validateBackup(value: unknown): WorkspaceBackup {
  const b = value as WorkspaceBackup
  const invalid = () => { throw createError({ statusCode: 400, statusMessage: '备份格式或内容关联无效' }) }
  if (!b || b.format !== 'xiaojueshi-workspace' || ![1,2].includes(b.version) || !Array.isArray(b.content) || b.content.length > 10000 || new Set(b.content.map(d => d?.id)).size !== b.content.length) invalid()
  for (const d of b.content) {
    for (const item of [d, d?.published].filter(Boolean)) {
      if (!item || typeof item.id !== 'string' || !/^[\w-]{1,128}$/.test(item.id) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200 || typeof item.body !== 'string' || item.body.length > 500000 || !['article','thought','note'].includes(item.kind) || typeof item.slug !== 'string' || !/^[\w\u4e00-\u9fff-]{1,120}$/.test(item.slug) || typeof item.summary !== 'string' || typeof item.category !== 'string' || !Array.isArray(item.tags) || item.tags.some(t => typeof t !== 'string') || (item.tagIds && (!Array.isArray(item.tagIds) || item.tagIds.some(id => typeof id !== 'string')))) invalid()
    }
    if (!d || !Number.isInteger(d.revision) || d.revision < 1 || !['private','public'].includes(d.visibility) || typeof d.createdAt !== 'string' || typeof d.updatedAt !== 'string' || (d.published && (d.published.id !== d.id || !Number.isFinite(Date.parse(d.published.publishedAt))))) invalid()
  }
  if (b.workspace) {
    const w = b.workspace
    if (!Array.isArray(w.terms) || !Array.isArray(w.bases) || w.terms.length > 10000 || w.bases.length > 1000 || new Set(w.terms.map(t => t.id)).size !== w.terms.length || new Set(w.bases.map(k => k.id)).size !== w.bases.length) invalid()
    for (const t of w.terms) if (!t || typeof t.id !== 'string' || !t.id || !['type','category','tag'].includes(t.kind) || typeof t.name !== 'string' || !t.name.trim() || t.name.length > 50 || !Number.isFinite(t.position) || typeof t.enabled !== 'boolean' || (t.kind === 'type' && !['article','thought','note'].includes(t.id))) invalid()
    const ids = new Set([...b.content.map(d => d.id), ...allDrafts().map(d => d.id)])
    for (const k of w.bases) if (!k || typeof k.id !== 'string' || !k.id || typeof k.title !== 'string' || !k.title.trim() || typeof k.slug !== 'string' || !/^[\w\u4e00-\u9fff-]{1,120}$/.test(k.slug) || typeof k.description !== 'string' || !['private','public'].includes(k.visibility) || !Number.isInteger(k.revision) || !Array.isArray(k.nodes) || k.nodes.some(n => !n || typeof n.title !== 'string' || typeof n.id !== 'string' || (n.parentId !== null && typeof n.parentId !== 'string') || (n.contentId !== null && !ids.has(n.contentId))) || !validKnowledgeNodes(k.nodes)) invalid()
    for (const d of b.content) for (const v of [d, d.published].filter(Boolean)) if (v && ((v.categoryId && !w.terms.some(t => t.kind === 'category' && t.id === v.categoryId)) || v.tagIds?.some(id => !w.terms.some(t => t.kind === 'tag' && t.id === id)))) invalid()
  }
  b.assets ||= []; b.history ||= []
  if (!Array.isArray(b.assets) || !Array.isArray(b.history) || b.assets.length > 20000 || b.history.length > 100000) invalid()
  const contentIds = new Set([...b.content.map(d => d.id), ...allDrafts().map(d => d.id)])
  for (const a of b.assets) if (!a || typeof a.id !== 'string' || !/^[\w-]{1,128}$/.test(a.id) || typeof a.data !== 'string' || a.data.length > 7 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(a.data) || !['image/png','image/jpeg','image/gif','image/webp'].includes(a.mime) || !contentIds.has(a.content_id)) invalid()
  for (const h of b.history) {
    if (!h || !contentIds.has(h.id) || !Number.isInteger(h.revision) || typeof h.data !== 'string') invalid()
    try { const record = JSON.parse(h.data) as Draft; if (record.id !== h.id || typeof record.body !== 'string') invalid() } catch { invalid() }
  }
  return b
}
/** 计算仅新增导入的预览与确认令牌，内容变化后旧令牌失效。
 * @param backup 已校验备份。
 * @param restoreSettings 是否同时恢复站点设置。
 * @returns 新增、跳过与冲突摘要。
 * @throws 数据库失败时抛出异常。
 */
export function planImport(backup: WorkspaceBackup, restoreSettings = false): ImportPlan {
  const current = allDrafts(); const state = workspace(); const conflicts: string[] = []
  let add = 0; let skip = 0
  const occupied = new Set(current.flatMap(d => [d.slug, d.published?.slug].filter(Boolean)))
  for (const item of backup.content) {
    if (current.some(d => d.id === item.id)) skip++
    else if (occupied.has(item.slug) || (item.published && occupied.has(item.published.slug))) { skip++; conflicts.push(item.title) }
    else { add++; occupied.add(item.slug); if (item.published) occupied.add(item.published.slug) }
  }
  const fingerprint = JSON.stringify([backup, restoreSettings, state.revision, current.map(d => [d.id, d.revision])])
  return { token: createHash('sha256').update(fingerprint).digest('hex'), add, skip, conflicts, assets: backup.assets.filter(a => !database().prepare('SELECT id FROM assets WHERE id = ?').get(a.id)).length, knowledge: (backup.workspace?.bases || []).filter(k => !state.bases.some(b => b.id === k.id || b.slug === k.slug)).length, terms: (backup.workspace?.terms || []).filter(t => !state.terms.some(x => x.id === t.id || (x.kind === t.kind && x.name.toLocaleLowerCase() === t.name.toLocaleLowerCase()))).length, restoreSettings }
}
/** 记录可查看的数据操作结果。
 * @param action 操作名称。
 * @param detail 结果摘要。
 * @param success 是否成功。
 * @returns 无。
 * @throws 数据库失败时抛出异常。
 */
export function recordOperation(action: string, detail: string, success = true): void {
  database().prepare('INSERT INTO operations VALUES (?, ?)').run(randomUUID(), JSON.stringify({ action, detail, success, at: new Date().toISOString() }))
}
/** 按预览执行原子导入，不覆盖已存在内容或机密配置。
 * @param backup 已校验备份。
 * @param token 最新预览令牌，旧接口兼容时可省略。
 * @param restoreSettings 是否明确选择恢复站点设置。
 * @returns 新增和跳过数量。
 * @throws 预览过期返回 409，其他失败回滚。
 */
export function importWorkspace(backup: WorkspaceBackup, token?: string, restoreSettings = false) {
  return atomic(() => {
    const plan = planImport(backup, restoreSettings)
    if (token && token !== plan.token) throw createError({ statusCode: 409, statusMessage: '预览后数据发生变化，请重新预览' })
    const state = workspace(); const termMap = new Map<string, string>()
    for (const t of backup.workspace?.terms || []) {
      const sameId = state.terms.find(x => x.id === t.id)
      if (sameId && sameId.kind !== t.kind) throw createError({ statusCode: 400, statusMessage: '术语身份冲突，已取消导入' })
      const existing = sameId || state.terms.find(x => x.kind === t.kind && x.name.toLocaleLowerCase() === t.name.toLocaleLowerCase())
      termMap.set(t.id, existing?.id || t.id)
      if (!existing) { database().prepare('INSERT INTO taxonomy VALUES (?, ?, ?)').run(t.id, t.kind, JSON.stringify(t)); state.terms.push(t) }
    }
    const current = allDrafts(); let imported = 0; const newlyAdded = new Set<string>()
    for (const raw of backup.content) {
      if (current.some(d => d.id === raw.id || d.slug === raw.slug || d.published?.slug === raw.slug || (raw.published && (d.slug === raw.published.slug || d.published?.slug === raw.published.slug)))) continue
      const d = structuredClone(raw)
      for (const v of [d, d.published].filter(Boolean)) if (v) {
        if (backup.workspace) { v.categoryId = v.categoryId ? termMap.get(v.categoryId) || null : null; v.tagIds = (v.tagIds || []).flatMap(id => termMap.has(id) ? [termMap.get(id)!] : []) }
        else Object.assign(v, contentReferences(undefined, undefined, v.category, v.tags))
      }
      database().prepare('INSERT INTO content VALUES (?, ?)').run(d.id, JSON.stringify(d)); current.push(d); newlyAdded.add(d.id); imported++
    }
    // 现有内容的附件和历史不由恢复包修改，避免跳过正文却替换其关联数据。
    for (const a of backup.assets) if (newlyAdded.has(a.content_id)) database().prepare('INSERT OR IGNORE INTO assets VALUES (?, ?, ?, ?)').run(a.id, a.data, a.mime, a.content_id)
    for (const h of backup.history) if (newlyAdded.has(h.id)) { const record = JSON.parse(h.data) as Draft; for (const v of [record, record.published].filter(Boolean)) if (v) { v.categoryId = v.categoryId ? termMap.get(v.categoryId) || null : null; v.tagIds = (v.tagIds || []).flatMap(id => termMap.has(id) ? [termMap.get(id)!] : []) }; database().prepare('INSERT OR IGNORE INTO history VALUES (?, ?, ?)').run(h.id, h.revision, JSON.stringify(record)) }
    for (const base of backup.workspace?.bases || []) if (!state.bases.some(b => b.id === base.id || b.slug === base.slug)) {
      const result: KnowledgeBase = { ...base, nodes: base.nodes.filter(n => !n.contentId || current.some(d => d.id === n.contentId)) }
      database().prepare('INSERT INTO knowledge VALUES (?, ?)').run(result.id, JSON.stringify(result)); state.bases.push(result)
    }
    if (restoreSettings && backup.workspace?.settings) {
      const s = backup.workspace.settings as SiteSettings
      if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 80 || typeof s.description !== 'string' || typeof s.seoTitle !== 'string' || !s.seoTitle.trim() || typeof s.github !== 'string' || (s.github && !s.github.startsWith('https://')) || !['light','dark','system'].includes(s.theme) || !state.terms.some(t => t.id === s.defaultKind && t.kind === 'type' && t.enabled) || !Number.isInteger(s.autosaveSeconds) || s.autosaveSeconds < 1 || s.autosaveSeconds > 30 || typeof s.codeWrap !== 'boolean' || typeof s.showReadingTime !== 'boolean') throw createError({ statusCode: 400, statusMessage: '备份设置无效，已取消整个导入' })
      database().prepare('UPDATE config SET value = ? WHERE key = ?').run(JSON.stringify(s), 'settings')
    }
    touchWorkspace(); recordOperation('导入恢复', `新增 ${imported} 项，跳过 ${backup.content.length - imported} 项；知识库 ${plan.knowledge} 个`)
    return { imported, skipped: backup.content.length - imported, knowledge: plan.knowledge }
  })
}
