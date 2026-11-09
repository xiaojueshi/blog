import { afterAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const directory = mkdtempSync(join(tmpdir(), 'xiaojueshi-agent-test-'))
process.env.DATA_DIR = directory
vi.stubGlobal('createError', (data: { statusCode: number; statusMessage: string }) => Object.assign(new Error(data.statusMessage), data))
vi.stubGlobal('getHeader', (event: { headers: Record<string, string> }, name: string) => event.headers[name])
vi.stubGlobal('setHeader', () => {})
const { database, getDraft } = await import('../server/utils/store')
const { createAgentCredential, listAgentCredentials, requireAgent, revokeAgentCredential } = await import('../server/utils/agent-auth')
const { agentContent, agentContentFingerprint, agentWorkspace, applyAgentContentAction, applyAgentTermAction } = await import('../server/utils/agent-content')
const { exportWorkspace } = await import('../server/utils/backup')

function event(token: string) { return { headers: { authorization: 'Bearer ' + token } } as any }

afterAll(() => {
  database().close()
  rmSync(directory, { recursive: true, force: true })
  vi.unstubAllGlobals()
})

describe('Agent 专用凭据', () => {
  it('只保存摘要，限定权限，不出现在备份中', () => {
    const { credential, token } = createAgentCredential('测试设备', ['content:read'])
    expect(token).toMatch(/^xjs_[A-Za-z0-9_-]{43}$/)
    expect(credential.expiresAt - credential.createdAt).toBe(90 * 24 * 60 * 60 * 1000)
    expect(requireAgent(event(token), 'content:read').id).toBe(credential.id)
    expect(() => requireAgent(event(token), 'content:write')).toThrowError(expect.objectContaining({ statusCode: 403 }))
    expect(JSON.stringify(listAgentCredentials())).not.toContain(token)
    expect(JSON.stringify(exportWorkspace())).not.toContain(token)
    expect(JSON.stringify(database().prepare('SELECT * FROM agent_credentials WHERE id = ?').get(credential.id))).not.toContain(token)
  })

  it('拒绝错误、过期和已撤销凭据，并在撤销后立即失效', () => {
    const { credential, token } = createAgentCredential('待撤销', ['content:read', 'content:write'])
    expect(() => requireAgent(event(token + 'x'), 'content:read')).toThrowError(expect.objectContaining({ statusCode: 401 }))
    revokeAgentCredential(credential.id)
    expect(() => requireAgent(event(token), 'content:read')).toThrowError(expect.objectContaining({ statusCode: 401 }))
    const expired = createAgentCredential('已过期', ['content:read'])
    database().prepare('UPDATE agent_credentials SET expires_at = ? WHERE id = ?').run(Date.now() - 1, expired.credential.id)
    expect(() => requireAgent(event(expired.token), 'content:read')).toThrowError(expect.objectContaining({ statusCode: 401 }))
  })
})

describe('Agent 内容与分类边界', () => {
  it('保存默认私密，发布只能使用当前编辑稿，过期修订不能覆盖', () => {
    const draft = applyAgentContentAction({ revision: 0, title: 'Agent 文章', body: '原始正文', categoryId: null, tagIds: [], knowledgeBaseId: 'unknown' })
    expect(draft.visibility).toBe('private')
    expect(draft.published).toBeNull()
    const published = applyAgentContentAction({ id: draft.id, revision: draft.revision, workspaceRevision: agentWorkspace().revision, action: 'publish', title: '越权标题', body: '越权正文' })
    expect(published.published?.title).toBe('Agent 文章')
    expect(published.published?.body).toBe('原始正文')
    expect(() => applyAgentContentAction({ id: draft.id, revision: draft.revision, action: 'save', body: '过期修改' })).toThrowError(expect.objectContaining({ statusCode: 409 }))
    expect(getDraft(draft.id)?.body).toBe('原始正文')
  })

  it('保存时不会按名称隐式新建分类，分类操作拒绝过期预览', () => {
    const before = agentWorkspace()
    applyAgentContentAction({ revision: 0, title: '不自动创建分类', body: '正文', category: '不应创建', tags: ['不应创建'] })
    expect(agentWorkspace().terms).toEqual(before.terms)
    const state = agentWorkspace()
    const created = applyAgentTermAction({ action: 'create', kind: 'category', name: '已有分类', revision: state.revision })
    const category = created.workspace.terms.find(term => term.name === '已有分类')!
    const fingerprint = agentContentFingerprint()
    applyAgentContentAction({ revision: 0, title: '预览后的新文章', body: '正文' })
    expect(() => applyAgentTermAction({ action: 'rename', id: category.id, name: '不应改名', revision: created.workspace.revision, fingerprint })).toThrowError(expect.objectContaining({ statusCode: 409 }))
    expect(agentWorkspace().terms.find(term => term.id === category.id)?.name).toBe('已有分类')
  })

  it('发布预览后分类发生变化时拒绝发布', () => {
    const draft = applyAgentContentAction({ revision: 0, title: '分类变化前的预览', body: '正文' })
    const state = agentWorkspace()
    applyAgentTermAction({ action: 'create', kind: 'tag', name: '预览后新增标签', revision: state.revision })
    expect(() => applyAgentContentAction({ id: draft.id, revision: draft.revision, workspaceRevision: state.revision, action: 'publish' })).toThrowError(expect.objectContaining({ statusCode: 409 }))
    expect(getDraft(draft.id)?.published).toBeNull()
  })

  it('编辑稿改名后仍能按公开版本的标题和正文检索', () => {
    const draft = applyAgentContentAction({ revision: 0, title: '公开的旧标题', body: '公开的独特正文' })
    const published = applyAgentContentAction({ id: draft.id, revision: draft.revision, workspaceRevision: agentWorkspace().revision, action: 'publish' })
    applyAgentContentAction({ id: draft.id, revision: published.revision, title: '私密的新标题', body: '未发布的新正文' })
    expect((agentContent(undefined, '公开的旧标题') as { id: string }[]).some(item => item.id === draft.id)).toBe(true)
    expect((agentContent(undefined, '公开的独特正文') as { id: string }[]).some(item => item.id === draft.id)).toBe(true)
  })
})
