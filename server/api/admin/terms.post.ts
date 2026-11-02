import { randomUUID } from 'node:crypto'
import { requireAdmin } from '../../utils/auth'
import { atomic, allDrafts, database, saveDraft } from '../../utils/store'
import { workspace, checkWorkspaceRevision, touchWorkspace, resolveTerms } from '../../utils/workspace'
import type { TaxonomyTerm } from '../../../shared/workspace'
/** 管理术语，合并或移除时同步维护内容引用。
 * @param event 当前请求。
 * @returns 最新配置和受影响内容数。
 * @throws 无效操作返回 400，过期修订返回 409。
 */
export default defineEventHandler(async event => {
  requireAdmin(event); const input = await readBody(event)
  return atomic(() => {
    checkWorkspaceRevision(Number(input?.revision)); const state = workspace(); let affected = 0
    const term = state.terms.find(t => t.id === input.id)
    if (input.action === 'create' || input.action === 'rename') {
      const name = String(input.name || '').trim()
      const kind = input.action === 'create' ? input.kind : term?.kind
      if (!name || name.length > 50 || !['type','category','tag'].includes(kind) || (input.action === 'create' && kind === 'type') || (input.action === 'rename' && !term)) throw createError({ statusCode: 400, statusMessage: '名称为 1–50 个字符，内置类型不支持新增' })
      if (state.terms.some(t => t.kind === kind && t.id !== term?.id && t.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw createError({ statusCode: 409, statusMessage: '同名记录已存在' })
      const result: TaxonomyTerm = term ? { ...term, name } : { id: randomUUID(), kind, name, enabled: true, position: state.terms.filter(t => t.kind === kind).length }
      database().prepare('INSERT OR REPLACE INTO taxonomy VALUES (?, ?, ?)').run(result.id, result.kind, JSON.stringify(result))
    } else if (input.action === 'move' && term) {
      const peers = state.terms.filter(t => t.kind === term.kind); const index = peers.findIndex(t => t.id === term.id); const next = index + (input.direction === 'up' ? -1 : 1)
      if (next >= 0 && next < peers.length) { [peers[index], peers[next]] = [peers[next]!, peers[index]!]; peers.forEach((t, position) => { t.position = position; database().prepare('UPDATE taxonomy SET data = ? WHERE id = ?').run(JSON.stringify(t), t.id) }) }
    } else if (input.action === 'toggle' && term?.kind === 'type') {
      if (state.settings.defaultKind === term.id && term.enabled) throw createError({ statusCode: 400, statusMessage: '请先选择其他默认类型，再停用此类型' })
      term.enabled = !term.enabled; database().prepare('UPDATE taxonomy SET data = ? WHERE id = ?').run(JSON.stringify(term), term.id)
    } else if ((input.action === 'remove' || input.action === 'merge') && term && term.kind !== 'type') {
      const target = input.targetId ? state.terms.find(t => t.id === input.targetId && t.kind === term.kind && t.id !== term.id) : null
      if ((input.targetId && !target) || (input.action === 'merge' && !target)) throw createError({ statusCode: 400, statusMessage: '请选择有效的迁移目标' })
      for (const draft of allDrafts()) {
        let changed = false
        for (const version of [draft, draft.published].filter(Boolean)) {
          if (!version) continue
          if (term.kind === 'category' && version.categoryId === term.id) { version.categoryId = target?.id || null; version.category = target?.name || ''; changed = true }
          if (term.kind === 'tag' && version.tagIds?.includes(term.id)) { version.tagIds = [...new Set(version.tagIds.flatMap(id => id === term.id ? target ? [target.id] : [] : [id]))]; version.tags = resolveTerms(version, state.terms).tags; changed = true }
        }
        if (changed) { saveDraft(draft, draft.revision); affected++ }
      }
      database().prepare('DELETE FROM taxonomy WHERE id = ?').run(term.id)
    } else throw createError({ statusCode: 400, statusMessage: '操作无效' })
    touchWorkspace(); return { workspace: workspace(), affected }
  })
})
