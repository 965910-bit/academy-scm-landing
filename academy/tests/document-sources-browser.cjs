'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createService}=require('../../server/server.cjs');
(async()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scm-source-')),service=createService({directory,secure:false});let browser;try{
await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;
browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
await page.goto(base+'/academy/?folder=02%2Fcommission#resources/documents/');await page.locator('.document-source-file').first().waitFor();assert.match(await page.locator('.document-source-files').innerText(),/ПРИМЕР ДРУГОЙ ОРГАНИЗАЦИИ/);assert.match(await page.locator('.document-required').innerText(),/Не добавлен/);
const href=await page.locator('.document-source-file a[download]').first().getAttribute('href');const response=await context.request.get(base+href);assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');
const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.document-source-file a[download]').first().click()]);assert.ok(fs.statSync(await download.path()).size>100);
for(const width of [320,390,768]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.locator('#folder-search input').fill('приёмной комиссии');await page.locator('#folder-search button').click();await page.locator('.document-source-file').first().waitFor();
await page.evaluate(()=>window.SCMOffline.prepare());await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);const offline=await page.evaluate(async href=>{const r=await fetch(href);return {status:r.status,head:(await r.text()).slice(0,5)};},href);assert.equal(offline.status,200);assert.equal(offline.head,'%PDF-');console.log('PASS downloaded PDF: folder, source/example status, missing originals, actual download, global search, mobile and offline bytes.');
}finally{await browser?.close();await new Promise(r=>service.server.close(r));service.db.close();fs.rmSync(directory,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
