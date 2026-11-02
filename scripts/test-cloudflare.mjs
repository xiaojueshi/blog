import assert from 'node:assert/strict'

const origin = process.env.TEST_ORIGIN || 'http://localhost:3102'
const password = process.env.TEST_ADMIN_PASSWORD
const setupToken = process.env.TEST_SETUP_TOKEN

assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), '仅允许本机测试环境')
assert(password, '缺少 TEST_ADMIN_PASSWORD')
assert(setupToken, '缺少 TEST_SETUP_TOKEN')

let cookie = ''

async function request(path, options = {}) {
  return fetch(origin + path, {
    ...options,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  })
}

async function post(path, data) {
  const response = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  assert(response.ok, `${path}: ${response.status} ${await response.clone().text()}`)
  return response.json()
}

const login = await request('/api/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password, setupToken }),
})
assert.equal(login.status, 200, await login.clone().text())
cookie = login.headers.get('set-cookie').split(';')[0]
assert((await (await request('/api/auth')).json()).authenticated)

const slug = `cf-smoke-${Date.now()}`
let draft = await post('/api/admin/content', {
  title: 'Workers 事务验证',
  body: '私密正文',
  slug,
  kind: 'note',
})
assert.equal((await request(`/api/content/${slug}`)).status, 404)

const image = new Uint8Array(3 * 1024 * 1024).fill(125)
const form = new FormData()
form.append('contentId', draft.id)
form.append('file', new Blob([image], { type: 'image/png' }), 'chunk-test.png')
const uploaded = await request('/api/admin/upload', { method: 'POST', body: form })
assert.equal(uploaded.status, 200)
const { url } = await uploaded.json()
const privateImage = await fetch(origin + url)
assert.equal(privateImage.status, 404)

draft = await post('/api/admin/content', {
  ...draft,
  body: `![分片图片](${url})`,
  action: 'publish',
})
assert.equal((await fetch(origin + `/api/content/${slug}`)).status, 200)
assert.deepEqual(new Uint8Array(await (await fetch(origin + url)).arrayBuffer()), image)

const conflict = await request('/api/admin/content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...draft,
    title: '冲突写入',
    revision: draft.revision - 1,
  }),
})
assert.equal(conflict.status, 409)

const backup = await (await request('/api/admin/backup')).json()
assert.equal(backup.assets.find(asset => asset.content_id === draft.id).data.length, 4 * 1024 * 1024)
assert((await request('/api/admin/backup?format=zip')).ok)
const restored = await post('/api/admin/backup', backup)
assert.equal(restored.imported, 0)

await post('/api/admin/content', { ...draft, action: 'withdraw' })
assert.equal((await fetch(origin + url)).status, 404)
assert.equal((await fetch(origin + `/api/content/${slug}`)).status, 404)
assert.match(await (await fetch(origin)).text(), /永远相信美好的事情即将发生/)

console.log('Cloudflare workerd 验证通过：登录、私密、发布、冲突、3MB 图片分片、备份、撤回、SSR')
