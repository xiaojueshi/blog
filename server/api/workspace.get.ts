import { workspace, publishedContent } from '../utils/workspace'
/** 获取不包含私人内容的站点展示配置。
 * @param event 当前请求。
 * @returns 公开设置与术语。
 * @throws 数据库失败时返回错误。
 */
export default defineEventHandler(event => { setHeader(event, 'Cache-Control', 'no-store'); const state = workspace(); const visible = new Set(publishedContent().flatMap(d => [d.categoryId, ...(d.tagIds || [])])); return { settings: state.settings, terms: state.terms.filter(t => t.kind === 'type' || visible.has(t.id)) } })
