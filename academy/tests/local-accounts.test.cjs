'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../identity.js'),'utf8');
function fixture(local=new Map(),session=new Map()){
 const dom=new JSDOM('<main></main>',{url:'https://example.test/academy/'}),w=dom.window;
 const store=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
 const location={hash:'',reload(){},href:''};const window={addEventListener(){}};
 vm.runInNewContext(source,{window,document:w.document,FormData:w.FormData,crypto:require('node:crypto').webcrypto,confirm:()=>true,localStorage:store(local),sessionStorage:store(session),location,fetch:async()=>({ok:false,json:async()=>({error:'Войдите'})})});
 const identity=window.SCMIdentity,render=()=>{w.document.querySelector('main').innerHTML=identity.render('admin','accounts')||'';};
 return {identity,w,local,session,render,location,close:()=>w.close()};
}
test('Локальные пользователи: создание, изменение роли, запрет дублей, восстановление и удаление',async()=>{
 const a=fixture();try{await a.identity.ready;await a.identity.login('Герасимов Дмитрий Сергеевич','');a.render();
 const submit=(selector,name,role)=>{const f=a.w.document.querySelector(selector);f.elements.name.value=name;f.elements.role.value=role;a.identity.submit(f,a.render);};
 submit('#local-account-create','Участник Первый Тестовый','learner');assert.equal(a.identity.users.length,2);const id=a.identity.users[1].id;
 submit('#local-account-create','Участник Первый Тестовый','teacher');assert.equal(a.identity.users.length,2);assert.match(a.w.document.querySelector('#identity-status').textContent,/уже существует/);
 submit('.local-account-edit','Участник Второй Тестовый','teacher');assert.equal(a.identity.users[1].role,'teacher');assert.match(a.w.document.querySelector('main').textContent,/Преподаватель/);
 a.identity.click({dataset:{localOpen:id}},a.render);
 const b=fixture(a.local,a.session);try{await b.identity.ready;assert.equal(b.identity.target.role,'teacher');b.identity.save({version:1,documents:['teacher-only']});b.identity.click({dataset:{localReturn:''}},b.render);}finally{b.close();}
 const c=fixture(a.local,a.session);try{await c.identity.ready;assert.equal(c.identity.target,null);assert.equal(c.identity.workspace,null);assert.equal(c.identity.users.length,2);c.identity.click({dataset:{localRemove:id}},c.render);assert.equal(c.identity.users.length,1);assert.equal(a.local.has('scm-academy-owner-workspace-v1-'+id),false);}finally{c.close();}
 }finally{a.close();}
});
test('Локальные пользователи: HTML в ФИО не исполняется',async()=>{
 const a=fixture();try{await a.identity.ready;await a.identity.login('Герасимов Дмитрий Сергеевич','');a.render();const f=a.w.document.querySelector('form');f.elements.name.value='<img src=x onerror=alert(1)>';f.elements.role.value='admin';a.identity.submit(f,a.render);assert.equal(a.w.document.querySelectorAll('img,script,[onerror]').length,0);}finally{a.close();}
});
