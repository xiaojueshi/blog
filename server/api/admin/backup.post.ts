import { requireAdmin } from '../../utils/auth'
import { importWorkspace, validateBackup } from '../../utils/backup'
/** 兼容既有客户端的仅新增 JSON 恢复接口。
 * @param event 当前请求。
 * @returns 新增与跳过数量。
 * @throws 校验或写入失败时回滚。
 */
export default defineEventHandler(async event => { requireAdmin(event); return importWorkspace(validateBackup(await readBody(event))) })
