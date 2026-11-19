"use strict";
(function(root){
 const dateOnly=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const allowed=new Set(['code','number','type','title','issuer','issuedAt','validUntil','status']);
 const codePattern=/^[a-f0-9]{32}$/i;
 function lookup(data,code,now=new Date()){
  if(typeof code!=='string'||!codePattern.test(code))return {state:'invalid'};
  if(!data||data.schemaVersion!==1||!Array.isArray(data.records)||!Number.isFinite(Date.parse(data.updatedAt)))return {state:'unavailable'};
  const age=now.getTime()-Date.parse(data.updatedAt);
  if(age<0||age>30*86400000)return {state:'stale',updatedAt:data.updatedAt};
  if(!data.records.every(r=>r&&Object.keys(r).every(k=>allowed.has(k))&&typeof r.code==='string'&&codePattern.test(r.code)&&['issued','revoked','replaced'].includes(r.status)&&typeof r.number==='string'&&r.number.length>0&&typeof r.type==='string'&&typeof r.title==='string'&&typeof r.issuer==='string'&&dateOnly(r.issuedAt)&&Date.parse(r.issuedAt)<=Date.parse(data.updatedAt)&&(!r.validUntil||(dateOnly(r.validUntil)&&r.validUntil>=r.issuedAt))))return {state:'unavailable'};
  if(new Set(data.records.map(r=>r.code.toLowerCase())).size!==data.records.length)return {state:'unavailable'};
  const r=data.records.find(r=>r.code.toLowerCase()===code.toLowerCase());if(!r)return {state:'not-found',updatedAt:data.updatedAt};
  if(Date.parse(r.issuedAt)>now.getTime())return {state:'unavailable'};
  return {state:r.status!=='issued'?r.status:(r.validUntil&&r.validUntil<now.toISOString().slice(0,10)?'expired':'issued'),record:r,updatedAt:data.updatedAt};
 }
 root.SCMVerification={lookup};
 if(typeof document==='undefined')return;
 const form=document.querySelector('#verify-form'),result=document.querySelector('#verification-result');let running=false;
 const labels={invalid:'Некорректный код. Нужны 32 латинские шестнадцатеричные цифры без пробелов.',unavailable:'Проверка недоступна. Не удалось получить корректный реестр. Это не означает недействительность документа.',stale:'Реестр требует обновления. Актуальный статус не подтверждён.', 'not-found':'Запись не найдена. Это не доказывает подделку: проверьте код и обратитесь к выдавшей организации.',issued:'В опубликованном реестре найдена запись о выдаче.',revoked:'Запись помечена как отозванная. Не считать документ действующим.',replaced:'Запись помечена как заменённая. Запросите актуальный документ у выдавшей организации.',expired:'Указанный срок действия истёк.'};
 form.addEventListener('submit',async event=>{event.preventDefault();if(running)return;running=true;const button=form.querySelector('button');button.disabled=true;result.replaceChildren();result.textContent='Проверяем опубликованный реестр…';
  const code=form.elements.code.value.trim();let outcome;
  try{if(!codePattern.test(code))outcome={state:'invalid'};else if(!navigator.onLine)outcome={state:'unavailable'};else {const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetch('published.json',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('HTTP');outcome=lookup(await response.json(),code);}finally{clearTimeout(timer);}}}catch{outcome={state:'unavailable'};}
  result.replaceChildren();const h=document.createElement('h2');h.textContent=labels[outcome.state];result.append(h);
  if(outcome.updatedAt){const p=document.createElement('p');p.textContent='Дата снимка реестра: '+outcome.updatedAt;result.append(p);}
  if(outcome.record){const r=outcome.record;for(const [label,value] of [['Номер',r.number],['Тип',r.type],['Название',r.title],['Выдавшая организация',r.issuer],['Дата выдачи',r.issuedAt],['Действует по',r.validUntil||'Срок не указан']]){const p=document.createElement('p');p.textContent=label+': '+value;result.append(p);}const p=document.createElement('p');p.textContent='Сверьте эти реквизиты с предъявленным документом. Совпадение кода не удостоверяет личность предъявителя и не доказывает неизменность файла или подлинность электронной подписи.';result.append(p);}
  button.disabled=false;running=false;
 });
 // Fragment avoids sending the verification code in HTTP URLs/referrers.
 const code=location.hash.slice(1);if(codePattern.test(code)){form.elements.code.value=code;history.replaceState(null,'',location.pathname);}
})(typeof window!=='undefined'?window:globalThis);
