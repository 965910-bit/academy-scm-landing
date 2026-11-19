'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {promisify}=require('node:util'),{DatabaseSync}=require('node:sqlite');const scrypt=promisify(crypto.scrypt);
const roles=['admin','admissions','applicant','learner','teacher','employer'];
const normalize=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru');
const cleanName=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ');
const token=()=>crypto.randomBytes(32).toString('hex'),digest=s=>crypto.createHash('sha256').update(s).digest('hex');
async function hash(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex');}
async function verify(password,value){const [salt,hex]=value.split(':');const actual=await scrypt(password,salt,64),expected=Buffer.from(hex,'hex');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}
function createService({directory=process.env.DATA_DIR||path.resolve(__dirname,'../.academy-data'),secure=process.env.COOKIE_SECURE!=='0'}={}){
 fs.mkdirSync(directory,{recursive:true,mode:0o700});const db=new DatabaseSync(path.join(directory,'academy.sqlite'));try{fs.chmodSync(path.join(directory,'academy.sqlite'),0o600);}catch{}
 db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,login TEXT UNIQUE NOT NULL,role TEXT NOT NULL,password TEXT NOT NULL,must_change INTEGER NOT NULL DEFAULT 1,disabled INTEGER NOT NULL DEFAULT 0);CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY,body TEXT NOT NULL,revision INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT NOT NULL,actor TEXT,action TEXT,target TEXT);`);
 const audit=(actor,action,target)=>db.prepare('INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)').run(new Date().toISOString(),actor,action,target);
 const publicUser=u=>({id:u.id,name:u.name,role:u.role,mustChange:!!u.must_change,disabled:!!u.disabled});
 const mayManage=(actor,targetRole)=>actor.role==='admin'||(actor.role==='admissions'&&['applicant','learner'].includes(targetRole));
 async function createUser(actor,{name,role}){name=cleanName(name);if(!roles.includes(role)||!mayManage(actor,role))throw Object.assign(Error('Недостаточно прав для назначения этой роли.'),{status:403});if(name.length<5||name.length>160||!/^\p{L}[\p{L}\p{M} .’'\-]+$/u.test(name)||name.split(' ').length<2)throw Error('Укажите ФИО: минимум два слова, только буквы, пробел, дефис и апостроф.');const id=crypto.randomUUID(),password=crypto.randomBytes(18).toString('base64url'),encoded=await hash(password);try{db.prepare('INSERT INTO users(id,name,login,role,password) VALUES(?,?,?,?,?)').run(id,name,normalize(name),role,encoded);}catch(err){if(err.code?.includes('SQLITE'))throw Error('Такое ФИО уже используется. Добавьте различимый и согласованный вариант ФИО.');throw err;}audit(actor.id,'user.created',id);return {user:{id,name,role,mustChange:true},password};}
 async function bootstrap(name){if(db.prepare("SELECT id FROM users WHERE role='admin'").get())throw Error('Администратор уже существует.');return createUser({id:'bootstrap',role:'admin'},{name,role:'admin'});}
 let dummyHash;const attempts=new Map();
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 async function body(req){let result='';for await(const chunk of req){result+=chunk;if(Buffer.byteLength(result)>2*1024*1024)throw Object.assign(Error('Слишком большой запрос.'),{status:413});}try{return JSON.parse(result||'{}');}catch{throw Error('Некорректный JSON.');}}
 const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://internal');
 if(url.pathname.startsWith('/api/')){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){const origin=req.headers.origin;const expected=process.env.PUBLIC_ORIGIN;const host=req.headers['x-forwarded-host']||req.headers.host;if(!origin||(expected?origin!==expected:new URL(origin).host!==host))return send(res,403,{error:'Запрос с другого источника отклонён.'});if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'Требуется application/json.'});}
  const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('scm_session='))?.slice(12);
  const session=cookie?db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.disabled=0').get(digest(cookie),Date.now()):null;
  const input=req.method==='GET'?{}:await body(req);
  if(url.pathname==='/api/login'&&req.method==='POST'){
   if(typeof input.password!=='string'||input.password.length>256)return send(res,401,{error:'Неверное ФИО или пароль.'});
   const login=normalize(input.name).slice(0,200),ip=req.socket.remoteAddress,key=ip+'|'+login;
   for(const [k,v] of attempts)if(v.until<Date.now())attempts.delete(k);
   if(attempts.size>10000)return send(res,429,{error:'Повторите вход позже.'});
   for(const k of [key,ip]){const v=attempts.get(k);if(v&&v.count>=10)return send(res,429,{error:'Слишком много попыток. Повторите через 15 минут.'});}
   const u=db.prepare('SELECT * FROM users WHERE login=?').get(login);dummyHash ||= await hash(token());const good=await verify(input.password,u?.password||dummyHash);
   if(!u||u.disabled||!good){for(const k of [key,ip]){const v=attempts.get(k)||{count:0,until:Date.now()+900000};v.count++;attempts.set(k,v);}return send(res,401,{error:'Неверное ФИО или пароль.'});}
   attempts.delete(key);if(cookie)db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(cookie));db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());const value=token();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(value),u.id,Date.now()+8*3600000);res.setHeader('Set-Cookie',`scm_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure?'; Secure':''}`);audit(u.id,'session.login',u.id);return send(res,200,{user:publicUser(u)});
  }
  if(!session)return send(res,401,{error:'Войдите по ФИО и паролю.'});
  if(url.pathname==='/api/me'&&req.method==='GET')return send(res,200,{user:publicUser(session)});
  if(url.pathname==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(cookie));res.setHeader('Set-Cookie',`scm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure?'; Secure':''}`);return send(res,200,{ok:true});}
  if(url.pathname==='/api/password'&&req.method==='POST'){
   if(typeof input.current!=='string'||input.current.length>256||typeof input.password!=='string'||input.password.length<12||input.password.length>128||input.password===input.current)return send(res,400,{error:'Новый пароль: 12–128 символов, отличается от текущего.'});
   if(!await verify(input.current,session.password))return send(res,403,{error:'Текущий пароль неверен.'});const encoded=await hash(input.password);db.prepare('UPDATE users SET password=?,must_change=0 WHERE id=?').run(encoded,session.id);db.prepare('DELETE FROM sessions WHERE user_id=? AND hash<>?').run(session.id,digest(cookie));audit(session.id,'password.changed',session.id);return send(res,200,{ok:true});
  }
  if(session.must_change)return send(res,403,{error:'Сначала замените выданный пароль.'});
  if(url.pathname==='/api/users'&&req.method==='GET'){
   if(!['admin','admissions'].includes(session.role))return send(res,403,{error:'Недостаточно прав.'});const users=db.prepare('SELECT * FROM users ORDER BY name').all().filter(u=>mayManage(session,u.role));return send(res,200,{users:users.map(publicUser)});
  }
  if(url.pathname==='/api/users'&&req.method==='POST')return send(res,201,await createUser(session,input));
  if(url.pathname==='/api/users/reset'&&req.method==='POST'){
   const u=db.prepare('SELECT * FROM users WHERE id=?').get(input.id);if(!u||!mayManage(session,u.role)||u.id===session.id)return send(res,403,{error:'Сброс этого пароля недоступен.'});const password=crypto.randomBytes(18).toString('base64url');db.prepare('UPDATE users SET password=?,must_change=1 WHERE id=?').run(await hash(password),u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);audit(session.id,'password.reset',u.id);return send(res,200,{password,user:publicUser(u)});
  }
  if(url.pathname==='/api/users/disable'&&req.method==='POST'){
   const u=db.prepare('SELECT * FROM users WHERE id=?').get(input.id);if(!u||!mayManage(session,u.role)||u.id===session.id||u.role==='admin')return send(res,403,{error:'Блокировка недоступна.'});db.prepare('UPDATE users SET disabled=? WHERE id=?').run(input.disabled?1:0,u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);audit(session.id,'user.access',u.id);return send(res,200,{ok:true});
  }
  if(url.pathname==='/api/state'&&['GET','PUT'].includes(req.method)){
   const targetId=url.searchParams.get('user')||session.id;
   if(targetId!==session.id&&session.role!=='admin')return send(res,403,{error:'Чужой кабинет недоступен.'});
   if(!db.prepare('SELECT id FROM users WHERE id=?').get(targetId))return send(res,404,{error:'Учётная запись не найдена.'});
   const old=db.prepare('SELECT * FROM workspaces WHERE user_id=?').get(targetId);
   if(req.method==='GET'){if(targetId!==session.id)audit(session.id,'workspace.open',targetId);return send(res,200,{state:old?JSON.parse(old.body):null,revision:old?.revision||0});}
   if(!input.state||typeof input.state!=='object'||Array.isArray(input.state)||input.state.version!==1)return send(res,400,{error:'Некорректный формат рабочего пространства.'});
   if(input.revision!==(old?.revision||0))return send(res,409,{error:'Данные изменены в другой вкладке. Сохраните свой экспорт и перезагрузите кабинет.'});
   const revision=(old?.revision||0)+1;db.prepare('INSERT INTO workspaces VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET body=excluded.body,revision=excluded.revision').run(targetId,JSON.stringify(input.state),revision);audit(session.id,'workspace.saved',targetId);return send(res,200,{revision});
  }
  return send(res,404,{error:'Метод не найден.'});
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
 if(['/', '/login.html','/request-access.html','/reset-password.html'].includes(url.pathname)||url.pathname.startsWith('/dashboard')){res.writeHead(302,{Location:'/academy/'});return res.end();}
 let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}
 if(!(/^\/(academy\/|registry\/|images\/)/.test(pathname)||['/robots.txt','/sitemap.xml'].includes(pathname))||pathname.split('/').some(s=>s.startsWith('.')||['tests','node_modules'].includes(s))||/\.(?:cjs|jsonl|sqlite|md)$/.test(pathname)||/package(?:-lock)?\.json$/.test(pathname)){res.writeHead(404);return res.end();}
 const root=path.resolve(__dirname,'..');let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');}catch{res.writeHead(404);return res.end();}
 const ext=path.extname(file),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json','.xml':'application/xml','.txt':'text/plain; charset=utf-8'}[ext];if(!mime){res.writeHead(404);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"frame-ancestors 'self' https://arena.ai https://*.arena.ai https://*.e2b.app"});res.end(req.method==='HEAD'?undefined:data);});
 }catch(err){send(res,err.status||400,{error:err.status===500?'Ошибка сервера.':err.message||'Запрос отклонён.'});}});
 return {server,db,bootstrap,close(){server.close();db.close();}};
}
if(require.main===module){const service=createService();if(process.argv[2]==='bootstrap'){service.bootstrap(process.argv.slice(3).join(' ')).then(result=>{console.log('ФИО: '+result.user.name+'\nВременный пароль (показывается один раз): '+result.password);service.db.close();}).catch(err=>{console.error(err.message);service.db.close();process.exitCode=1;});}else service.server.listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Academy server listening on '+(process.env.PORT||4173)));}
module.exports={createService};
