import { describe, it, expect, afterAll, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publicSnapshot } from '../shared/content'
const directory = mkdtempSync(join(tmpdir(), 'xiaojueshi-test-'))
process.env.DATA_DIR = directory
vi.stubGlobal('createError', (data: unknown) => Object.assign(new Error('存储错误'), data))
const { allDrafts, getDraft, saveDraft, database } = await import('../server/utils/store')
afterAll(() => { database().close(); rmSync(directory, { recursive: true, force: true }); vi.unstubAllGlobals() })
describe('SQLite 持久化与版本', () => {
  it('初始内容明确为示例，跨读取保持一致', () => { const d = allDrafts()[0]!; expect(d.body).toMatch(/示例/); expect(getDraft(d.id)?.id).toBe(d.id) })
  it('保存未发布修改不影响读者版本，并留下历史', () => { const d = allDrafts()[0]!; const old = publicSnapshot(d); const saved = saveDraft({ ...d, body: '私人修改' }, d.revision); expect(saved.revision).toBe(d.revision + 1); expect(publicSnapshot(saved)).toEqual(old); expect(database().prepare('SELECT * FROM history WHERE id = ?').all(d.id).length).toBeGreaterThan(0) })
  it('拒绝过期修订号，失败不覆盖当前内容', () => { const d = allDrafts()[0]!; expect(() => saveDraft({ ...d, title: '不应写入' }, d.revision - 1)).toThrow(); expect(getDraft(d.id)?.title).toBe(d.title) })
})
