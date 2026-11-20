'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const E=require('../workflow-engine.js');
const users=Object.keys(E.roles).map(role=>({id:role,name:role,role}));
const user=role=>users.find(u=>u.id===role);
function fixture(){let state=E.empty();return {get state(){return state;},run(role,cmd){state=E.apply(state,user(role),{key:crypto.randomUUID(),revision:state.revision,...cmd},users);return state.records.at(-1);}};}
test('Десять ролей и полный маршрут заявления → исправление → зачисление без дубликата',()=>{
 assert.equal(Object.keys(E.roles).length,10);const f=fixture();const app=f.run('applicant',{action:'create',type:'application',title:'Поступление',program:'SCM'});
 f.run('applicant',{action:'transition',id:app.id,to:'submitted',body:'Прошу рассмотреть'});
 f.run('admissions',{action:'transition',id:app.id,to:'correction',body:'Уточните цель'});
 f.run('applicant',{action:'edit',id:app.id,title:'Обновлённая заявка',program:'SCM',body:'Цель уточнена'});
 f.run('applicant',{action:'transition',id:app.id,to:'submitted',body:'Исправлено'});
 f.run('admissions',{action:'transition',id:app.id,to:'reviewed',body:'Комплект проверен'});
 const cmd={key:crypto.randomUUID(),revision:f.state.revision,action:'transition',id:app.id,to:'enrolled',body:'Решение уполномоченного сотрудника'};
 const next=E.apply(f.state,user('admissions'),cmd,users),replay=E.apply(next,user('admissions'),cmd,users);
 assert.deepEqual(next,replay);assert.equal(next.records.filter(r=>r.type==='enrollment').length,1);assert.equal(next.events.filter(e=>e.recordId===app.id+'-enrollment').length,1);
 assert.equal(E.snapshot(next,user('applicant')).records.length,2);
 assert.ok(next.events.find(e=>e.action==='edit').previous);
});
test('Чужие заявки скрыты, самозачисление и произвольный переход запрещены',()=>{
 const f=fixture(),app=f.run('applicant',{action:'create',type:'application',title:'A',program:'SCM'});
 assert.equal(E.snapshot(f.state,user('learner')).records.length,0);
 assert.throws(()=>f.run('applicant',{action:'transition',id:app.id,to:'enrolled',body:'Сам'}),/недоступен/);
 assert.throws(()=>f.run('learner',{action:'comment',id:app.id,body:'Чужой'}),/не найдена/);
 assert.throws(()=>f.run('applicant',{action:'create',type:'credential',title:'X',program:'X'}),/недоступно/);
});
test('Преподаватель получает свою очередь, студент отвечает, оценку утверждает человек',()=>{
 const f=fixture(),task=f.run('teacher',{action:'create',type:'task',ownerId:'learner',title:'Запасы',body:'Решите кейс'});
 assert.equal(task.assigneeId,'teacher');
 assert.deepEqual(E.transitions(user('learner'),task),['submitted']);
 f.run('learner',{action:'transition',id:task.id,to:'submitted',body:'Ответ: 42'});
 assert.throws(()=>f.run('learner',{action:'transition',id:task.id,to:'accepted',body:'Самооценка'}),/недоступен/);
 f.run('teacher',{action:'transition',id:task.id,to:'returned',body:'Нужен расчёт'});
 f.run('learner',{action:'transition',id:task.id,to:'submitted',body:'Расчёт приложен текстом'});
 f.run('teacher',{action:'transition',id:task.id,to:'accepted',body:'Проверено по критериям'});
 assert.equal(f.state.records[0].status,'accepted');assert.equal(f.state.records[0].comments.length,4);
});
test('Аудитор читает историю, но не создаёт и не меняет предметные записи',()=>{
 const f=fixture();f.run('admin',{action:'create',type:'organization',title:'Компания'});
 assert.equal(E.snapshot(f.state,user('auditor')).events.length,1);
 for(const action of ['create','comment','transition','assign','edit','book'])assert.throws(()=>f.run('auditor',{action,type:'organization',id:f.state.records[0].id,title:'Нет'}),/недоступно/);
});
test('Конфликт ревизии не теряет данные; неправильная дата и ответственный отклоняются',()=>{
 const f=fixture();f.run('admin',{action:'create',type:'organization',title:'X'});
 assert.throws(()=>f.run('admin',{action:'create',type:'organization',title:'Y',revision:0}),e=>e.status===409);
 assert.throws(()=>f.run('teacher',{action:'create',type:'task',title:'Y',due:'2026-02-31'}),/дата/);
 assert.throws(()=>f.run('teacher',{action:'create',type:'task',title:'Y',assigneeId:'learner'}),/ответственного/);
 assert.equal(f.state.records.length,1);
});
test('Куратор сопровождает назначенные записи, подтверждение CPD не равно внешнему',()=>{
 const f=fixture(),r=f.run('alumni',{action:'create',type:'cpd',title:'Семинар',body:'4 часа, подтверждение у организатора'});
 assert.equal(E.snapshot(f.state,user('curator')).records.length,0);
 f.run('admin',{action:'assign',id:r.id,assigneeId:'curator'});
 f.run('alumni',{action:'transition',id:r.id,to:'submitted',body:'Прошу проверить'});
 f.run('curator',{action:'transition',id:r.id,to:'approved',body:'Академия проверила сведения'});
 assert.equal(f.state.records[0].status,'approved');assert.equal(E.schemas.cpd.states.approved,'Подтверждено Академией');
});
test('Публичная вакансия не раскрывает внутреннюю переписку, автора и события',()=>{
 const f=fixture(),r=f.run('employer',{action:'create',type:'job',title:'Планировщик',body:'Контакт работодателя'});
 f.run('employer',{action:'comment',id:r.id,body:'Внутренняя переписка'});
 f.run('admin',{action:'transition',id:r.id,to:'published',body:'Модерация'});
 const v=E.snapshot(f.state,user('alumni'));assert.equal(v.records.length,1);assert.deepEqual(v.records[0].comments,[]);assert.equal(v.records[0].createdBy,'');assert.equal(v.events.length,0);
 assert.throws(()=>f.run('alumni',{action:'comment',id:r.id,body:'Попытка'}),/контакт/);
});
test('Суперадминистратор управляет платформой, работодатель не читает её инциденты',()=>{
 const f=fixture(),r=f.run('superadmin',{action:'create',type:'platform',title:'Проверка восстановления'});
 f.run('superadmin',{action:'transition',id:r.id,to:'active',body:'Начали проверку'});
 assert.equal(E.snapshot(f.state,user('employer')).records.length,0);
});
test('Расписание: участник подтверждает и отменяет собственную запись',()=>{
 const f=fixture(),r=f.run('curator',{action:'create',type:'session',title:'Консультация',ownerId:'learner',due:'2026-12-01'});
 f.run('learner',{action:'book',id:r.id});assert.deepEqual(f.state.records[0].bookings,['learner']);
 f.run('learner',{action:'book',id:r.id});assert.deepEqual(f.state.records[0].bookings,[]);
});
