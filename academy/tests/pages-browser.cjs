/* GitHub Pages-like static hosting: deliberately NO Node API and no server redirects. */
'use strict';
const {chromium}=require('playwright-core'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH.');const root=path.resolve(__dirname,'../..');
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://static.test');let name=decodeURIComponent(url.pathname);if(name==='/')name='/index.html';
  if(name!=='/index.html'&&(!name.startsWith('/academy/')||name.split('/').some(p=>p.startsWith('.')||['tests','node_modules'].includes(p)))){res.writeHead(404,{'Content-Type':'text/html'});return res.end('<h1>Not Found</h1>');}
  let file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const data=fs.readFileSync(file),mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime,'Cache-Control':'public,max-age=3600'});res.end(data);}catch{res.writeHead(404);res.end();}
 });
 let browser;
 try{await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});const context=await browser.newContext(),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port+'/');await p.waitForURL('**/academy/');await p.locator('.system-tools').evaluate(el=>el.open=true);await p.locator('#assembly-entry').click();await p.locator('#login-form').waitFor();await p.locator('#login-form [name=name]').fill('Герасимов Дмитрий Сергеевич');await p.locator('#login-form button[type=submit]').click();await p.locator('#assembly-select').waitFor();
 assert.match(await p.locator('#build-version').textContent(),/workspace-20261119-24/);
 const types=await p.locator('#assembly-select option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.equal(types.length,28);
 for(const type of types){await p.locator('#assembly-select [name=type]').selectOption(type);await p.locator('#assembly-select button').click();await p.locator('#assembly-record [name=title]').fill('Проверка '+type);await p.locator('#assembly-record button').first().click();await p.locator('.workflow-record').waitFor();}
 for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);}
 await p.reload();await p.locator('.system-tools').evaluate(el=>el.open=true);await p.locator('#assembly-entry').click();await p.locator('#assembly-select').waitFor();const count=await p.evaluate(()=>JSON.parse(localStorage.getItem('scm-academy-assembly-v1')).records.length);assert.equal(count,28);
 await p.locator('.system-tools').evaluate(el=>el.open=true);await Promise.all([p.waitForEvent('load'),p.locator('#refresh-build').click()]);await p.locator('.system-tools').evaluate(el=>el.open=true);await p.locator('#assembly-entry').click();await p.locator('#assembly-select').waitFor();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('scm-academy-assembly-v1')).records.length),28);
 await p.evaluate(()=>window.SCMOffline.prepare());await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await p.reload();await p.locator('.system-tools').evaluate(el=>el.open=true);await p.locator('#assembly-entry').click();await p.locator('#assembly-select').waitFor();assert.equal(await p.locator('#assembly-select option').count(),28);
 assert.deepEqual(errors,[]);console.log('PASS: static root → platform, passwordless owner, all 28 modules saved, mobile 320/390/768/1440, update preserves data, versioned assets offline.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(err=>{console.error(err);process.exitCode=1;});
