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
test('Каталог: 32 уникальных типа, реквизиты и ограничения',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/documents/catalog.js'),'utf8'),{window});const types=window.SCMDocumentCatalog;assert.equal(types.length,32);assert.equal(new Set(types.map(t=>t.id)).size,32);for(const t of types){assert.ok(t.fields.length>20);assert.ok(t.limits.length>40);}
 const doc=new JSDOM(fs.readFileSync(path.join(root,'academy/documents/index.html'),'utf8')).window.document;assert.equal(doc.querySelectorAll('article').length,32);assert.equal(doc.querySelectorAll('h1').length,1);
});
test('Публичный реестр пуст, без вымышленных выдач и без внешних трекеров',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'registry/published.json'),'utf8'));assert.equal(data.records.length,0);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'registry/certificates.json'),'utf8')),[]);
 const doc=new JSDOM(fs.readFileSync(path.join(root,'registry/registry.html'),'utf8')).window.document;assert.equal(doc.querySelectorAll('input').length,1);for(const s of doc.querySelectorAll('script[src]'))assert.ok(!s.src.startsWith('http'));assert.equal(doc.querySelector('meta[name="referrer"]').content,'no-referrer');
 const self={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/offline-config.js'),'utf8'),{self});assert.ok(!self.SCM_OFFLINE_CONFIG.files.some(f=>f.includes('published.json')||f.includes('registry')));
});
