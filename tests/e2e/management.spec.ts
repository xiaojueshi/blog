import { test, expect, type Page } from '@playwright/test'
import type { WorkspaceState, KnowledgeBase } from '../../shared/workspace'
import type { Draft } from '../../shared/content'
const origin = 'http://127.0.0.1:3100'
const password = 'test-only-xiaojueshi-2026'
const headers = { origin }
async function login(page: Page) { const r = await page.request.post('/api/auth', { headers, data: { password } }); expect(r.ok()).toBeTruthy() }
async function state(page: Page): Promise<WorkspaceState> { return page.request.get('/api/admin/workspace').then(r => r.json()) }
async function ready(page: Page, path: string) { await page.goto(path); await page.locator('[data-app-ready="true"]').waitFor() }
async function term(page: Page, kind: string, name: string) { const w=await state(page);const r=await page.request.post('/api/admin/terms',{headers,data:{revision:w.revision,action:'create',kind,name}});expect(r.ok()).toBeTruthy();return (await r.json()).workspace.terms.find((t: any)=>t.kind===kind&&t.name===name) }
async function createContent(page: Page, values: object): Promise<Draft> { const r=await page.request.post('/api/admin/content',{headers,data:{title:`管理测试-${Date.now()}`,body:'# 正文\n\n这是管理功能验收。',kind:'note',revision:0,...values}});expect(r.ok()).toBeTruthy();return r.json() }
async function setTheme(page: Page, theme: string) { await page.getByLabel('主题设置').last().click(); await page.locator('.theme-popover:visible').getByRole('button',{name:theme,exact:true}).click() }

test('分类改名与标签合并保持稳定关联，默认类型不能被停用', async ({ page }) => {
  await login(page)
  const suffix=String(Date.now()); const category=await term(page,'category',`测试分类-${suffix}`);const tagA=await term(page,'tag',`原标签-${suffix}`);const tagB=await term(page,'tag',`目标标签-${suffix}`)
  const item=await createContent(page,{title:`分类关联-${suffix}`,categoryId:category.id,tagIds:[tagA.id,tagB.id],action:'publish'})
  await ready(page,'/admin/organize?tab=category')
  await page.getByRole('button',{name:`重命名${category.name}`,exact:true}).click()
  await page.getByLabel('修改名称').fill(`改名分类-${suffix}`)
  await page.getByRole('button',{name:'保存名称',exact:true}).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('已保存')
  const renamed=(await state(page)).terms.find(t=>t.id===category.id)
  expect(renamed?.name).toBe(`改名分类-${suffix}`)
  const published=await page.request.get(`/api/content/${item.slug}`).then(r=>r.json())
  expect(published.categoryId).toBe(category.id);expect(published.category).toBe(renamed?.name)
  await page.getByRole('tab',{name:'标签管理',exact:true}).click()
  const row=page.locator('.organization-row').filter({hasText:tagA.name})
  await row.getByRole('button',{name:'合并 / 移除',exact:true}).click()
  await page.getByLabel('迁移目标').selectOption(tagB.id)
  await page.getByRole('button',{name:'迁移关联并移除原项',exact:true}).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('更新了')
  const after=await page.request.get('/api/admin/content').then(r=>r.json());const current=after.find((d: Draft)=>d.id===item.id)
  expect(current.tagIds).toEqual([tagB.id]);expect(current.published.tagIds).toEqual([tagB.id]);expect((await state(page)).terms.some(t=>t.id===tagA.id)).toBeFalsy()
  const extra=await createContent(page,{title:`批量关联-${suffix}`})
  await ready(page,'/admin')
  await page.getByLabel(`选择${item.title}`,{exact:true}).check();await page.getByLabel(`选择${extra.title}`,{exact:true}).check()
  await page.getByLabel('批量操作',{exact:true}).selectOption('category');await page.getByLabel('批量目标',{exact:true}).selectOption(category.id)
  await page.getByRole('button',{name:'应用',exact:true}).click();await expect(page.locator('.notice[role="status"]')).toContainText('已更新 2 项')
  const bulkItems=await page.request.get('/api/admin/content').then(r=>r.json());const extraUpdated=bulkItems.find((d:Draft)=>d.id===extra.id)
  expect(extraUpdated.categoryId).toBe(category.id)
  const stale=await page.request.post('/api/admin/bulk',{headers,data:{action:'tag-add',targetId:tagB.id,items:[{id:extraUpdated.id,revision:extraUpdated.revision},{id:item.id,revision:1}]}})
  expect(stale.status()).toBe(409)
  expect((await page.request.get('/api/admin/content').then(r=>r.json())).find((d:Draft)=>d.id===extra.id).tagIds).not.toContain(tagB.id)
  await ready(page,'/admin/organize?tab=type')
  await page.getByRole('tab',{name:'类型管理',exact:true}).click()
  const w=await state(page);const defaultType=w.terms.find(t=>t.id===w.settings.defaultKind)!
  await expect(page.locator('.organization-row').filter({hasText:defaultType.name}).getByRole('button',{name:'停用',exact:true})).toBeDisabled()
  const thought=w.terms.find(t=>t.id==='thought')!
  await page.locator('.organization-row').filter({hasText:thought.name}).getByRole('button',{name:'停用',exact:true}).click()
  const rejected=await page.request.post('/api/admin/content',{headers,data:{title:'禁止新建停用类型',body:'正文',kind:'thought',revision:0}});expect(rejected.status()).toBe(400)
  await page.locator('.organization-row').filter({hasText:thought.name}).getByRole('button',{name:'启用',exact:true}).click()
  const latest=(await page.request.get('/api/admin/content').then(r=>r.json())).find((d:Draft)=>d.id===item.id)
  await page.request.post('/api/admin/content',{headers,data:{...latest,action:'withdraw'}})
})

test('知识库支持章节、新建笔记与引用，公开目录隐藏私人内容', async ({ page, request },testInfo) => {
  await login(page);const suffix=String(Date.now());const title=`知识手册-${suffix}`
  const privateCategory=await term(page,'category',`仅私人分类-${suffix}`)
  const privateNote=await createContent(page,{title:`私人章节内容-${suffix}`,categoryId:privateCategory.id})
  expect(JSON.stringify(await request.get('/api/workspace').then(r=>r.json()))).not.toContain(privateCategory.name)
  await ready(page,'/admin/knowledge')
  await page.getByRole('button',{name:'新建知识库',exact:true}).click();await page.getByLabel('知识库名称',{exact:true}).fill(title)
  await page.getByRole('button',{name:'创建并编辑目录',exact:true}).click()
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible()
  const createdBase=(await state(page)).bases.find(b=>b.title===title)
  if(!createdBase) throw new Error('新建的知识库未保存到管理数据')
  const baseId=createdBase.id
  await page.getByRole('button',{name:'新建章节',exact:true}).click();await page.getByLabel('章节名称').fill('安装与运行')
  const chapterId=await page.locator('.directory-row.selected').getAttribute('class')
  expect(chapterId).toContain('selected')
  for(const contentId of ['quiet-design','edge-notes',privateNote.id]) {
    await page.getByRole('button',{name:'收录内容',exact:true}).click();await page.getByLabel('收录内容',{exact:true}).selectOption(contentId);await page.getByRole('button',{name:'加入目录',exact:true}).click()
  }
  await page.locator('.base-properties summary').click();await page.getByLabel('知识库链接').fill(`handbook-${suffix}`)
  await page.getByRole('checkbox',{name:/公开知识库/}).check();await page.getByRole('button',{name:'保存目录',exact:true}).first().click()
  await expect(page.locator('.notice[role="status"]')).toContainText('目录已保存')
  await page.screenshot({path:testInfo.outputPath('knowledge-manager-light.png'),fullPage:true})
  await expect.poll(async()=>{const bases=await request.get('/api/knowledge').then(r=>r.json());return bases.some((b:KnowledgeBase)=>b.id===baseId)}, {timeout:10000}).toBeTruthy()
  const publicBases=await request.get('/api/knowledge').then(r=>r.json());const publicBase=publicBases.find((b:KnowledgeBase)=>b.id===baseId)
  if(!publicBase) throw new Error('刚保存的知识库未出现在公开目录')
  expect(publicBase.nodes.some((n:any)=>n.contentId===privateNote.id)).toBeFalsy();expect(JSON.stringify(publicBase)).not.toContain(privateNote.title)
  const first=publicBase.nodes.find((n:any)=>n.contentId==='quiet-design')
  if(!first) throw new Error('公开知识库缺少示例内容引用')
  await ready(page,`/garden?collection=handbook-${suffix}&entry=${first.id}`)
  await expect(page.getByRole('heading',{name:'好的界面，是让复杂消失',exact:true})).toBeVisible();await expect(page.getByText('安装与运行',{exact:true}).first()).toBeVisible()
  await page.getByRole('navigation',{name:'章节阅读导航'}).getByRole('link').filter({hasText:'下一篇'}).click()
  await expect(page.getByRole('heading',{name:'把一个小项目放到边缘，需要考虑什么？',exact:true})).toBeVisible()
  await expect(page.locator('.mermaid svg')).toBeVisible()
  await setTheme(page,'深色');await expect(page.locator('html')).toHaveAttribute('data-theme','dark')
  await page.screenshot({path:testInfo.outputPath('knowledge-reading-dark.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844});await page.locator('.knowledge-mobile-directory summary').click();await expect(page.getByRole('navigation',{name:'知识库目录'}).getByRole('link').filter({hasText:'好的界面'})).toBeVisible();await page.locator('.knowledge-mobile-directory summary').click();await page.screenshot({path:testInfo.outputPath('knowledge-reading-mobile-dark.png'),fullPage:true});await page.setViewportSize({width:1440,height:960})
  await ready(page,`/admin/knowledge/${baseId}`)
  await page.getByRole('navigation',{name:'知识库编辑目录'}).getByRole('button').filter({hasText:'安装与运行'}).click()
  await page.getByRole('button',{name:'新建笔记',exact:true}).click();await page.getByLabel('内容标题').fill(`章节内新笔记-${suffix}`);await page.getByLabel('Markdown 正文').fill('正文在知识库中只保存一份。')
  await expect(page.getByRole('status').filter({hasText:'所有更改已保存'})).toBeVisible()
  const savedBase=(await state(page)).bases.find(b=>b.id===baseId)!
  expect(savedBase.nodes.length).toBe(5);const chapter=savedBase.nodes.find(n=>n.title==='安装与运行')!
  expect(savedBase.nodes.filter(n=>n.parentId===chapter.id).length).toBe(4)
  const invalid=await page.request.post('/api/admin/knowledge',{headers,data:{...savedBase,nodes:[{...chapter,parentId:chapter.id}]}});expect(invalid.status()).toBe(400)
  expect((await state(page)).bases.find(b=>b.id===baseId)?.revision).toBe(savedBase.revision)
  await ready(page,'/admin/knowledge');const card=page.locator('.knowledge-admin-card').filter({hasText:title});await card.getByRole('button',{name:'归档',exact:true}).click();await expect(page.locator('.notice[role="status"]')).toContainText('已归档')
  expect((await request.get('/api/knowledge').then(r=>r.json())).some((b:any)=>b.id===baseId)).toBeFalsy()
  await page.getByRole('button',{name:'已归档',exact:true}).click();await page.locator('.knowledge-admin-card').filter({hasText:title}).getByRole('button',{name:'恢复',exact:true}).click();await expect(page.locator('.notice[role="status"]')).toContainText('已恢复')
})

test('设置保存实际生效，数据导入先预览后执行，导出包含组织结构', async ({ page },testInfo) => {
  await login(page);const original=(await state(page)).settings;const suffix=String(Date.now())
  await ready(page,'/admin/settings')
  await page.getByLabel('站点名称',{exact:true}).fill('XIAOJUESHI TEST')
  await page.getByRole('button',{name:'保存设置',exact:true}).click();await expect(page.locator('.notice[role="status"]')).toContainText('设置已保存')
  expect((await state(page)).settings.name).toBe('XIAOJUESHI TEST')
  await page.getByRole('tab',{name:'编辑与发布',exact:true}).click();await page.getByLabel('默认内容类型').selectOption('article');await page.getByLabel('自动保存间隔（秒）').fill('2')
  await page.getByRole('checkbox',{name:/显示阅读时长/}).uncheck();await page.getByRole('checkbox',{name:/代码块自动换行/}).check()
  await page.getByRole('button',{name:'保存设置',exact:true}).click();await expect(page.locator('.notice[role="status"]')).toContainText('设置已保存')
  await ready(page,'/admin/write');await expect(page.getByLabel('内容类型')).toHaveValue('article')
  await ready(page,'/articles');await expect(page.locator('.reading-time')).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('data-code-wrap','true')
  await ready(page,'/admin/settings?tab=data')
  const backup=await page.request.get('/api/admin/backup').then(r=>r.json())
  expect(backup.version).toBe(2);expect(backup.workspace.terms.length).toBeGreaterThan(3);expect(backup.workspace.bases.length).toBeGreaterThan(0)
  const originalContent=structuredClone(backup.content[0]);const importedId=`preview-${suffix}`;Object.assign(originalContent,{id:importedId,slug:importedId,title:'等待确认的导入',visibility:'private',published:null});backup.content=[originalContent];backup.assets=[];backup.history=[];backup.workspace.bases=[]
  await page.getByLabel('选择导入文件').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))})
  await page.getByRole('button',{name:'预览导入结果',exact:true}).click();await expect(page.getByRole('region',{name:'导入预览'})).toContainText('确认导入计划')
  expect((await page.request.get('/api/admin/content').then(r=>r.json())).some((d:Draft)=>d.id===importedId)).toBeFalsy()
  await page.screenshot({path:testInfo.outputPath('data-import-preview.png'),fullPage:true})
  await page.getByRole('button',{name:'确认执行导入',exact:true}).click();await expect(page.locator('.notice[role="status"]')).toContainText('导入完成：新增 1 项')
  expect((await page.request.get('/api/admin/content').then(r=>r.json())).some((d:Draft)=>d.id===importedId)).toBeTruthy()
  const downloadPromise=page.waitForEvent('download');await page.getByRole('link').filter({hasText:'完整 ZIP'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('xiaojueshi-backup.zip');expect(await download.failure()).toBeNull()
  const w=await state(page);const restored=await page.request.post('/api/admin/settings',{headers,data:{revision:w.revision,settings:original}});expect(restored.ok()).toBeTruthy()
})

test('暗黑模式支持系统偏好、手动选择与 SSR 持久化，编辑器切换不丢文字', async ({ page },testInfo) => {
  await page.emulateMedia({colorScheme:'dark'});await ready(page,'/')
  expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(23, 23, 25)')
  await setTheme(page,'浅色');await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light')
  expect(await page.request.get('/').then(r=>r.text())).toContain('data-theme="light"')
  await login(page);const item=await createContent(page,{title:`主题切换草稿-${Date.now()}`})
  await ready(page,`/admin/write?id=${item.id}`);await page.getByLabel('Markdown 正文').fill('切换主题时保留这段未完成的文字。')
  await setTheme(page,'深色');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.getByLabel('Markdown 正文')).toContainText('保留这段未完成的文字')
  await page.getByLabel('Markdown 正文').press('ControlOrMeta+z');await expect(page.getByLabel('Markdown 正文')).toContainText('这是管理功能验收')
  await page.getByLabel('Markdown 正文').press('ControlOrMeta+Shift+z');await expect(page.getByLabel('Markdown 正文')).toContainText('保留这段未完成的文字')
  await expect(page.getByRole('status').filter({hasText:'所有更改已保存'})).toBeVisible();await page.screenshot({path:testInfo.outputPath('editor-dark.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'预览',exact:true}).click();await expect(page.locator('.editor-preview')).toContainText('保留这段未完成的文字');await page.screenshot({path:testInfo.outputPath('editor-mobile-dark.png'),fullPage:true})
  await setTheme(page,'跟随系统');await expect(page.locator('html')).toHaveAttribute('data-theme','system');await page.emulateMedia({colorScheme:'light'})
  expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)')
})

test('深浅主题下的工作台页面与公开目录在桌面和手机均无溢出', async ({ page },testInfo) => {
  test.setTimeout(120000);await login(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  const paths=['/admin','/admin/organize?tab=type','/admin/organize?tab=category','/admin/organize?tab=tag','/admin/knowledge','/admin/knowledge/frontend','/admin/settings','/admin/settings?tab=appearance','/admin/settings?tab=editor','/admin/settings?tab=data','/admin/assets','/garden']
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:960})
    for(const mode of ['light','dark']) {
      await page.context().addCookies([{name:'xjs-theme',value:mode,domain:'127.0.0.1',path:'/'}])
      for(let i=0;i<paths.length;i++) {
        await ready(page,paths[i]!);await expect(page.locator('h1')).toBeVisible();await page.evaluate(()=>document.fonts.ready)
        expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),`${width} ${mode} ${paths[i]}`).toBeFalsy()
        await page.screenshot({path:testInfo.outputPath(`${width}-${mode}-${i}.png`),fullPage:true,animations:'disabled'})
      }
    }
  }
  expect(errors).toEqual([])
})

test('未登录无法读取或修改管理数据，ZIP 损坏不改变现有数据', async ({ page, request }) => {
  for(const path of ['/api/admin/workspace','/api/admin/data','/api/admin/assets']) expect((await request.get(path)).status()).toBe(401)
  for(const path of ['/api/admin/terms','/api/admin/knowledge','/api/admin/settings','/api/admin/import']) expect((await request.post(path,{headers,data:{}})).status()).toBe(401)
  await login(page);const before=await page.request.get('/api/admin/content').then(r=>r.json())
  const response=await page.request.post('/api/admin/import',{headers,multipart:{action:'plan',file:{name:'broken.zip',mimeType:'application/zip',buffer:Buffer.from('not-a-zip')}}});expect(response.status()).toBe(400)
  expect((await page.request.get('/api/admin/content').then(r=>r.json())).length).toBe(before.length)
})
