import { requireAdmin } from '../../utils/auth'
import { workspace } from '../../utils/workspace'
/** 获取管理员工作台配置。
 * @param event 当前请求。
 * @returns 类型、分类、标签、知识库与设置。
 * @throws 未登录时返回 401。
 */
export default defineEventHandler(event => { requireAdmin(event); return workspace() })
