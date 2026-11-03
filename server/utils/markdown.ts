import { renderMarkdown } from '../../shared/markdown'

/** 将公开正文渲染为可直接插入页面的安全 HTML。
 * @param body Markdown 正文。
 * @returns 移除重复一级标题后的 HTML。
 * @throws Markdown 解析失败时抛出异常。
 */
export async function renderContentHtml(body: string): Promise<string> {
  return renderMarkdown(body.replace(/^# .*\n+/, ''))
}
