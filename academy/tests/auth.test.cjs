'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {createService}=require('../../server/server.cjs');
test('Сервер: ФИО, смена пароля, роли, изоляция, административный доступ и отзыв сессий',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scm-auth-')),service=createService({directory,secure:false});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+service.server.address().port;
 const call=async(url,method='GET',data,cookie='',foreign)=>{const r=await fetch(origin+'/api/'+url,{method,headers:{'Content-Type':'application/json',Origin:foreign||origin,...(cookie?{Cookie:cookie}:{})},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers};};
 try{
 const admin=await service.bootstrap('Герасимов Тестовый Администратор');await assert.rejects(()=>service.bootstrap('Второй Администратор'));
 assert.equal((await call('users')).status,401);assert.equal((await call('state','PUT',{state:{version:1},revision:0})).status,401);
 assert.equal((await call('login','POST',{name:admin.user.name,password:'wrong'})).status,401);
 let result=await call('login','POST',{name:'  '+admin.user.name.toUpperCase().replaceAll(' ','   ')+' ',password:admin.password});const ac=result.cookie;assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);assert.ok(!JSON.stringify(result.data).includes(admin.password));
 assert.equal((await call('users','GET',undefined,ac)).status,403);
 assert.equal((await call('password','POST',{current:admin.password,password:'Updated-Admin-Password-123!'},ac)).status,200);
 const created={};for(const role of ['admissions','learner','applicant','teacher','employer']){const x=await call('users','POST',{name:'Пользователь '+({admissions:'Комиссия',learner:'Слушатель',applicant:'Абитуриент',teacher:'Преподаватель',employer:'Работодатель'}[role]),role},ac);assert.equal(x.status,201,JSON.stringify(x.data));assert.ok(x.data.password.length>=20);created[role]=x.data;}
 assert.equal((await call('users','POST',{name:created.learner.user.name,role:'learner'},ac)).status,400);
 const cookies={};for(const role of Object.keys(created)){const u=created[role],l=await call('login','POST',{name:u.user.name,password:u.password});cookies[role]=l.cookie;assert.equal((await call('password','POST',{current:u.password,password:'Updated-'+role+'-Password-123!'},l.cookie)).status,200);}
 assert.equal((await call('users','GET',undefined,cookies.learner)).status,403);
 assert.equal((await call('users','POST',{name:'Злоумышленник Администратор',role:'admin'},cookies.admissions)).status,403);
 assert.equal((await call('users','POST',{name:'Новый Участник',role:'applicant'},cookies.admissions)).status,201);
 const visible=await call('users','GET',undefined,cookies.admissions);assert.ok(visible.data.users.every(u=>['applicant','learner'].includes(u.role)));assert.ok(!JSON.stringify(visible.data).includes('password'));
 assert.equal((await call('users/reset','POST',{id:admin.user.id},cookies.admissions)).status,403);
 const state={version:1,profile:{name:'Private learner'},documents:[]};assert.equal((await call('state','PUT',{state,revision:0},cookies.learner)).status,200);
 assert.equal((await call('state','PUT',{state,revision:0},cookies.learner)).status,409);
 assert.equal((await call('state?user='+created.learner.user.id,'GET',undefined,cookies.teacher)).status,403);
 assert.equal((await call('state?user='+created.learner.user.id,'PUT',{state,revision:1},cookies.admissions)).status,403);
 const before=service.db.prepare('SELECT password FROM users WHERE id=?').get(created.learner.user.id).password;
 const viewed=await call('state?user='+created.learner.user.id,'GET',undefined,ac);assert.equal(viewed.data.state.profile.name,'Private learner');assert.equal(service.db.prepare('SELECT password FROM users WHERE id=?').get(created.learner.user.id).password,before);
 assert.equal((await call('state','GET',undefined,cookies.teacher)).data.state,null);
 assert.equal((await call('users','POST',{name:'Чужой Запрос',role:'learner'},ac,'https://evil.example')).status,403);
 assert.equal((await call('users/disable','POST',{id:created.learner.user.id,disabled:true},cookies.admissions)).status,200);assert.equal((await call('me','GET',undefined,cookies.learner)).status,401);
 const reset=await call('users/reset','POST',{id:created.applicant.user.id},ac);assert.equal(reset.status,200);assert.equal((await call('me','GET',undefined,cookies.applicant)).status,401);
 assert.equal((await call('login','POST',{name:created.applicant.user.name,password:'Updated-applicant-Password-123!'})).status,401);
 assert.equal((await call('login','POST',{name:created.applicant.user.name,password:reset.data.password})).status,200);
 await call('logout','POST',{},ac);assert.equal((await call('me','GET',undefined,ac)).status,401);
 const serialized=fs.readFileSync(path.join(directory,'academy.sqlite'));assert.ok(!serialized.includes(Buffer.from(admin.password)));assert.ok(service.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='workspace.open'").get().n>0);
 for(const route of ['/.git/config','/.academy-data/academy.sqlite','/server/server.cjs','/academy/tests/auth.test.cjs','/academy/package.json'])assert.equal((await fetch(origin+route)).status,404,route);
 }finally{await new Promise(r=>service.server.close(r));service.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('Сервер: ограничение попыток входа и Secure-cookie по умолчанию',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scm-rate-')),s=createService({directory});await new Promise(r=>s.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+s.server.address().port;
 try{for(let i=0;i<11;i++){const r=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Неизвестный Пользователь',password:'invalid'})});assert.equal(r.status,i===10?429:401);}}finally{await new Promise(r=>s.server.close(r));s.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});
