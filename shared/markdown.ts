import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkRehype)
  .use(rehypeSanitize).use(rehypeKatex, { strict: false, trust: false }).use(rehypeHighlight, { detect: false, ignoreMissing: true }).use(rehypeStringify)
/** 将 Markdown 转为安全 HTML；编辑预览与公开阅读共用此入口。
 * @param source Markdown 正文。
 * @returns 安全渲染的 HTML。
 * @throws 解析插件遇到不可恢复错误时抛出异常。
 */
export async function renderMarkdown(source: string): Promise<string> {
  return String(await processor.process(source))
}
