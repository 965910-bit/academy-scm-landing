'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('ОКПДТР: все 9935 последовательных кодов, 51 источник, поля без подстановок',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'classifiers/okpdtr.json')));assert.equal(data.count,9935);assert.equal(data.records.length,9935);assert.equal(data.pages.length,51);assert.equal(data.pages.reduce((s,p)=>s+p.rows,0),9935);const codes=new Set(data.records.map(r=>r.code));assert.equal(codes.size,9935);for(const [start,end]of [[100001,105597],[200001,204338]])for(let i=start;i<=end;i++)assert.ok(codes.has(String(i)),String(i));for(const r of data.records){assert.ok(r.name.length>2);assert.ok(!r.name.includes('�'));assert.match(r.source,/^https:\/\/bizlog.ru\/okpdtr\/[34]_\d+\.htm$/);assert.match(r.okz,/^\d{4}$/);if(r.kind==='employee'){assert.ok(['','1','2','3'].includes(r.category));if(!r.category)assert.equal(r.code,'200191');assert.equal(r.etks,'');assert.equal(r.grades,'');}else assert.equal(r.category,'');}assert.equal(data.records.find(r=>r.code==='105085').name,'Токарь');
});
test('Нормативный реестр отделяет отмену от непроверенного статуса и содержит локальные документы',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'regulations/registry.json')));assert.equal(data.records.length,39);assert.equal(new Set(data.records.map(r=>r.id)).size,39);for(const r of data.records){assert.ok(['Действующий','Утратил силу','Требует проверки'].includes(r.status));assert.ok(r.local.length>20);assert.ok(r.basis.length>20);assert.match(r.source,/^https:\/\//);assert.ok(r.verification);}
 assert.equal(data.records.find(r=>r.id==='203').status,'Утратил силу');assert.match(data.records.find(r=>r.id==='1441').basis,/2032/);assert.equal(data.records.find(r=>r.id==='fgos').status,'Требует проверки');
});
test('Офлайн-манифест содержит справочники, формы и только существующие публичные файлы',()=>{
 const self={};vm.runInNewContext(fs.readFileSync(path.join(root,'offline-config.js'),'utf8'),{self});for(const file of self.SCM_OFFLINE_CONFIG.files){assert.ok(fs.existsSync(path.join(root,file)),file);}for(const file of ['classifiers/okpdtr.json','classifiers/classifier.js','regulations/registry.json','regulations/registry.js','reference/reference.css','documents/forms/diploma-bachelor.html','documents/forms/appendix-spo.html'])assert.ok(self.SCM_OFFLINE_CONFIG.files.includes(file),file);
});
