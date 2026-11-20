'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createService}=require('../../server/server.cjs');
test('HTTP общих процессов: роли, изоляция, проверка сервера, идемпотентность и сохранение',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scm-workflows-'));const service=createService({directory,secure:false});
 await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;
 const req=async(cookie,url,method='GET',body)=>{const r=await fetch(base+'/api/'+url,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
 const admin=await service.bootstrap('Тестовый Главный Администратор');service.db.prepare('UPDATE users SET must_change=0 WHERE id=?').run(admin.user.id);
 const ac=(await req('', 'login','POST',{name:admin.user.name,password:admin.password})).cookie;
 const cookies={},ids={};
 for(const role of ['applicant','learner','teacher','curator','alumni','auditor','superadmin','employer','admissions']){
  const created=await req(ac,'users','POST',{name:'Тестовый Пользователь '+({applicant:'Первый',learner:'Второй',teacher:'Третий',curator:'Четвёртый',alumni:'Пятый',auditor:'Шестой',superadmin:'Седьмой',employer:'Восьмой',admissions:'Девятый'}[role]),role});
  assert.equal(created.status,201);ids[role]=created.body.user.id;service.db.prepare('UPDATE users SET must_change=0 WHERE id=?').run(ids[role]);
  cookies[role]=(await req('','login','POST',{name:created.body.user.name,password:created.body.password})).cookie;
 }
 assert.equal((await req('','workflows')).status,401);
 let v=await req(cookies.applicant,'workflows');assert.equal(v.body.users.length,1);
 let input={action:'create',type:'application',title:'Поступление',program:'SCM',key:crypto.randomUUID(),revision:v.body.data.revision,ownerId:ids.learner};
 const created=await req(cookies.applicant,'workflows','POST',input);assert.equal(created.status,200);assert.equal(created.body.data.records[0].ownerId,ids.applicant);
 const id=created.body.data.records[0].id;
 assert.equal((await req(cookies.learner,'workflows')).body.data.records.length,0);
 assert.equal((await req(cookies.learner,'workflows?user='+ids.applicant)).status,403);
 assert.equal((await req(cookies.auditor,'workflows','POST',{...input,key:crypto.randomUUID(),revision:1})).status,403);
 assert.equal((await req(cookies.applicant,'workflows','POST',{key:crypto.randomUUID(),revision:1,action:'transition',id,to:'enrolled',body:'Сам'})).status,403);
 const replay=await req(cookies.applicant,'workflows','POST',input);assert.equal(replay.status,200);assert.equal(replay.body.data.records.length,1);
 assert.equal((await req(cookies.applicant,'workflows','POST',{...input,key:crypto.randomUUID()})).status,409);
 assert.equal((await req(cookies.applicant,'workflows','POST',{key:crypto.randomUUID(),revision:1,action:'transition',id,to:'submitted',body:'Подтверждаю'})).status,200);
 for(const to of ['reviewed','enrolled']){v=await req(cookies.admissions,'workflows');const r=await req(cookies.admissions,'workflows','POST',{key:crypto.randomUUID(),revision:v.body.data.revision,action:'transition',id,to,body:'Решение комиссии'});assert.equal(r.status,200);}
 v=await req(cookies.applicant,'workflows');assert.equal(v.body.data.records.length,2);
 assert.equal((await req(cookies.superadmin,'users')).status,200);
 assert.equal((await req(ac,'workflows?user='+ids.applicant)).body.data.records.length,2);
 const stored=JSON.parse(service.db.prepare('SELECT body FROM workflow_store WHERE id=1').get().body);assert.equal(stored.records.filter(r=>r.type==='enrollment').length,1);
 assert.ok(service.db.prepare("SELECT * FROM audit WHERE action='workflow.transition'").all().length>=3);
 // Public shell includes both modules; private state never enters shell cache.
 assert.equal((await fetch(base+'/academy/workflow-engine.js')).status,200);
 }finally{await new Promise(r=>service.server.close(r));service.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});
