import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// 仅为 Node 原生测试补齐 TypeScript 相对模块后缀；生产模块仍由 Nuxt 编译。
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/.test(specifier)) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL)
    if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context)
  }
  return next(specifier, context)
} })
const directory = mkdtempSync(join(tmpdir(), 'xiaojueshi-native-'))
process.env.DATA_DIR = directory
globalThis.createError = data => Object.assign(new Error(data.statusMessage), data)
const { allDrafts, saveDraft, getDraft, database } = await import('../server/utils/store.ts')
const { publicSnapshot } = await import('../shared/content.ts')
const { hashPassword, verifyPassword } = await import('../server/utils/auth.ts')
after(() => { database().close(); rmSync(directory, { recursive: true, force: true }); hooks.deregister() })
test('SQLite 初始化并持久化内容', () => { assert.equal(allDrafts().length, 5); const item = allDrafts()[0]; assert.equal(getDraft(item.id).title, item.title) })
test('保存编辑稿保留公开快照与历史', () => { const item = allDrafts()[0]; const published = publicSnapshot(item); const updated = saveDraft({ ...item, body: '秘密修改' }, item.revision); assert.equal(updated.revision, item.revision + 1); assert.deepEqual(publicSnapshot(updated), published); assert.equal(database().prepare('SELECT count(*) AS n FROM history WHERE id = ?').get(item.id).n, 1) })
test('并发冲突回滚，当前内容不受影响', () => { const item = allDrafts()[0]; assert.throws(() => saveDraft({ ...item, title: '应当被拒绝' }, item.revision - 1), { statusCode: 409 }); assert.equal(getDraft(item.id).title, item.title) })
test('撤回后不存在公共快照', () => { const item = allDrafts()[0]; const result = saveDraft({ ...item, visibility: 'private', published: null }, item.revision); assert.equal(publicSnapshot(result), null) })
test('密码摘要使用独立盐且拒绝错误密码', () => { const one = hashPassword('a-test-password-2026'); const two = hashPassword('a-test-password-2026'); assert.notEqual(one, two); assert.equal(verifyPassword('a-test-password-2026', one), true); assert.equal(verifyPassword('wrong', one), false) })
