import { describe, it, expect, afterAll, vi } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { flattenNodes, validKnowledgeNodes, publicKnowledge } from '../shared/workspace'
import type { KnowledgeBase } from '../shared/workspace'
import { createSeed } from '../shared/seed'
import { initializeWorkspace } from '../server/utils/schema'
import { zipFiles, readZipManifest } from '../server/utils/archive'
const directory = mkdtempSync(join(tmpdir(), 'xjs-workspace-'))
process.env.DATA_DIR = directory
vi.stubGlobal('createError', (data: object) => Object.assign(new Error('操作失败'), data))
const { database, allDrafts, getDraft } = await import('../server/utils/store')
const { exportWorkspace, validateBackup, planImport, importWorkspace } = await import('../server/utils/backup')
const { workspace, touchWorkspace, resolveTerms } = await import('../server/utils/workspace')
afterAll(() => { database().close(); rmSync(directory, { recursive: true, force: true }); vi.unstubAllGlobals() })
const node = (id: string, parentId: string | null, contentId: string | null = null, title = id, position = 0) => ({ id, parentId, contentId, title, position })
describe('知识库结构与权限', () => {
  it('支持有序的多层目录，拒绝循环与内容节点充当父节点', () => {
    const nodes = [node('root',null),node('second','root',null,'第二章',2),node('first','root',null,'第一章',1),node('doc','first','quiet-design')]
    expect(validKnowledgeNodes(nodes)).toBe(true); expect(flattenNodes(nodes).map(n => n.id)).toEqual(['root','first','doc','second'])
    expect(validKnowledgeNodes([node('a','b'),node('b','a')])).toBe(false)
    expect(validKnowledgeNodes([node('a',null,'content'),node('b','a')])).toBe(false)
  })
  it('过滤私人内容及空章节，节点标题只能使用公开快照', () => {
    const publicItem = createSeed()[0]!.published!
    const base: KnowledgeBase = { id: 'base', slug: 'base', title: '知识库', description: '', visibility: 'public', revision: 1, updatedAt: '', nodes: [node('folder',null),node('public','folder',publicItem.id,'私人修改后的标题'),node('secret',null),node('private','secret','unknown-private','秘密笔记')] }
    const result = publicKnowledge(base,[publicItem])!
    expect(result.nodes.map(n => n.id)).toEqual(['folder','public']); expect(JSON.stringify(result)).not.toContain('私人修改'); expect(JSON.stringify(result)).not.toContain('秘密')
    expect(publicKnowledge({ ...base, visibility: 'private' },[publicItem])).toBeNull(); expect(publicKnowledge({ ...base, archived: true },[publicItem])).toBeNull()
  })
})
describe('无损数据迁移', () => {
  it('保留原始正文、账号配置，创建稳定分类和标签，重复运行不改写', () => {
    const db = new DatabaseSync(':memory:'); db.exec('CREATE TABLE content (id TEXT PRIMARY KEY,data TEXT); CREATE TABLE config (key TEXT PRIMARY KEY,value TEXT)')
    const seed = createSeed()[0]!; db.prepare('INSERT INTO content VALUES (?,?)').run(seed.id,JSON.stringify(seed)); db.prepare('INSERT INTO config VALUES (?,?)').run('password','fixture-secret')
    initializeWorkspace(db)
    const migrated = JSON.parse((db.prepare('SELECT data FROM content').get() as { data: string }).data)
    expect(migrated.body).toBe(seed.body); expect(migrated.categoryId).toBeTruthy(); expect(migrated.published.categoryId).toBe(migrated.categoryId)
    expect(JSON.parse((db.prepare('SELECT data FROM content_before_workspace_v2').get() as { data: string }).data)).toEqual(seed)
    expect((db.prepare('SELECT value FROM config WHERE key=?').get('password') as { value: string }).value).toBe('fixture-secret')
    const before = JSON.stringify(db.prepare('SELECT * FROM content').all()); initializeWorkspace(db); expect(JSON.stringify(db.prepare('SELECT * FROM content').all())).toBe(before); db.close()
  })
})
describe('备份与恢复', () => {
  it('显式清空分类关联不会回退到旧名称', () => { const item=createSeed()[0]!;expect(resolveTerms({...item,categoryId:null},[]).category).toBe('') })
  it('导出包括目录、术语与设置，不包含密码和会话', () => { const b = exportWorkspace(); expect(b.version).toBe(2); expect(b.workspace?.bases.length).toBe(3); expect(b.workspace?.terms.some(t => t.kind === 'category')).toBe(true); expect(b).not.toHaveProperty('password'); expect(b).not.toHaveProperty('sessions') })
  it('先预览不写入，执行后保留稳定关联，并跳过重复内容', () => {
    const b = exportWorkspace(); const copy = structuredClone(b.content[0]!); copy.id = 'recovery-new'; copy.slug = 'recovery-new'; copy.published = null; copy.visibility = 'private'; b.content = [copy]; b.history=[]; b.assets=[]; b.workspace!.bases=[]
    const valid = validateBackup(b); const plan = planImport(valid); expect(getDraft(copy.id)).toBeNull(); expect(plan.add).toBe(1)
    expect(importWorkspace(valid,plan.token).imported).toBe(1); expect(getDraft(copy.id)?.categoryId).toBe(copy.categoryId); expect(importWorkspace(valid).skipped).toBe(1)
  })
  it('预览过期时拒绝执行', () => { const b = exportWorkspace(); const plan = planImport(b); touchWorkspace(); expect(() => importWorkspace(b,plan.token)).toThrow() })
  it('设置无效时回滚全部新内容与目录写入', () => {
    const b = exportWorkspace(); const copy = structuredClone(b.content[0]!); copy.id='rollback-new'; copy.slug='rollback-new'; copy.published=null; copy.visibility='private'; b.content=[copy]; b.assets=[]; b.history=[]; b.workspace!.bases=[]; b.workspace!.settings.autosaveSeconds=999
    const before=allDrafts().length; expect(() => importWorkspace(b,undefined,true)).toThrow(); expect(allDrafts().length).toBe(before); expect(getDraft(copy.id)).toBeNull()
  })
  it('恢复旧版 Markdown 数据时建立稳定术语引用', () => { const d = structuredClone(createSeed()[0]!); d.id='legacy-recovery';d.slug='legacy-recovery';d.published=null;delete d.categoryId;delete d.tagIds;const b={format:'xiaojueshi-workspace',version:1,exportedAt:new Date().toISOString(),content:[d],assets:[],history:[]};importWorkspace(validateBackup(b));expect(getDraft(d.id)?.categoryId).toBeTruthy() })
})
describe('标准 ZIP', () => {
  it('UTF-8 路径与恢复清单可往返读取', () => { const manifest=JSON.stringify(exportWorkspace());const zip=zipFiles([{name:'backup.json',data:Buffer.from(manifest)},{name:'content/笔记.md',data:Buffer.from('# 笔记')}]);expect(readZipManifest(zip)).toBe(manifest) })
  it('损坏数据与危险路径被拒绝', () => { const zip=zipFiles([{name:'backup.json',data:Buffer.from('{"ok":true}')}]);zip[45]=zip[45]!^0xff;expect(()=>readZipManifest(zip)).toThrow();expect(()=>zipFiles([{name:'../backup.json',data:Buffer.from('{}')}])).toThrow();const traversal=zipFiles([{name:'xx/backup.json',data:Buffer.from('{}')}]);let index=traversal.indexOf('xx/backup.json');while(index>=0){traversal.write('../',index);index=traversal.indexOf('xx/backup.json',index+3)}expect(()=>readZipManifest(traversal)).toThrow() })
})
