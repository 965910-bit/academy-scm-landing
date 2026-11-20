const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function worker(){
 const handlers={},matches=[];
 const scope={self:{registration:{scope:'https://example.test/academy/'},addEventListener:(n,cb)=>{handlers[n]=cb;}},URL,Response,
 caches:{match:async (url)=>{matches.push(url);return 'cached-shell';}},fetch:async()=>{throw new Error('offline')}};
 scope.importScripts=()=>vm.runInNewContext(fs.readFileSync(path.join(root,'offline-config.js'),'utf8'),scope);
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),scope);
 return {handlers,matches};
}
test('Worker serves the public shell for hash-addressed cabinets while offline',async()=>{
 const w=worker();let response;
 w.handlers.fetch({request:{method:'GET',url:'https://example.test/academy/#cabinet'},respondWith:p=>{response=p;}});
 assert.equal(await response,'cached-shell');assert.deepEqual(w.matches,['https://example.test/academy/']);
});
test('Worker does not intercept private files, query URLs, writes or other origins',()=>{
 const w=worker();let called=0;
 for(const [method,url] of [['GET','https://example.test/academy/private/passport.pdf'],['GET','https://example.test/academy/?token=secret'],['POST','https://example.test/academy/'],['GET','https://other.test/academy/']]){
   w.handlers.fetch({request:{method,url},respondWith:()=>called++});
 }
 assert.equal(called,0);
});

test('Worker serves release-versioned JS offline but never arbitrary query parameters',async()=>{
 const self={};vm.runInNewContext(fs.readFileSync(path.join(root,'offline-config.js'),'utf8'),{self});const release=self.SCM_OFFLINE_CONFIG.release;
 const w=worker();let response;w.handlers.fetch({request:{method:'GET',url:'https://example.test/academy/assembly.js?v='+release},respondWith:p=>{response=p;}});assert.equal(await response,'cached-shell');assert.equal(w.matches[0],'https://example.test/academy/assembly.js');
 let calls=0;for(const query of ['v=obsolete','v='+release+'&token=secret','token=secret'])w.handlers.fetch({request:{method:'GET',url:'https://example.test/academy/assembly.js?'+query},respondWith:()=>calls++});assert.equal(calls,0);
});
