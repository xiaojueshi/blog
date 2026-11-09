import { afterEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createBlogServer } from '../mcp/server.mjs'

type RecordData = { id: string; title: string; slug: string; summary: string; body: string; kind: string; category: string; categoryId: string | null; tags: string[]; tagIds: string[]; featured: boolean; revision: number; visibility: string; published: null | Record<string, unknown> }
const clients: Client[] = []
afterEach(async () => { await Promise.all(clients.splice(0).map(client => client.close())) })

async function setup() {
  let now = 1000
  const state = { revision: 1, fingerprint: 'one', terms: [{ id: 'cat', kind: 'category', name: '技术' }] }
  const draft: RecordData = { id: 'one', title: '测试文章', slug: 'test', summary: '', body: '编辑稿正文', kind: 'article', category: '技术', categoryId: 'cat', tags: [], tagIds: [], featured: false, revision: 3, visibility: 'private', published: null }
  let changeDuringRead = false
  const writes: { environment: string; path: string; body: any }[] = []
  const request = async (environment: string, path: string, options: { method?: string; body?: any } = {}) => {
    if (options.method === 'POST') {
      writes.push({ environment, path, body: structuredClone(options.body) })
      return { ok: true }
    }
    if (path === '/api/agent/workspace') return structuredClone(state)
    if (path.startsWith('/api/agent/content?id=')) { if (changeDuringRead) { state.revision++; changeDuringRead = false }; return structuredClone(draft) }
    if (path.startsWith('/api/agent/content')) return [structuredClone(draft)]
    if (path.startsWith('/api/agent/history?')) return { ...structuredClone(draft), body: '历史正文', revision: 2, category: '已移除分类', categoryId: 'removed', featured: true }
    throw new Error('未知测试请求')
  }
  const server = createBlogServer({ request, now: () => now })
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  clients.push(client)
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const response = await client.callTool({ name, arguments: args })
    const block = (response.content as { type: string; text: string }[])[0]!
    return { error: Boolean(response.isError), text: block.text, value: response.isError ? null : JSON.parse(block.text) }
  }
  return { call, state, draft, writes, advance: (milliseconds: number) => { now += milliseconds }, changeDuringNextRead: () => { changeDuringRead = true } }
}

describe('博客 MCP 工具', () => {
  it('发布前生成预览，确认后执行一次，并保留目标环境', async () => {
    const { call, writes } = await setup()
    const preview = await call('blog_prepare_content_action', { environment: 'local', id: 'one', action: 'publish' })
    expect(preview.error).toBe(false)
    expect(preview.value.environment).toBe('local')
    expect(preview.value.changes.body.after).toBe('编辑稿正文')
    expect(writes).toHaveLength(0)
    const refused = await call('blog_confirm_action', { planId: preview.value.planId, confirmedByUser: false })
    expect(refused.error).toBe(true)
    expect(writes).toHaveLength(0)
    const confirmed = await call('blog_confirm_action', { planId: preview.value.planId, confirmedByUser: true })
    expect(confirmed.error).toBe(false)
    expect(writes).toEqual([{ environment: 'local', path: '/api/agent/content', body: { id: 'one', action: 'publish', revision: 3, workspaceRevision: 1 } }])
    expect((await call('blog_confirm_action', { planId: preview.value.planId, confirmedByUser: true })).error).toBe(true)
  })

  it('内容变化、分类变化或计划过期时不写入', async () => {
    const { call, draft, state, writes, advance } = await setup()
    expect((await call('blog_search', {})).error).toBe(true)
    const content = await call('blog_prepare_content_action', { environment: 'online', id: 'one', action: 'publish' })
    draft.revision++
    expect((await call('blog_confirm_action', { planId: content.value.planId, confirmedByUser: true })).error).toBe(true)
    const term = await call('blog_prepare_term_action', { environment: 'online', action: 'rename', id: 'cat', name: '新分类' })
    expect(term.value.affected[0].title).toBe('测试文章')
    state.fingerprint = 'two'
    expect((await call('blog_confirm_action', { planId: term.value.planId, confirmedByUser: true })).error).toBe(true)
    const expired = await call('blog_prepare_content_action', { environment: 'online', id: 'one', action: 'publish' })
    advance(10 * 60 * 1000)
    expect((await call('blog_confirm_action', { planId: expired.value.planId, confirmedByUser: true })).error).toBe(true)
    expect(writes).toHaveLength(0)
  })

  it('预览期间分类发生变化时不产生可确认的计划', async () => {
    const { call, writes, changeDuringNextRead } = await setup()
    changeDuringNextRead()
    const preview = await call('blog_prepare_content_action', { environment: 'local', id: 'one', action: 'publish' })
    expect(preview.error).toBe(true)
    expect(preview.text).toContain('预览期间变化')
    expect(writes).toHaveLength(0)
  })

  it('文章没有未发布变更时不生成重复发布计划', async () => {
    const { call, draft, writes } = await setup()
    draft.published = structuredClone(draft)
    draft.visibility = 'public'
    const preview = await call('blog_prepare_content_action', { environment: 'online', id: 'one', action: 'publish' })
    expect(preview.value.alreadyPublished).toBe(true)
    expect(preview.value.planId).toBeUndefined()
    expect(writes).toHaveLength(0)
  })

  it('批量调整预览分别显示编辑稿和公开版本的前后分类', async () => {
    const { call, draft, state } = await setup()
    state.terms.push({ id: 'cat2', kind: 'category', name: '新分类' })
    draft.published = { title: '公开标题', category: '旧分类', tags: ['旧标签'] }
    const preview = await call('blog_prepare_bulk_action', { environment: 'local', action: 'category', targetId: 'cat2', ids: ['one'] })
    expect(preview.value.affected[0].draft.before.category).toBe('技术')
    expect(preview.value.affected[0].draft.after.category).toBe('新分类')
    expect(preview.value.affected[0].published.before.category).toBe('旧分类')
    expect(preview.value.affected[0].published.after.category).toBe('新分类')
  })

  it('恢复预览按当前分类解析历史版本，并保留实际不恢复的字段', async () => {
    const { call } = await setup()
    const preview = await call('blog_prepare_content_action', { environment: 'local', id: 'one', action: 'restore', restoreRevision: 2 })
    expect(preview.value.changes.body).toMatchObject({ before: '编辑稿', after: '历史' })
    expect(preview.value.changes.category.after).toBe('')
    expect(preview.value.changes.featured).toBeUndefined()
  })
})
