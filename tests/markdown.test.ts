import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../shared/markdown'
describe('共用 Markdown 管线', () => {
  it('过滤任意 HTML、脚本与危险链接', async () => { const html = await renderMarkdown('<script>alert(1)</script>\n\n[点击](javascript:alert%281%29)\n\n<img src=x onerror=alert(1)>'); expect(html).not.toContain('<script'); expect(html).not.toContain('javascript:'); expect(html).not.toContain('onerror') })
  it('渲染 GFM 表格、任务列表、脚注和高亮代码', async () => { const html = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] 完成\n\n```typescript\nconst value = 1\n```\n\n文字[^1]\n\n[^1]: 注释'); expect(html).toContain('<table>'); expect(html).toContain('checkbox'); expect(html).toContain('hljs'); expect(html).toContain('footnote') })
  it('渲染公式并为客户端保留 Mermaid 源码', async () => { const html = await renderMarkdown('$$E=mc^2$$\n\n```mermaid\nflowchart LR\n A-->B\n```'); expect(html).toContain('katex'); expect(html).toContain('language-mermaid'); expect(html).toMatch(/A--(?:>|&gt;)B/) })
})
