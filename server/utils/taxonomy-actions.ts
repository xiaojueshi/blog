import { randomUUID } from 'node:crypto'
import { atomic, allDrafts, database, getDraft, saveDraft } from './store'
import { workspace, checkWorkspaceRevision, touchWorkspace, resolveTerms } from './workspace'
import type { Draft } from '../../shared/content'
import type { TaxonomyTerm, WorkspaceState } from '../../shared/workspace'

/** 管理类型、分类与标签，并维护受影响的内容关联。
 * @param input 已通过调用方权限检查的操作参数。
 * @returns 最新工作台配置与受影响的内容数。
 * @throws 参数无效、版本冲突或存储失败时抛出异常。
 */
export function applyTermAction(input: any): { workspace: WorkspaceState; affected: number } {
  return atomic(() => {
    checkWorkspaceRevision(Number(input?.revision)); const state = workspace(); let affected = 0
    const term = state.terms.find(t => t.id === input.id)
    if (input.action === 'create' || input.action === 'rename') {
      const name = String(input.name || '').trim()
      const kind = input.action === 'create' ? input.kind : term?.kind
      if (!name || name.length > 50 || !['type', 'category', 'tag'].includes(kind) || (input.action === 'create' && kind === 'type') || (input.action === 'rename' && !term)) throw createError({ statusCode: 400, statusMessage: '名称为 1–50 个字符，内置类型不支持新增' })
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
}

/** 批量更新内容的分类或标签，并保留事务与修订检查。
 * @param input 已通过调用方权限检查的批量操作参数。
 * @returns 成功更新的内容数。
 * @throws 参数无效、版本冲突或存储失败时回滚并抛出异常。
 */
export function applyBulkAction(input: any): { updated: number } {
  return atomic(() => {
    if (!Array.isArray(input?.items) || !input.items.length || input.items.length > 200 || new Set(input.items.map((i: { id: string }) => i?.id)).size !== input.items.length || !['category', 'tag-add', 'tag-remove'].includes(input.action)) throw createError({ statusCode: 400, statusMessage: '请选择 1–200 项内容及有效操作' })
    const kind = input.action === 'category' ? 'category' : 'tag'
    const term = workspace().terms.find(t => t.kind === kind && t.id === input.targetId)
    if (!term && !(input.action === 'category' && input.targetId === null)) throw createError({ statusCode: 400, statusMessage: '目标分类或标签不存在' })
    const records: Draft[] = input.items.map((item: { id: string; revision: number }) => {
      const draft = typeof item?.id === 'string' ? getDraft(item.id) : null
      if (!draft || draft.revision !== item.revision) throw createError({ statusCode: 409, statusMessage: '选择的内容已变化，请刷新后重新选择；本次未修改任何内容' })
      return draft
    })
    for (const draft of records) {
      for (const version of [draft, draft.published].filter(Boolean)) if (version) {
        if (input.action === 'category') version.categoryId = term?.id || null
        else if (input.action === 'tag-add') version.tagIds = [...new Set([...(version.tagIds || []), term!.id])]
        else version.tagIds = (version.tagIds || []).filter(id => id !== term!.id)
        if ((version.tagIds?.length || 0) > 20) throw createError({ statusCode: 400, statusMessage: '操作会使部分内容超过 20 个标签，已取消整批修改' })
        Object.assign(version, resolveTerms(version))
      }
      saveDraft(draft, draft.revision)
    }
    return { updated: records.length }
  })
}
