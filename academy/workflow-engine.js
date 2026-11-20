'use strict';
/* Shared command model. Browser-local storage is not a security boundary.
   Server passes the authenticated actor and persists commands atomically. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SCMWorkflowEngine=factory();})(typeof self==='undefined'?globalThis:self,()=>{
 const roles={admin:'Администратор',admissions:'Приёмная комиссия',applicant:'Абитуриент',learner:'Слушатель',teacher:'Преподаватель',employer:'Работодатель',curator:'Куратор / методист',alumni:'Выпускник',auditor:'Аудитор',superadmin:'Суперадминистратор'};
 const staff=['admin','superadmin'];
 const schemas={
  application:{label:'Приём: заявки',creators:['applicant','admissions'],managers:['admissions'],states:{draft:'Черновик',submitted:'Подана',correction:'Нужны исправления',reviewed:'Проверена',enrolled:'Зачислен',rejected:'Отказ',withdrawn:'Отозвана'},initial:'draft',fields:['program','body'],flow:{draft:['submitted','withdrawn'],submitted:['correction','reviewed','rejected','withdrawn'],correction:['submitted','withdrawn'],reviewed:['enrolled','rejected','correction']}},
  enrollment:{label:'Учебные назначения',creators:['curator'],managers:['curator'],states:{active:'Обучается',completed:'Завершено',cancelled:'Отменено'},initial:'active',fields:['program','body','due'],flow:{active:['completed','cancelled']}},
  corporate:{label:'Корпоративные запросы',creators:['employer'],managers:['curator'],states:{requested:'Запрос получен',active:'Согласование',approved:'Согласовано',rejected:'Отклонено'},initial:'requested',fields:['program','body','due'],flow:{requested:['active','rejected'],active:['approved','rejected']}},
  task:{label:'Задания и проверка',creators:['teacher'],managers:['teacher'],states:{assigned:'Назначено',submitted:'На проверке',returned:'На доработке',accepted:'Принято'},initial:'assigned',fields:['body','due'],flow:{assigned:['submitted'],submitted:['returned','accepted'],returned:['submitted']}},
  support:{label:'Обращения и сопровождение',creators:['applicant','learner','alumni','teacher','curator','employer','admissions'],managers:['curator','admissions'],states:{open:'Открыто',active:'В работе',resolved:'Решено',closed:'Закрыто'},initial:'open',fields:['body','due'],flow:{open:['active'],active:['resolved'],resolved:['active','closed']}},
  session:{label:'Расписание и запись',creators:['teacher','curator'],managers:['curator','teacher'],states:{planned:'Запланировано',completed:'Проведено',cancelled:'Отменено'},initial:'planned',fields:['body','due'],flow:{planned:['completed','cancelled']}},
  credential:{label:'Внутренние подтверждения',creators:['curator','teacher'],managers:['curator'],states:{draft:'Проект',issued:'Внутренне выдано',revoked:'Отозвано'},initial:'draft',fields:['program','body'],flow:{draft:['issued'],issued:['revoked']}},
  cpd:{label:'Выпускник: CPD',creators:['alumni','learner'],managers:['curator'],states:{draft:'Черновик',submitted:'На рассмотрении',approved:'Подтверждено Академией',returned:'Нужны уточнения'},initial:'draft',fields:['body','due'],flow:{draft:['submitted'],submitted:['approved','returned'],returned:['submitted']}},
  job:{label:'Карьера: вакансии',creators:['employer'],managers:['curator'],states:{draft:'Черновик',published:'Опубликовано',closed:'Закрыто'},initial:'draft',fields:['body','due'],flow:{draft:['published'],published:['closed']}},
  organization:{label:'Организации',creators:[],managers:[],states:{active:'Активна',archived:'Архив'},initial:'active',fields:['body'],flow:{active:['archived']}},
  platform:{label:'Платформа: работы и инциденты',creators:['superadmin'],managers:['superadmin'],states:{open:'Открыто',active:'В работе',resolved:'Решено'},initial:'open',fields:['body','due'],flow:{open:['active'],active:['resolved'],resolved:['active']}}
 };
 const empty=()=>({version:1,revision:0,records:[],events:[],commands:[]});
 const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
 const privileged=a=>staff.includes(a?.role);
 const owns=(a,r)=>[r.ownerId,r.assigneeId,r.createdBy].includes(a.id);
 function visible(a,r){if(!a||!roles[a.role])return false;if(privileged(a)||a.role==='auditor')return true;if(r.type==='platform'||r.type==='organization')return false;
  if(r.type==='job'&&r.status==='published'&&['learner','alumni'].includes(a.role))return true;
  // Admissions work is academy-wide; all other staff see explicitly assigned records.
  return owns(a,r)||(a.role==='admissions'&&r.type==='application');
 }
 const canCreate=(a,type)=>Object.hasOwn(schemas,type)&&(privileged(a)||schemas[type].creators.includes(a?.role));
 function manager(a,r){return privileged(a)||(r.type==='application'&&a.role==='admissions')||(r.assigneeId===a.id&&schemas[r.type].managers.includes(a.role));}
 function transitions(a,r){if(!visible(a,r))return [];const next=schemas[r.type].flow[r.status]||[];return next.filter(to=>{
  if(privileged(a))return true;
  if(['application','cpd'].includes(r.type))return ['submitted','withdrawn'].includes(to)?a.id===r.ownerId:manager(a,r);
  if(r.type==='task')return to==='submitted'?a.id===r.ownerId:manager(a,r);
  if(r.type==='support'&&to==='closed')return a.id===r.ownerId||manager(a,r);
  if(r.type==='job'&&to==='closed')return a.id===r.ownerId||manager(a,r);
  return manager(a,r);
 });}
 const clean=(v,max=6000)=>String(v??'').normalize('NFKC').trim().slice(0,max);
 const canEdit=(a,r)=>a.role!=='auditor'&&visible(a,r)&&(!['completed','accepted','issued','revoked','published','enrolled','rejected','withdrawn','approved','archived','closed','cancelled'].includes(r.status))&&(privileged(a)||(r.ownerId===a.id&&['application','cpd','job'].includes(r.type)&&['draft','correction','returned'].includes(r.status)));
 function snapshot(data,a){
  const raw=data.records.filter(r=>visible(a,r));
  const ids=new Set(raw.filter(r=>!(r.type==='job'&&!owns(a,r)&&!privileged(a)&&a.role!=='auditor')).map(r=>r.id));
  const records=raw.map(r=>ids.has(r.id)?JSON.parse(JSON.stringify(r)):{...r,ownerId:'',assigneeId:'',createdBy:'',comments:[],bookings:[]});
  return {version:1,revision:data.revision,records,events:data.events.filter(e=>ids.has(e.recordId))};
 }
 function apply(data,actor,cmd,users,now=new Date().toISOString()){
  if(!actor||!roles[actor.role]||actor.role==='auditor')fail('Изменение недоступно.',403);
  if(!cmd||typeof cmd.key!=='string'||!/^[\w-]{8,100}$/.test(cmd.key))fail('Нужен идентификатор команды.');
  if(data.commands.some(c=>c.key===cmd.key&&c.actor===actor.id))return data;
  if(cmd.revision!==data.revision)fail('Данные обновлены в другом кабинете. Обновите список; введённый текст сохранён в форме.',409);
  const next=JSON.parse(JSON.stringify(data));let r;
  const person=id=>users.find(u=>u.id===id&&!u.disabled);
  if(cmd.action==='create'){
   const s=schemas[cmd.type];if(!canCreate(actor,cmd.type))fail('Создание недоступно.',403);
   const title=clean(cmd.title,240);if(!title)fail('Заполните название.');
   let ownerId=actor.id,assigneeId='';
   if(privileged(actor)||['teacher','curator','admissions'].includes(actor.role)){
    ownerId=clean(cmd.ownerId,100)||actor.id;assigneeId=clean(cmd.assigneeId,100)||(s.managers.includes(actor.role)?actor.id:'');
    if(!person(ownerId)||assigneeId&&!person(assigneeId))fail('Выберите существующего участника/ответственного.');
    if(assigneeId&&!s.managers.includes(person(assigneeId).role)&&!privileged(person(assigneeId)))fail('Роль ответственного не подходит для этого процесса.');
   }
   // Corporate orders belong to their creator until Academy assigns learners.
   if(['enrollment','task','credential'].includes(cmd.type)&&!person(ownerId))fail('Укажите участника.');
   const fields={};for(const key of s.fields)fields[key]=clean(cmd[key],key==='body'?6000:240);
   if(fields.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(fields.due)||!Number.isFinite(Date.parse(fields.due))||new Date(fields.due).toISOString().slice(0,10)!==fields.due))fail('Некорректная дата.');
   if(['application','enrollment','credential'].includes(cmd.type)&&!fields.program)fail('Укажите программу.');
   r={id:cmd.key,type:cmd.type,title,ownerId,assigneeId,createdBy:actor.id,status:s.initial,fields,version:1,createdAt:now,updatedAt:now,comments:[],bookings:[]};
   if(next.records.some(x=>x.id===r.id))fail('Идентификатор уже используется.',409);
   next.records.push(r);
  }else{
   r=next.records.find(x=>x.id===cmd.id);if(!r||!visible(actor,r))fail('Запись не найдена.',404);
   if(cmd.action==='transition'){
    if(!transitions(actor,r).includes(cmd.to))fail('Этот переход недоступен.',403);
    const reason=clean(cmd.body);if(!reason)fail('Укажите основание решения / ответ.');
    if(r.type==='task'&&['accepted','returned'].includes(cmd.to)&&!reason)fail('Нужен результат проверки.');
    r.status=cmd.to;r.comments.push({actor:actor.id,name:actor.name,body:reason,at:now});
    if(r.type==='application'&&cmd.to==='enrolled'){
     // Transactional creation; replay of the same command is a no-op.
     next.records.push({id:r.id+'-enrollment',type:'enrollment',title:r.title,ownerId:r.ownerId,assigneeId:'',createdBy:actor.id,status:'active',fields:{program:r.fields.program,body:'Основание: заявка '+r.id,due:''},version:1,createdAt:now,updatedAt:now,comments:[],bookings:[]});
    }
   }else if(cmd.action==='edit'){
    if(!canEdit(actor,r))fail('Редактирование недоступно.',403);
    const title=clean(cmd.title,240);if(!title)fail('Заполните название.');
    const fields={};for(const key of schemas[r.type].fields)fields[key]=clean(cmd[key],key==='body'?6000:240);
    if(fields.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(fields.due)||!Number.isFinite(Date.parse(fields.due))||new Date(fields.due).toISOString().slice(0,10)!==fields.due))fail('Некорректная дата.');
    if(['application','enrollment','credential'].includes(r.type)&&!fields.program)fail('Укажите программу.');
    // Keep the previous content in the audit event, not a destructive overwrite.
    r.title=title;r.fields=fields;
   }else if(cmd.action==='comment'){
    const text=clean(cmd.body);if(!text)fail('Введите текст.');if(r.type==='job'&&!owns(actor,r)&&!privileged(actor))fail('Отклики пока передаются через указанный контакт.',403);
    r.comments.push({actor:actor.id,name:actor.name,body:text,at:now});
   }else if(cmd.action==='assign'){
    if(!privileged(actor)&&!(actor.role==='admissions'&&r.type==='application'))fail('Назначение недоступно.',403);
    const u=person(cmd.assigneeId);if(!u||!schemas[r.type].managers.includes(u.role)&&!privileged(u))fail('Выберите ответственного с подходящей ролью.');r.assigneeId=u.id;
   }else if(cmd.action==='book'){
    if(r.type!=='session'||r.status!=='planned'||actor.id!==r.ownerId)fail('Запись недоступна.',403);
    if(r.bookings.includes(actor.id))r.bookings=r.bookings.filter(id=>id!==actor.id);else r.bookings.push(actor.id);
   }else fail('Неизвестная команда.');
   r.version++;r.updatedAt=now;
  }
  next.revision++;
  next.events.push({id:cmd.key,recordId:r.id,actor:actor.id,name:actor.name,action:cmd.action,to:cmd.to||'',at:now,version:r.version,previous:cmd.action==='edit'?JSON.parse(JSON.stringify(data.records.find(x=>x.id===r.id))):undefined});
  if(r.type==='application'&&cmd.to==='enrolled')next.events.push({id:cmd.key+'-enrollment',recordId:r.id+'-enrollment',actor:actor.id,name:actor.name,action:'create',to:'active',at:now,version:1});
  next.commands.push({key:cmd.key,actor:actor.id});return next;
 }
 return {roles,schemas,empty,privileged,visible,canCreate,canEdit,transitions,snapshot,apply};
});
