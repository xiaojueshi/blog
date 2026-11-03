const legacyRedirects: Readonly<Record<string, string>> = {
  '/zh': '/',
  '/blog': '/articles',
  '/zh/blog': '/articles',
  '/zh/blog/markdown-style-guide': '/articles/markdown-guide',
}

/** 将旧 Astro 博客路径映射到当前公开路径。
 * @param pathname 请求路径，可包含一个末尾斜杠。
 * @returns 新的站内路径；无需重定向时返回 null。
 * @throws 无。
 */
export function legacyRedirectTarget(pathname: string): string | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return legacyRedirects[normalized] ?? null
}
