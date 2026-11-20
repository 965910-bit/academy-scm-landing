const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/knowledge.js'),'utf8'),{window});
const files=['academy/guides/index.html',...window.SCMKnowledge.sources.map(s=>`academy/guides/${s.id}/index.html`)];
test('Публичные материалы имеют уникальные метаданные, H1 и валидную разметку',()=>{
 const titles=new Set(),canonical=new Set();
 for(const file of files){const doc=new JSDOM(fs.readFileSync(path.join(root,file),'utf8')).window.document;
 assert.equal(doc.querySelectorAll('h1').length,1,file);const title=doc.title;assert.ok(title.length>20);assert.ok(!titles.has(title));titles.add(title);
 const url=doc.querySelector('[rel="canonical"]').href;assert.ok(url.startsWith('https://scm-news.online/academy/guides/'));assert.ok(!canonical.has(url));canonical.add(url);
 assert.ok(doc.querySelector('meta[name="description"]').content.length>50);
 const schema=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);assert.equal(schema.url,url);assert.ok(!JSON.stringify(schema).includes('aggregateRating'));
 assert.equal(doc.querySelectorAll('script[src]').length,1,'Только вход в единую оболочку; статический текст сохранён');assert.match(doc.querySelector('script[src]').src,/resource-entry\.js$/);
 }
});
test('Локальные ссылки библиотеки разрешаются в существующие файлы',()=>{
 for(const file of files){const doc=new JSDOM(fs.readFileSync(path.join(root,file),'utf8')).window.document;
 for(const el of doc.querySelectorAll('a[href],link[href]')){const href=el.getAttribute('href');if(/^(https?:|#)/.test(href))continue;let target=path.resolve(path.dirname(path.join(root,file)),href.split('#')[0]);if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');assert.ok(fs.existsSync(target),`${file} -> ${href}`);}
 }
});
test('Sitemap содержит публичные материалы, но не кабинеты и hash-адреса',()=>{
 const doc=new JSDOM(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),{contentType:'application/xml'}).window.document;
 const urls=[...doc.querySelectorAll('loc')].map(el=>el.textContent);assert.equal(new Set(urls).size,urls.length);
 for(const file of files){const d=new JSDOM(fs.readFileSync(path.join(root,file),'utf8')).window.document;assert.ok(urls.includes(d.querySelector('[rel="canonical"]').href));}
 for(const url of urls)assert.ok(!/dashboard|login|#/.test(url));
});
test('Офлайн-пакет содержит все публичные статьи и их стили',()=>{
 const self={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/offline-config.js'),'utf8'),{self});
 for(const file of files)assert.ok(self.SCM_OFFLINE_CONFIG.files.includes(file.replace('academy/','')));
 assert.ok(self.SCM_OFFLINE_CONFIG.files.includes('guides/guides.css'));
});
