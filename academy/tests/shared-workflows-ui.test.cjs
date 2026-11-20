'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path');
const E=require('../workflow-engine.js');
const settle=()=>new Promise(r=>setImmediate(r));
async function setup(role='admin',saved){
 const dom=new JSDOM('<main></main>',{url:'https://academy.example/academy/',runScripts:'outside-only'}),w=dom.window;
 const users=Object.keys(E.roles).map(role=>({id:role,name:'Профиль '+role,role}));
 if(saved)w.localStorage.setItem('scm-academy-shared-workflows-v1',saved);
 const identity={local:true,user:users.find(u=>u.id===role),users},errors=[];
 for(const file of ['workflow-engine.js','workflow-ui.js'])w.eval(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
 let tool;const render=()=>w.document.querySelector('main').innerHTML=tool.render(role,'workflows');
 tool=w.SCMWorkflows.create({identity,render,toast:v=>errors.push(v),programs:[{title:'SCM'}]});render();await settle();
 const submit=(selector,values)=>{const f=w.document.querySelector(selector);assert.ok(f,selector);for(const [k,v]of Object.entries(values)){const field=f.elements.namedItem(k);assert.ok(field,k);field.value=v;}tool.submit(f);};
 return {dom,w,tool,identity,render,submit,errors,storage:()=>w.localStorage.getItem('scm-academy-shared-workflows-v1')};
}
test('UI: ручное создание, исправление, фильтр, сохранённый вид и XSS',async()=>{
 const x=await setup('applicant');try{
 x.submit('#workflow-create',{title:'<img src=x onerror=alert(1)>',body:'Учебная цель',program:'SCM'});await settle();
 assert.equal(x.w.document.querySelectorAll('.workflow-record').length,1);assert.equal(x.w.document.querySelector('.workflow-record img'),null);
 x.submit('.workflow-edit',{title:'Исправленное заявление',program:'SCM',body:'Уточнённая цель'});await settle();
 assert.equal(JSON.parse(x.storage()).records[0].title,'Исправленное заявление');
 x.submit('#workflow-filter',{q:'ничего-нет',section:'',status:'',from:'',until:''});assert.equal(x.w.document.querySelectorAll('.workflow-record').length,0);
 x.tool.click(x.w.document.querySelector('[data-workflow-save-view]'));x.tool.click(x.w.document.querySelector('[data-workflow-reset]'));assert.equal(x.w.document.querySelectorAll('.workflow-record').length,1);
 x.tool.click(x.w.document.querySelector('[data-workflow-load-view]'));assert.equal(x.w.document.querySelectorAll('.workflow-record').length,0);
 }finally{x.dom.window.close();}
});
test('UI: общая запись переходит между преподавателем и слушателем, аудит только чтение',async()=>{
 const teacher=await setup('teacher');let learner,auditor;
 try{
 teacher.submit('#workflow-create',{title:'Рассчитать запас',ownerId:'learner',assigneeId:'teacher',body:'Дайте расчёт'});await settle();
 learner=await setup('learner',teacher.storage());assert.equal(learner.w.document.querySelectorAll('.workflow-record').length,1);
 learner.submit('.workflow-command',{body:'Расчёт: 12',action:'submitted'});await settle();assert.equal(JSON.parse(learner.storage()).records[0].status,'submitted');
 auditor=await setup('auditor',learner.storage());assert.equal(auditor.w.document.querySelector('#workflow-create'),null);assert.equal(auditor.w.document.querySelector('.workflow-command'),null);assert.equal(auditor.w.document.querySelectorAll('.workflow-record').length,1);
 }finally{teacher.dom.window.close();learner?.dom.window.close();auditor?.dom.window.close();}
});
test('UI: конфликт не уничтожает введённый ответ и не выдаёт успех',async()=>{
 const x=await setup('applicant');try{
 x.submit('#workflow-create',{title:'Заявка',program:'SCM'});await settle();
 const newer=JSON.parse(x.storage());newer.revision++;x.w.localStorage.setItem('scm-academy-shared-workflows-v1',JSON.stringify(newer));
 x.submit('.workflow-command',{body:'Сохранить мой ответ',action:'submitted'});await settle();
 assert.match(x.w.document.querySelector('#workflow-status').textContent,/другом кабинете/);
 assert.equal(x.w.document.querySelector('.workflow-command textarea').value,'Сохранить мой ответ');assert.equal(JSON.parse(x.storage()).records[0].status,'draft');
 }finally{x.dom.window.close();}
});
