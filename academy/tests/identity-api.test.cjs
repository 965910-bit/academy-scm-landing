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
