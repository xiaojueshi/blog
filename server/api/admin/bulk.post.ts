import type { Draft } from '../../../shared/content'
import { requireAdmin } from '../../utils/auth'
import { atomic, getDraft, saveDraft } from '../../utils/store'
import { workspace, resolveTerms } from '../../utils/workspace'
/** 批量维护内容组织信息，不修改正文或发布状态。
 * @param event 当前请求。
 * @returns 成功更新数量。
 * @throws 无效输入返回 400，任一修订冲突返回 409 并回滚全部更改。
 */
export default defineEventHandler(async event => {
  requireAdmin(event); const input = await readBody(event)
  return atomic(() => {
    if (!Array.isArray(input?.items) || !input.items.length || input.items.length > 200 || new Set(input.items.map((i: { id: string }) => i?.id)).size !== input.items.length || !['category','tag-add','tag-remove'].includes(input.action)) throw createError({ statusCode: 400, statusMessage: '请选择 1–200 项内容及有效操作' })
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
})
