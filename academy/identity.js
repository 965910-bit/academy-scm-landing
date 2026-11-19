'use strict';
window.SCMIdentity=(()=>{
 const api=async(url,method='GET',data)=>{const response=await fetch('/api/'+url,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const value=await response.json();if(!response.ok)throw Error(value.error||'Сервис недоступен.');return value;};
 const labels={admin:'Администратор',admissions:'Приёмная комиссия',applicant:'Абитуриент',learner:'Слушатель',teacher:'Преподаватель',employer:'Работодатель'};
 const identity={remote:true,user:null,workspace:null,revision:0,users:[],target:null,error:'',queue:Promise.resolve(),saving:false};
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function load(){identity.user=(await api('me')).user;identity.target=null;if(identity.user.mustChange)return;
 if(['admin','admissions'].includes(identity.user.role))identity.users=(await api('users')).users;
 const selected=sessionStorage.getItem('scm-workspace-target');if(identity.user.role==='admin'&&selected)identity.target=identity.users.find(u=>u.id===selected)||null;
 const value=await api('state'+(identity.target?'?user='+encodeURIComponent(identity.target.id):''));identity.workspace=value.state;identity.revision=value.revision;
 }
 identity.ready=load().catch(()=>{identity.user=null;identity.workspace=null;});
 identity.login=async(name,password)=>{await api('login','POST',{name,password});await load();return identity.user;};
 identity.logout=async()=>{await identity.queue;if(identity.error&&!confirm('Есть несохранённые изменения. Сначала рекомендуется экспорт. Выйти без сохранения?'))return;await api('logout','POST',{});sessionStorage.removeItem('scm-workspace-target');location.href='/academy/';};
 identity.save=state=>{
 if(!identity.user||identity.user.mustChange)return false;
 const snapshot=JSON.parse(JSON.stringify(state));identity.saving=true;const status=document.querySelector('#workspace-sync');if(status)status.textContent='Изменения ожидают подтверждения сервера.';
 identity.queue=identity.queue.then(async()=>{if(identity.error)throw Error(identity.error);const r=await api('state'+(identity.target?'?user='+encodeURIComponent(identity.target.id):''),'PUT',{state:snapshot,revision:identity.revision});identity.revision=r.revision;const status=document.querySelector('#workspace-sync');if(status)status.textContent='Изменения сохранены на сервере.';}).catch(err=>{identity.error=err.message;const status=document.querySelector('#workspace-sync');if(status)status.textContent='Не сохранено: '+err.message+' Сделайте экспорт перед перезагрузкой.';const el=document.querySelector('#toast');if(el){el.textContent='Не сохранено на сервере: '+err.message;el.style.display='block';}}).finally(()=>{identity.saving=false;});return true;
 };
 identity.render=(role,tab)=>{
 if(!identity.user)return null;
 if(identity.user.mustChange)return `<section class="panel"><h1>Замените выданный пароль</h1><p>Первый вход: установите свой пароль. Выданный пароль не должен использоваться постоянно.</p><form id="identity-password" method="post"><label>Выданный / текущий пароль<input name="current" type="password" autocomplete="current-password" required maxlength="256"></label><label>Новый пароль — минимум 12 символов<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128"></label><button class="button">Сохранить новый пароль</button></form><p id="identity-status" role="status"></p></section>`;
 if(tab!=='accounts'&&role!=='admissions')return null;
 if(!['admin','admissions'].includes(identity.user.role))return '<p>Недостаточно прав.</p>';
 return `<section class="panel"><span class="eyebrow">ДОСТУП И УЧЁТНЫЕ ЗАПИСИ</span><h1>${role==='admissions'?'Приёмная комиссия':'Пользователи и права'}</h1><p>Логин — полное ФИО. Пробелы и регистр нормализуются. Совпадающие ФИО нужно различить согласованным вариантом, а не создавать неоднозначный вход.</p><form id="identity-create" method="post"><label>Фамилия, имя, отчество<input name="name" required minlength="5" maxlength="160" autocomplete="off"></label><label>Роль<select name="role">${Object.entries(labels).filter(([r])=>identity.user.role==='admin'||['applicant','learner'].includes(r)).map(([r,label])=>`<option value="${r}" ${r==='applicant'?'selected':''}>${label}</option>`).join('')}</select></label><button class="button">Создать и сгенерировать пароль</button></form><p id="identity-status" role="status"></p><div id="identity-secret" class="warning" hidden></div></section><section class="panel"><h2>Учётные записи</h2><p>Пароли не хранятся в открытом виде. Новый временный пароль показывается один раз; передавайте его владельцу по отдельному защищённому каналу.</p>${identity.users.map(u=>`<article class="decision-record"><h3>${e(u.name)}</h3><p>${e(labels[u.role])} · ${u.disabled?'Доступ заблокирован':u.mustChange?'Ожидает смены пароля':'Доступ открыт'}</p>${u.id!==identity.user.id?`<button class="button outline small" data-identity-reset="${u.id}">Новый временный пароль</button>`:''}${u.id!==identity.user.id&&u.role!=='admin'?`<button class="button outline small" data-identity-disable="${u.id}" data-disabled="${u.disabled?'0':'1'}">${u.disabled?'Разблокировать':'Заблокировать'}</button>`:''}${identity.user.role==='admin'?`<button class="button small" data-identity-open="${u.id}">Открыть кабинет без смены пароля</button>`:''}</article>`).join('')}</section>`;
 };
 const message=text=>{const el=document.querySelector('#identity-status');if(el)el.textContent=text;};
 const secret=result=>{const box=document.querySelector('#identity-secret');if(!box)return;box.hidden=false;box.replaceChildren();const p=document.createElement('p');p.textContent='ФИО: '+result.user.name+' · Временный пароль показывается только сейчас.';const input=document.createElement('input');input.readOnly=true;input.value=result.password;input.setAttribute('aria-label','Сгенерированный временный пароль');input.autocomplete='off';box.append(p,input);};
 identity.submit=(form,render)=>{
 if(!['identity-create','identity-password'].includes(form.id))return false;
 const data=Object.fromEntries(new FormData(form));const button=form.querySelector('button');button.disabled=true;message('Выполняем…');
 (async()=>{try{if(form.id==='identity-password'){await api('password','POST',data);location.reload();return;}const result=await api('users','POST',data);identity.users=(await api('users')).users;render();secret(result);}catch(err){message(err.message);}finally{button.disabled=false;}})();return true;
 };
 identity.click=(t,render)=>{
 if(t.dataset.identityReturn!==undefined){sessionStorage.removeItem('scm-workspace-target');location.hash='cabinet';location.reload();return true;}
 if(t.dataset.identityOpen){sessionStorage.setItem('scm-workspace-target',t.dataset.identityOpen);location.hash='cabinet';location.reload();return true;}
 const id=t.dataset.identityReset||t.dataset.identityDisable;if(!id)return false;
 if(!confirm(t.dataset.identityReset?'Сгенерировать новый пароль? Все сессии пользователя завершатся.':'Изменить доступ пользователя? Его сессии завершатся.'))return true;
 t.disabled=true;(async()=>{try{const result=await api(t.dataset.identityReset?'users/reset':'users/disable','POST',{id,disabled:t.dataset.disabled==='1'});identity.users=(await api('users')).users;render();if(result.password)secret(result);}catch(err){message(err.message);}finally{t.disabled=false;}})();return true;
 };
 identity.banner=()=>`<p id="workspace-sync" role="status">${e(identity.error?'Не сохранено: '+identity.error:identity.saving?'Ожидает подтверждения сервера.':'Рабочее пространство учётной записи.')}</p>`+(identity.target?`<div class="warning">Администратор: кабинет ${e(identity.target.name)}. Пароль владельца не изменён. Действия записываются с вашим идентификатором. <button data-identity-return>Вернуться к администрированию</button></div>`:'');
 window.addEventListener('beforeunload',event=>{if(identity.saving||identity.error){event.preventDefault();event.returnValue='Изменения ещё не сохранены на сервере.';}});
 return identity;
})();
