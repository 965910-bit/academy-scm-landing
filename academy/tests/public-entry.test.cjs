'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
test('Публичный корень ведёт в единую платформу, а не на старый лендинг',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),doc=new JSDOM(html).window.document;
 assert.match(doc.querySelector('meta[http-equiv=refresh]').content,/url=\/academy\//);assert.ok(doc.querySelector('a[href="/academy/"]'));assert.ok(!html.includes('Запросить демо-доступ'));assert.ok(!html.includes('https://scm-news.ru/'));
 for(const hostname of ['scm-news.online','www.scm-news.online','preview.e2b.app']){let target;vm.runInNewContext(doc.querySelector('script').textContent,{location:{hostname,host:hostname,search:'?from=old',hash:'#cabinet',replace:v=>target=v}});assert.equal(target,(hostname.includes('scm-news.online')?'https://'+hostname:'')+'/academy/?from=old#cabinet');}
});
test('Все скрипты платформы и CSS имеют одну версию и существуют в публикации',()=>{
 const doc=new JSDOM(fs.readFileSync(path.join(root,'academy/index.html'),'utf8')).window.document,self={};vm.runInNewContext(fs.readFileSync(path.join(root,'academy/offline-config.js'),'utf8'),{self});const {release,files}=self.SCM_OFFLINE_CONFIG;
 for(const node of doc.querySelectorAll('script[src],link[rel=stylesheet]')){const url=new URL(node.getAttribute('src')||node.getAttribute('href'),'https://example.test/academy/');assert.equal(url.searchParams.get('v'),release);assert.ok(fs.existsSync(path.join(root,url.pathname)));assert.ok(files.includes(url.pathname.replace('/academy/','')));}
 assert.match(doc.querySelector('#build-version').textContent,new RegExp(release));assert.ok(doc.querySelector('#assembly-entry'));assert.ok(doc.querySelector('#refresh-build'));
});
test('HTTP на публичном домене переключается на HTTPS, preview не перенаправляется на продакшен',()=>{
 const doc=new JSDOM(fs.readFileSync(path.join(root,'academy/index.html'),'utf8')).window.document,script=doc.querySelector('script:not([src])').textContent;
 for(const [hostname,expected]of [['scm-news.online',true],['www.scm-news.online',true],['localhost',false],['4173-preview.e2b.app',false]]){let target;vm.runInNewContext(script,{location:{protocol:'http:',hostname,href:'http://'+hostname+'/academy/#cabinet',replace:v=>target=v}});assert.equal(!!target,expected);if(expected)assert.equal(target,'https://'+hostname+'/academy/#cabinet');}
});
