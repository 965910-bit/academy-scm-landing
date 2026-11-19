'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../identity.js'),'utf8');
test('Вход объясняет ответ HTML от статического хостинга вместо ошибки JSON',async()=>{
 const window={addEventListener(){}};
 vm.runInNewContext(source,{window,fetch:async()=>({ok:false,json:async()=>{throw new SyntaxError('Unexpected token <');}})});
 await window.SCMIdentity.ready;
 await assert.rejects(()=>window.SCMIdentity.login('Тестовый Пользователь','not-a-real-password'),/Сервер авторизации недоступен: \/api\//);
});
test('Вход сохраняет сообщение API о неверных реквизитах',async()=>{
 const window={addEventListener(){}};
 vm.runInNewContext(source,{window,fetch:async()=>({ok:false,json:async()=>({error:'Неверное ФИО или пароль.'})})});
 await window.SCMIdentity.ready;
 await assert.rejects(()=>window.SCMIdentity.login('Тестовый Пользователь','not-a-real-password'),/Неверное ФИО или пароль/);
});

test('Вход владельца по ФИО не вызывает API, сохраняет отдельно и восстанавливается',async()=>{
 const local=new Map(),session=new Map(),localStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 const create=()=>{const window={addEventListener(){}};let calls=0;vm.runInNewContext(source,{window,localStorage,sessionStorage,location:{},fetch:async()=>{calls++;return {ok:false,json:async()=>({error:'Войдите'})};}});return {identity:window.SCMIdentity,count:()=>calls};};
 const first=create();await first.identity.ready;const count=first.count();const user=await first.identity.login('  ГЕРАСИМОВ  Дмитрий Сергеевич  ','');assert.equal(user.role,'admin');assert.equal(first.count(),count);assert.equal(first.identity.local,true);
 assert.equal(first.identity.save({version:1,documentDrafts:[{id:'one'}]}),true);
 const second=create();await second.identity.ready;assert.equal(second.count(),0);assert.equal(second.identity.workspace.documentDrafts[0].id,'one');await second.identity.logout();
 const third=create();await third.identity.ready;assert.equal(third.identity.user,null);
});
