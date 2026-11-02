import type { WorkspaceDatabase } from './storage-types'
import { randomUUID } from 'node:crypto'
import type { Draft } from '../../shared/content'
import { collections } from '../../shared/seed'
import type { KnowledgeBase, SiteSettings, TaxonomyTerm } from '../../shared/workspace'

/** 添加工作台组织结构并迁移旧内容；仅执行一次，不删除旧内容。
 * @param db 已打开且已创建内容表的数据库。
 * @returns 无。
 * @throws 迁移失败时回滚并抛出异常。
 */
export function initializeWorkspace(db: Omit<WorkspaceDatabase, 'transaction'> & Partial<Pick<WorkspaceDatabase, 'transaction'>>): void {
  db.exec('CREATE TABLE IF NOT EXISTS taxonomy (id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS knowledge (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, data TEXT NOT NULL);')
  if (db.prepare('SELECT value FROM config WHERE key = ?').get('workspace-version')) return
  const migrate = () => {
    // 保留迁移前原始 JSON，使转换本身也可以追溯和恢复。
    db.exec('CREATE TABLE IF NOT EXISTS content_before_workspace_v2 (id TEXT PRIMARY KEY, data TEXT NOT NULL); INSERT OR IGNORE INTO content_before_workspace_v2 SELECT * FROM content;')
    const terms: TaxonomyTerm[] = [
      { id: 'article', kind: 'type', name: '文章', position: 0, enabled: true },
      { id: 'thought', kind: 'type', name: '随笔', position: 1, enabled: true },
      { id: 'note', kind: 'type', name: '笔记', position: 2, enabled: true },
    ]
    const termId = (kind: 'category' | 'tag', name: string) => {
      const clean = name.trim(); if (!clean) return null
      let term = terms.find(t => t.kind === kind && t.name.toLocaleLowerCase() === clean.toLocaleLowerCase())
      if (!term) { term = { id: randomUUID(), kind, name: clean, position: terms.filter(t => t.kind === kind).length, enabled: true }; terms.push(term) }
      return term.id
    }
    for (const row of db.prepare('SELECT id, data FROM content').all() as { id: string; data: string }[]) {
      const draft = JSON.parse(row.data) as Draft
      for (const item of [draft, draft.published].filter(Boolean) as Draft[]) {
        item.categoryId = termId('category', item.category || '')
        item.tagIds = [...new Set((item.tags || []).flatMap(tag => { const id = termId('tag', tag); return id ? [id] : [] }))]
      }
      db.prepare('UPDATE content SET data = ? WHERE id = ?').run(JSON.stringify(draft), draft.id)
    }
    for (const term of terms) db.prepare('INSERT INTO taxonomy VALUES (?, ?, ?)').run(term.id, term.kind, JSON.stringify(term))
    for (const collection of collections) {
      const chapterId = randomUUID()
      const base: KnowledgeBase = { id: collection.id, slug: collection.id, title: collection.title, description: collection.description, visibility: 'public', revision: 1, updatedAt: new Date().toISOString(), nodes: [{ id: chapterId, parentId: null, title: '开始阅读', contentId: null, position: 0 }, ...collection.items.map((id, i) => ({ id: randomUUID(), parentId: chapterId, title: (db.prepare('SELECT data FROM content WHERE id = ?').get(id) as { data: string } | undefined)?.data ? (JSON.parse((db.prepare('SELECT data FROM content WHERE id = ?').get(id) as { data: string }).data) as Draft).title : id, contentId: id, position: i }))] }
      db.prepare('INSERT INTO knowledge VALUES (?, ?)').run(base.id, JSON.stringify(base))
    }
    const settings: SiteSettings = { name: 'XIAOJUESHI', description: '分享技术实践、学习笔记与日常。', github: 'https://github.com/xiaojueshi', seoTitle: 'XIAOJUESHI — 永远相信美好的事情即将发生', theme: 'system', defaultKind: 'note', autosaveSeconds: 1, showReadingTime: true, codeWrap: false }
    db.prepare('INSERT OR REPLACE INTO config VALUES (?, ?)').run('settings', JSON.stringify(settings))
    db.prepare('INSERT OR REPLACE INTO config VALUES (?, ?)').run('workspace-revision', '1')
    db.prepare('INSERT INTO config VALUES (?, ?)').run('workspace-version', '2')
  }
  if (db.transaction) db.transaction(migrate)
  else {
    db.exec('BEGIN IMMEDIATE')
    try { migrate(); db.exec('COMMIT') } catch (error) { db.exec('ROLLBACK'); throw error }
  }
}
