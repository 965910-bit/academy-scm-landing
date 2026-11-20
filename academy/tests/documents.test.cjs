const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),root=path.resolve(__dirname,'../..');
const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'registry/verification.js'),'utf8'),context);const lookup=context.SCMVerification.lookup;
const now=new Date('2026-11-19T12:00:00Z'),code='a'.repeat(32);
const fixture=()=>({schemaVersion:1,updatedAt:'2026-11-19T00:00:00Z',records:[{code,number:'TEST-1',type:'Учебная фикстура',title:'Проверка алгоритма',issuer:'Тест',issuedAt:'2026-11-01',status:'issued'}]});
test('Проверка: активная запись, отзыв, замена и срок',()=>{
 let d=fixture();assert.equal(lookup(d,code,now).state,'issued');assert.equal(lookup(d,code.toUpperCase(),now).state,'issued');
 for(const status of ['revoked','replaced']){d.records[0].status=status;assert.equal(lookup(d,code,now).state,status);}
 d.records[0].status='issued';d.records[0].validUntil='2026-11-18';assert.equal(lookup(d,code,now).state,'expired');d.records[0].validUntil='2026-11-19';assert.equal(lookup(d,code,now).state,'issued');
});
test('Проверка: неизвестный код, неверный формат, устаревшие и ошибочные данные не подтверждаются',()=>{
 assert.equal(lookup(fixture(),'b'.repeat(32),now).state,'not-found');assert.equal(lookup(fixture(),'<script>',now).state,'invalid');
 let d=fixture();d.updatedAt='2026-10-01';assert.equal(lookup(d,code,now).state,'stale');d.updatedAt='2027-01-01';assert.equal(lookup(d,code,now).state,'stale');
 for(const bad of [null,{}, {schemaVersion:1,records:[]}])assert.equal(lookup(bad,code,now).state,'unavailable');
});
test('Проверка: конфликт кодов, персональные поля и невозможные даты блокируют реестр',()=>{
 let d=fixture();d.records.push({...d.records[0],code:code.toUpperCase()});assert.equal(lookup(d,code,now).state,'unavailable');
 d=fixture();d.records[0].fullName='Не публиковать';assert.equal(lookup(d,code,now).state,'unavailable');
 d=fixture();d.records[0].issuedAt='2026-02-30';assert.equal(lookup(d,code,now).state,'unavailable');
 d=fixture();d.records[0].validUntil='2025-01-01';assert.equal(lookup(d,code,now).state,'unavailable');
 d=fixture();d.records[0].issuedAt='2026-12-01';assert.equal(lookup(d,code,now).state,'unavailable');
});
test('Каталог: 54 уникальных типа, реквизиты и ограничения',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/documents/catalog.js'),'utf8'),{window});const types=window.SCMDocumentCatalog;assert.equal(types.length,54);assert.equal(new Set(types.map(t=>t.id)).size,54);for(const t of types){assert.ok(t.fields.length>20);assert.ok(t.limits.length>40);}
 const doc=new JSDOM(fs.readFileSync(path.join(root,'academy/documents/index.html'),'utf8')).window.document;assert.equal(doc.querySelectorAll('article').length,54);assert.equal(doc.querySelectorAll('h1').length,1);
});
test('Публичный реестр пуст, без вымышленных выдач и без внешних трекеров',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'registry/published.json'),'utf8'));assert.equal(data.records.length,0);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'registry/certificates.json'),'utf8')),[]);
 const doc=new JSDOM(fs.readFileSync(path.join(root,'registry/registry.html'),'utf8')).window.document;assert.equal(doc.querySelectorAll('input').length,1);for(const s of doc.querySelectorAll('script[src]'))assert.ok(!s.src.startsWith('http'));assert.equal(doc.querySelector('meta[name="referrer"]').content,'no-referrer');
 const self={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/offline-config.js'),'utf8'),{self});assert.ok(!self.SCM_OFFLINE_CONFIG.files.some(f=>f.includes('published.json')||f.startsWith('../registry/')||f.startsWith('registry/')));
});

test('HTML документа: все реквизиты и текст экранируются, печатная версия не содержит скриптов',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/documents/catalog.js'),'utf8'),{window});vm.runInNewContext(fs.readFileSync(path.join(root,'academy/documents.js'),'utf8'),{window});
 const type=window.SCMDocumentCatalog.find(t=>t.id==='contract');
 const payload='<img src=x onerror="alert(1)"><script>bad()</script>';
 const html=window.SCMDocuments.html(type,{title:payload,organization:payload,recipient:payload,date:'2026-11-19',body:payload+'\nСтрока 2',values:{0:payload}});
 const doc=new JSDOM(html).window.document;assert.equal(doc.querySelectorAll('script,img,iframe,form').length,0);assert.equal(doc.querySelectorAll('[onerror]').length,0);assert.equal(doc.querySelector('h1').textContent,payload);assert.match(doc.querySelector('.body').textContent,/Строка 2/);assert.match(doc.querySelector('.warning').textContent,/НЕ ВЫДАННЫЙ/);assert.match(doc.querySelector('style').textContent,/@page.*A4/);assert.match(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content,/default-src 'none'/);
});
test('Редактор поддерживает все 54 типа, ограничивает объём и экспортирует текст без потери кириллицы',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/documents/catalog.js'),'utf8'),{window});vm.runInNewContext(fs.readFileSync(path.join(root,'academy/documents.js'),'utf8'),{window});
 for(const type of window.SCMDocumentCatalog){const fields=window.SCMDocuments.fieldLabels(type);assert.ok(fields.length>=3);const data=window.SCMDocuments.content(type,{body:'Текст проекта',values:{0:'Первый реквизит'}});assert.equal(Object.keys(data.values).length,fields.length);assert.match(window.SCMDocuments.markdown(type,data),/Первый реквизит/);assert.match(window.SCMDocuments.html(type,data),/Текст проекта/);}
 const value=window.SCMDocuments.content(window.SCMDocumentCatalog[0],{body:'x'.repeat(14000),values:{0:'x'.repeat(3000)}});assert.equal(value.body.length,12000);assert.equal(value.values[0].length,2000);
});
