import { publicBases } from '../utils/workspace'
/** 获取经过权限过滤的知识库目录。
 * @param event 当前请求。
 * @returns 公开知识库。
 * @throws 数据库失败时返回错误。
 */
export default defineEventHandler(event => { setHeader(event, 'Cache-Control', 'no-store'); return publicBases() })
