import { database, getDraft } from '../../utils/store'
import { isAdmin } from '../../utils/auth'
/** 处理当前路由请求并执行相应的权限与数据规则。
 * @param event 当前 H3 请求事件。
 * @returns 当前接口的响应数据。
 * @throws 参数无效、权限不足或存储失败时返回相应错误。
 */
export default defineEventHandler(event => {
  const id = getRouterParam(event, 'id') || ''
  const asset = database().prepare('SELECT * FROM assets WHERE id = ?').get(id) as { data: string; mime: string; content_id: string } | undefined
  const draft = asset && getDraft(asset.content_id)
  // 即使所属内容已公开，新编辑稿中的附件也不能提前泄露。
  if (!asset || !draft || (!isAdmin(event) && !(draft.visibility === 'public' && draft.published?.body.includes(`/api/assets/${id}`)))) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', asset.mime)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return Buffer.from(asset.data, 'base64')
})
