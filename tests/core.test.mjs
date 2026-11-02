import test from 'node:test'
import assert from 'node:assert/strict'
import { publicSnapshot, searchContent } from '../shared/content.ts'
const published = { id: 'one', title: 'Vue 的状态管理', slug: 'vue-state', summary: '边界与工程实践', body: '这里记录共享状态', kind: 'article', category: '工程实践', tags: ['Vue'], featured: false, publishedAt: '2026-10-24T00:00:00.000Z' }
const draft = { ...published, body: '未公开的私人修改', visibility: 'public', revision: 2, updatedAt: '', createdAt: '', published }
test('私密内容即使残留发布快照，也不会公开', () => { assert.equal(publicSnapshot({ ...draft, visibility: 'private' }), null) })
test('编辑稿不能替换公开快照', () => { assert.equal(publicSnapshot(draft).body, published.body); assert.notEqual(publicSnapshot(draft).body, draft.body) })
test('返回独立快照，修改结果不污染原始记录', () => { const copy = publicSnapshot(draft); copy.tags.push('新标签'); assert.deepEqual(published.tags, ['Vue']) })
test('无发布版本时，即使可见性标记公开也不可见', () => { assert.equal(publicSnapshot({ ...draft, published: null }), null) })
test('中文标题、正文与标签可搜索', () => { for (const q of ['状态管理', '共享状态', 'vue']) assert.equal(searchContent([published], q).length, 1) })
test('多个关键词必须同时匹配，分类独立生效', () => { assert.equal(searchContent([published], 'Vue 状态').length, 1); assert.equal(searchContent([published], 'Vue 不存在').length, 0); assert.equal(searchContent([published], '', '日常观察').length, 0) })
test('标题命中优先于较新的正文命中', () => { const other = { ...published, id: 'two', title: '另一个标题', body: 'Vue', publishedAt: '2026-10-25T00:00:00.000Z' }; assert.equal(searchContent([other, published], 'Vue')[0].id, 'one') })
