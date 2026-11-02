import type { Draft, Collection } from './content'
const records = [
  { id: 'quiet-design', title: '好的界面，是让复杂消失', summary: '关于留白、克制，以及如何在设计中做出更少、但更好的选择。', category: '设计思考', tags: ['设计', '用户体验'], kind: 'article', featured: true, date: '2026-10-22', body: '# 好的界面，是让复杂消失\n\n> 这是一篇用于展示排版与功能的示例内容，并非作者真实发表的文章。\n\n我们习惯通过增加功能解决问题，但有时，最好的答案是少做一点。\n\n## 从阅读开始\n\n界面首先需要照顾内容。舒适的行宽、清晰的层级与恰到好处的留白，让读者把注意力放在文字上。\n\n## 克制也是一种能力\n\n- 让每一个元素都有存在的理由\n- 让交互可以被预期\n- 让技术隐于体验之后\n\n```typescript\nconst principle = { clarity: true, distraction: false }\n```\n\n## 留一点空间\n\n页面不是要填满的画布，而是让想法发生的地方。' },
  { id: 'vue-composables', title: '从一个 composable 开始，重新理解 Vue 的逻辑复用', summary: '不只是把代码搬出组件。聊聊状态的边界、生命周期与恰到好处的抽象。', category: '工程实践', tags: ['Vue', 'TypeScript'], kind: 'article', date: '2026-10-18', body: '# 从一个 composable 开始\n\n> 示例文章，用于验证 Markdown 渲染。\n\n抽象之前，先确认哪些状态应该共享。\n\n```typescript\nexport function useCounter() {\n  const count = ref(0)\n  return { count, increment: () => count.value++ }\n}\n```\n\n## 小而明确的边界\n\n一个 composable 可以只做一件事情。\n\n| 维度 | 需要考虑的问题 |\n| --- | --- |\n| 状态 | 谁拥有它？ |\n| 生命周期 | 何时清理？ |\n\n- [x] 明确状态归属\n- [ ] 添加真实场景的测试' },
  { id: 'edge-notes', title: '把一个小项目放到边缘，需要考虑什么？', summary: '运行时、数据与缓存：比部署成功更重要的，是理解应用在哪里运行。', category: '工程实践', tags: ['Cloudflare', '架构'], kind: 'article', date: '2026-10-12', body: '# 把一个小项目放到边缘\n\n> 示例内容，不代表已完成的部署实践。\n\n## 先理解约束\n\n部署位置改变之后，需要重新检查运行时与数据访问方式。\n\n```mermaid\nflowchart LR\n  Reader[读者] --> Edge[边缘服务]\n  Edge --> Database[数据库]\n```' },
  { id: 'small-steps', title: '不急着成为专家，先保持好奇', summary: '今天也学到了一件小事。把问题写下来，本身就是理解的开始。', category: '日常观察', tags: ['随笔'], kind: 'thought', date: '2026-10-08', body: '# 不急着成为专家，先保持好奇\n\n> 示例随笔。\n\n把一个问题说清楚，比快速给出一个答案更有意思。\n\n每天留下一点记录，回头看时，知识就有了生长的轨迹。' },
  { id: 'markdown-guide', title: 'Markdown：让记录保持简单', summary: '一份持续整理的书写指南，包含代码、公式和结构化笔记。', category: '学习笔记', tags: ['Markdown', '知识管理'], kind: 'note', date: '2026-10-03', body: '# Markdown：让记录保持简单\n\n> 示例笔记，用于展示知识库。\n\n## 公式\n\n$$E = mc^2$$\n\n## 记录清单\n\n- [x] 用纯文本保存想法\n- [x] 给知识一个清晰的目录\n- [ ] 定期回顾\n\n## 脚注\n\n记录是一种思考方式。[^1]\n\n[^1]: 从一个问题开始，不必从一个结论开始。' },
] as const
/** 创建明确标记的公开演示内容。
 * @returns 独立内容记录。
 * @throws 无。
 */
export function createSeed(): Draft[] {
  return records.map(record => {
    const snapshot = { ...record, tags: [...record.tags], featured: 'featured' in record ? record.featured : false, slug: record.id, publishedAt: `${record.date}T08:00:00.000Z` }
    return { ...snapshot, visibility: 'public', revision: 1, createdAt: snapshot.publishedAt, updatedAt: snapshot.publishedAt, published: { ...snapshot } } as Draft
  })
}
/** 默认知识库展示配置。 */
export const collections: Collection[] = [
  { id: 'frontend', title: '前端工程', description: 'Vue、TypeScript 与前端开发笔记。', icon: 'code', items: ['vue-composables', 'quiet-design'] },
  { id: 'building', title: '独立构建', description: '个人项目的开发过程与技术选型。', icon: 'box', items: ['edge-notes'] },
  { id: 'learning', title: '学习与记录', description: '学习方法、工具使用与知识整理。', icon: 'book', items: ['markdown-guide', 'small-steps'] },
]
