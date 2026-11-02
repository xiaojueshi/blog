import { requireAdmin } from '../../utils/auth'
import { atomic, database } from '../../utils/store'
import { workspace, checkWorkspaceRevision, touchWorkspace } from '../../utils/workspace'
import type { SiteSettings } from '../../../shared/workspace'
/** 校验并保存站点设置。
 * @param event 当前请求。
 * @returns 最新工作台配置。
 * @throws 参数错误返回 400，并发冲突返回 409。
 */
export default defineEventHandler(async event => {
  requireAdmin(event); const input = await readBody(event)
  return atomic(() => {
    checkWorkspaceRevision(Number(input?.revision))
    const s = input?.settings as SiteSettings
    if (!s || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 80 || typeof s.description !== 'string' || s.description.length > 500 || typeof s.seoTitle !== 'string' || !s.seoTitle.trim() || s.seoTitle.length > 150 || typeof s.github !== 'string' || (s.github && !/^https:\/\//.test(s.github)) || s.github.length > 300 || !['light','dark','system'].includes(s.theme) || !Number.isInteger(s.autosaveSeconds) || s.autosaveSeconds < 1 || s.autosaveSeconds > 30 || typeof s.codeWrap !== 'boolean' || typeof s.showReadingTime !== 'boolean') throw createError({ statusCode: 400, statusMessage: '请检查设置：自动保存间隔为 1–30 秒，外部链接须使用 HTTPS' })
    if (!workspace().terms.some(t => t.kind === 'type' && t.id === s.defaultKind && t.enabled)) throw createError({ statusCode: 400, statusMessage: '默认类型必须启用' })
    const settings: SiteSettings = { name: s.name.trim(), description: s.description.trim(), github: s.github.trim(), seoTitle: s.seoTitle.trim(), theme: s.theme, defaultKind: s.defaultKind, autosaveSeconds: s.autosaveSeconds, showReadingTime: s.showReadingTime, codeWrap: s.codeWrap }
    database().prepare('UPDATE config SET value = ? WHERE key = ?').run(JSON.stringify(settings), 'settings'); touchWorkspace(); return workspace()
  })
})
