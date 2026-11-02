import type { WorkspaceState, SiteSettings, TaxonomyTerm } from '#shared/workspace'
/** 读取公开站点配置并复用 SSR 数据。
 * @returns 站点配置请求状态。
 * @throws Nuxt 请求失败时由 error 状态提供错误。
 */
export function useSiteWorkspace() {
  return useFetch<{ settings: SiteSettings; terms: TaxonomyTerm[] }>('/api/workspace', { key: 'site-workspace' })
}
/** 在 SSR 与客户端共享管理员会话状态。
 * @returns 会话和刷新方法。
 * @throws 请求失败时由 error 状态提供错误。
 */
export function useAdminSession() {
  return useFetch<{ authenticated: boolean; configured: boolean }>('/api/auth', { key: 'admin-session' })
}
/** 通过鉴权接口读取后台数据，SSR 自动转发当前会话。
 * @param url 管理接口地址。
 * @param initial 未登录或请求失败时的空值。
 * @returns 数据、错误与刷新方法；登录后统一刷新即可加载。
 * @throws 请求错误保留在 error 状态，不抛出到登录页面。
 */
export function useAdminData<T>(url: string, initial: T) {
  const request = useRequestFetch()
  return useAsyncData<T>(url, () => request<T, string>(url), { default: () => initial })
}
/** 读取完整后台组织配置。
 * @returns 可响应登录变化的工作台配置。
 * @throws 请求失败时由 error 状态提供错误。
 */
export function useAdminWorkspace() { return useAdminData<WorkspaceState | null>('/api/admin/workspace', null) }
