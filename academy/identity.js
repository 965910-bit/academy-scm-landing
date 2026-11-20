'use strict';
window.SCMIdentity=(()=>{
 const api=async(url,method='GET',data)=>{const response=await fetch('/api/'+url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});let value;try{value=await response.json();}catch{throw Error('Сервер авторизации недоступен: /api/ вернул страницу вместо данных. Откройте сайт через сервер Академии; для опубликованного домена настройте проксирование /api/ на Node.js.');}if(!response.ok)throw Error(value.error||'Сервис недоступен.');return value;};
 const labels={admin:'Администратор',admissions:'Приёмная комиссия',applicant:'Абитуриент',learner:'Слушатель',teacher:'Преподаватель',employer:'Работодатель',curator:'Куратор / методист',alumni:'Выпускник',auditor:'Аудитор',superadmin:'Суперадминистратор'};
 const identity={remote:true,user:null,workspace:null,revision:0,users:[],target:null,error:'',queue:Promise.resolve(),saving:false};
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ownerName='Герасимов Дмитрий Сергеевич';
 const normalName=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru');
 const localKey='scm-academy-owner-workspace-v1',sessionKey='scm-academy-owner-session-v1';
 const accountsKey='scm-academy-local-accounts-v1',targetKey='scm-academy-local-target-v1';
 const owner=()=>({id:'browser-owner',name:ownerName,role:'admin',mustChange:false});
 function readAccounts(){const raw=JSON.parse(localStorage.getItem(accountsKey)||'[]');return Array.isArray(raw)?raw.filter(u=>u&&u.id!=='browser-owner'&&labels[u.role]&&typeof u.name==='string'):[];}
 function writeAccounts(users){localStorage.setItem(accountsKey,JSON.stringify(users));identity.users=[owner(),...users];}
 function workspaceKey(){return identity.target?localKey+'-'+identity.target.id:localKey;}
 function openLocal(){
  identity.local=true;identity.remote=false;identity.user=owner();identity.users=[owner(),...readAccounts()];
  identity.target=identity.users.find(u=>u.id===sessionStorage.getItem(targetKey)&&u.id!=='browser-owner')||null;
  identity.workspace=null;const raw=localStorage.getItem(workspaceKey());if(raw)identity.workspace=JSON.parse(raw);
 }
 function localAccounts(){return `<section class="panel"><span class="eyebrow">УПРАВЛЕНИЕ ПЛАТФОРМОЙ</span><h1>Пользователи и права</h1><p>Создавайте профили, назначайте роли и открывайте кабинеты. Профили сохраняются на этом устройстве; это не выдача серверных учётных записей.</p><form id="local-account-create"><label>Фамилия, имя, отчество<input name="name" required minlength="5" maxlength="160"></label><label>Роль<select name="role">${Object.entries(labels).map(([r,label])=>`<option value="${r}" ${r==='applicant'?'selected':''}>${label}</option>`).join('')}</select></label><button class="button">Создать профиль</button></form><p id="identity-status" role="status"></p></section><section class="panel"><h2>Профили — ${identity.users.length}</h2>${identity.users.map(u=>`<article class="decision-record"><h3>${e(u.name)}</h3><p>${e(labels[u.role])}${u.id==='browser-owner'?' · Владелец платформы':''}</p>${u.id==='browser-owner'?'':`<form class="local-account-edit" data-id="${e(u.id)}"><label>ФИО<input name="name" required minlength="5" maxlength="160" value="${e(u.name)}"></label><label>Роль<select name="role">${Object.entries(labels).map(([r,label])=>`<option value="${r}" ${r===u.role?'selected':''}>${label}</option>`).join('')}</select></label><button class="button outline small">Сохранить изменения</button></form><div class="actions"><button class="button small" data-local-open="${e(u.id)}">Открыть кабинет</button><button class="button outline small" data-local-remove="${e(u.id)}">Удалить профиль</button></div>`}</article>`).join('')}</section>`;}
 async function load(){if(typeof sessionStorage!=='undefined'&&sessionStorage.getItem(sessionKey)==='1'){openLocal();return;}identity.user=(await api('me')).user;identity.target=null;if(identity.user.mustChange)return;
 if(['admin','superadmin','admissions'].includes(identity.user.role))identity.users=(await api('users')).users;
 const selected=sessionStorage.getItem('scm-workspace-target');if(['admin','superadmin'].includes(identity.user.role)&&selected)identity.target=identity.users.find(u=>u.id===selected)||null;
 const value=await api('state'+(identity.target?'?user='+encodeURIComponent(identity.target.id):''));identity.workspace=value.state;identity.revision=value.revision;
 }
 identity.ready=load().catch(()=>{identity.user=null;identity.workspace=null;});
 identity.login=async(name,password,otp)=>{if(normalName(name)===normalName(ownerName)&&!password){sessionStorage.setItem(sessionKey,'1');try{openLocal();}catch(err){sessionStorage.removeItem(sessionKey);throw err;}return identity.user;}await api('login','POST',{name,password,otp});await load();return identity.user;};
 identity.logout=async()=>{if(identity.local){sessionStorage.removeItem(sessionKey);sessionStorage.removeItem(targetKey);identity.user=null;identity.workspace=null;location.href='/academy/';return;}await identity.queue;if(identity.error&&!confirm('Есть несохранённые изменения. Сначала рекомендуется экспорт. Выйти без сохранения?'))return;await api('logout','POST',{});sessionStorage.removeItem('scm-workspace-target');location.href='/academy/';};
 identity.save=state=>{
 if(identity.local){try{localStorage.setItem(workspaceKey(),JSON.stringify(state));identity.workspace=state;return true;}catch{throw Error('Не удалось сохранить в браузере. Сделайте экспорт рабочего пространства.');}}
 if(!identity.user||identity.user.mustChange)return false;
 const snapshot=JSON.parse(JSON.stringify(state));identity.saving=true;const status=document.querySelector('#workspace-sync');if(status)status.textContent='Изменения ожидают подтверждения сервера.';
 identity.queue=identity.queue.then(async()=>{if(identity.error)throw Error(identity.error);const r=await api('state'+(identity.target?'?user='+encodeURIComponent(identity.target.id):''),'PUT',{state:snapshot,revision:identity.revision});identity.revision=r.revision;const status=document.querySelector('#workspace-sync');if(status)status.textContent='Изменения сохранены на сервере.';}).catch(err=>{identity.error=err.message;const status=document.querySelector('#workspace-sync');if(status)status.textContent='Не сохранено: '+err.message+' Сделайте экспорт перед перезагрузкой.';const el=document.querySelector('#toast');if(el){el.textContent='Не сохранено на сервере: '+err.message;el.style.display='block';}}).finally(()=>{identity.saving=false;});return true;
 };
 identity.render=(role,tab)=>{
 if(!identity.user)return null;
 if(identity.local){if(tab!=='accounts')return null;return localAccounts();}
 if(identity.user.mustChange)return `<section class="panel"><h1>Замените выданный пароль</h1><p>Первый вход: установите свой пароль. Выданный пароль не должен использоваться постоянно.</p><form id="identity-password" method="post"><label>Выданный / текущий пароль<input name="current" type="password" autocomplete="current-password" required maxlength="256"></label><label>Новый пароль — минимум 12 символов<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128"></label><button class="button">Сохранить новый пароль</button></form><p id="identity-status" role="status"></p></section>`;
 if(tab!=='accounts')return null;
 if(!['admin','superadmin','admissions'].includes(identity.user.role))return '<p>Недостаточно прав.</p>';
 return `<section class="panel"><span class="eyebrow">ДОСТУП И УЧЁТНЫЕ ЗАПИСИ</span><h1>${role==='admissions'?'Приёмная комиссия':'Пользователи и права'}</h1><p>Логин — полное ФИО. Пробелы и регистр нормализуются. Совпадающие ФИО нужно различить согласованным вариантом, а не создавать неоднозначный вход.</p><form id="identity-create" method="post"><label>Фамилия, имя, отчество<input name="name" required minlength="5" maxlength="160" autocomplete="off"></label><label>Роль<select name="role">${Object.entries(labels).filter(([r])=>['admin','superadmin'].includes(identity.user.role)||['applicant','learner'].includes(r)).map(([r,label])=>`<option value="${r}" ${r==='applicant'?'selected':''}>${label}</option>`).join('')}</select></label><button class="button">Создать и сгенерировать пароль</button></form><p id="identity-status" role="status"></p><div id="identity-secret" class="warning" hidden></div></section><section class="panel"><h2>Учётные записи</h2><p>Пароли не хранятся в открытом виде. Новый временный пароль показывается один раз; передавайте его владельцу по отдельному защищённому каналу.</p>${identity.users.map(u=>`<article class="decision-record"><h3>${e(u.name)}</h3><p>${e(labels[u.role])} · ${u.disabled?'Доступ заблокирован':u.mustChange?'Ожидает смены пароля':'Доступ открыт'}</p>${u.id!==identity.user.id?`<button class="button outline small" data-identity-reset="${u.id}">Новый временный пароль</button>`:''}${u.id!==identity.user.id&&u.role!=='admin'?`<button class="button outline small" data-identity-disable="${u.id}" data-disabled="${u.disabled?'0':'1'}">${u.disabled?'Разблокировать':'Заблокировать'}</button>`:''}${['admin','superadmin'].includes(identity.user.role)?`<button class="button small" data-identity-open="${u.id}">Открыть кабинет без смены пароля</button>`:''}</article>`).join('')}</section>`;
 };
 const message=text=>{const el=document.querySelector('#identity-status');if(el)el.textContent=text;};
 const secret=result=>{const box=document.querySelector('#identity-secret');if(!box)return;box.hidden=false;box.replaceChildren();const p=document.createElement('p');p.textContent='ФИО: '+result.user.name+' · Временный пароль показывается только сейчас.';const input=document.createElement('input');input.readOnly=true;input.value=result.password;input.setAttribute('aria-label','Сгенерированный временный пароль');input.autocomplete='off';box.append(p,input);};
 identity.submit=(form,render)=>{
 if(identity.local&&(form.id==='local-account-create'||form.classList.contains('local-account-edit'))){
  try{const data=Object.fromEntries(new FormData(form)),name=String(data.name||'').normalize('NFKC').trim().replace(/\s+/g,' '),role=data.role,id=form.dataset.id;
   if(name.length<5||name.length>160||!labels[role])throw Error('Укажите ФИО и выберите роль.');
   const users=readAccounts();if(normalName(name)===normalName(ownerName)||users.some(u=>u.id!==id&&normalName(u.name)===normalName(name)))throw Error('Профиль с таким ФИО уже существует.');
   if(id){const user=users.find(u=>u.id===id);if(!user)throw Error('Профиль не найден.');user.name=name;user.role=role;}
   else users.push({id:crypto.randomUUID(),name,role,mustChange:false});
   writeAccounts(users);render();message(id?'Изменения сохранены.':'Профиль создан.');
  }catch(err){message(err.message);}return true;
 }

 if(!['identity-create','identity-password'].includes(form.id))return false;
 const data=Object.fromEntries(new FormData(form));const button=form.querySelector('button');button.disabled=true;message('Выполняем…');
 (async()=>{try{if(form.id==='identity-password'){await api('password','POST',data);location.reload();return;}const result=await api('users','POST',data);identity.users=(await api('users')).users;render();secret(result);}catch(err){message(err.message);}finally{button.disabled=false;}})();return true;
 };
 identity.click=(t,render)=>{
 if(identity.local){
  if(t.dataset.localOpen){if(!readAccounts().some(u=>u.id===t.dataset.localOpen))return true;sessionStorage.setItem(targetKey,t.dataset.localOpen);location.hash='cabinet';location.reload();return true;}
  if(t.dataset.localReturn!==undefined){sessionStorage.removeItem(targetKey);location.hash='cabinet';location.reload();return true;}
  if(t.dataset.localRemove){const id=t.dataset.localRemove;if(!readAccounts().some(u=>u.id===id))return true;if(!confirm('Удалить профиль и его рабочее пространство с этого устройства?'))return true;
   try{writeAccounts(readAccounts().filter(u=>u.id!==id));localStorage.removeItem(localKey+'-'+id);render();message('Профиль удалён.');}catch(err){message(err.message);}return true;}
 }

 if(t.dataset.identityReturn!==undefined){sessionStorage.removeItem('scm-workspace-target');location.hash='cabinet';location.reload();return true;}
 if(t.dataset.identityOpen){sessionStorage.setItem('scm-workspace-target',t.dataset.identityOpen);location.hash='cabinet';location.reload();return true;}
 const id=t.dataset.identityReset||t.dataset.identityDisable;if(!id)return false;
 if(!confirm(t.dataset.identityReset?'Сгенерировать новый пароль? Все сессии пользователя завершатся.':'Изменить доступ пользователя? Его сессии завершатся.'))return true;
 t.disabled=true;(async()=>{try{const result=await api(t.dataset.identityReset?'users/reset':'users/disable','POST',{id,disabled:t.dataset.disabled==='1'});identity.users=(await api('users')).users;render();if(result.password)secret(result);}catch(err){message(err.message);}finally{t.disabled=false;}})();return true;
 };
 identity.banner=()=>identity.local?(identity.target?`<div class="warning">Кабинет: ${e(identity.target.name)} · ${e(labels[identity.target.role])}. <button class="button outline small" data-local-return>Вернуться к управлению</button></div>`:'')+'<p id="workspace-sync" role="status">Рабочее пространство этого браузера · изменения сохраняются на этом устройстве. Для переноса используйте экспорт. Не храните здесь персональные данные других людей.</p>':`<p id="workspace-sync" role="status">${e(identity.error?'Не сохранено: '+identity.error:identity.saving?'Ожидает подтверждения сервера.':'Рабочее пространство учётной записи.')}</p>`+(identity.target?`<div class="warning">Администратор: кабинет ${e(identity.target.name)}. Пароль владельца не изменён. Действия записываются с вашим идентификатором. <button data-identity-return>Вернуться к администрированию</button></div>`:'');
 window.addEventListener('beforeunload',event=>{if(identity.saving||identity.error){event.preventDefault();event.returnValue='Изменения ещё не сохранены на сервере.';}});
 return identity;
})();
