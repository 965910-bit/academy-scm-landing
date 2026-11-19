"use strict";
window.SCMStudyTools = (() => {
  const today = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const overdue = (a, day=today()) => ['assigned','revision'].includes(a.status) && /^\d{4}-\d{2}-\d{2}$/.test(a.due) && a.due < day;
  const metrics = (items, day=today()) => ({total:items.length, approved:items.filter(a=>a.status==='approved').length, submitted:items.filter(a=>a.status==='submitted').length, revision:items.filter(a=>a.status==='revision').length, overdue:items.filter(a=>overdue(a,day)).length});
  const icsText = value => String(value??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  function fold(line) {
    const lines=[];let current='',bytes=0;
    for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){lines.push(current);current=' ';bytes=1;}current+=char;bytes+=size;}
    lines.push(current);return lines.join('\r\n');
  }
  function calendar(items, date=new Date()) {
    const stamp=date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SCM Academy//Study Planner//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    for(const a of items.filter(a=>['assigned','revision'].includes(a.status))){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(a.due))continue;
      const due=new Date(a.due+'T00:00:00Z');if(!Number.isFinite(due.getTime())||due.toISOString().slice(0,10)!==a.due)continue;
      const end=new Date(due.getTime()+86400000).toISOString().slice(0,10).replace(/-/g,'');
      lines.push('BEGIN:VEVENT',`UID:${String(a.id).replace(/[^a-zA-Z0-9-]/g,'')}@scm-academy.local`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${a.due.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${icsText(a.snapshot?.title||'Учебная работа')}`,'DESCRIPTION:Срок локального учебного назначения. Проверьте актуальность в кабинете.','END:VEVENT');
    }
    lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
  }
  function create(ctx){
    let filter='all',cohort='all';const e=ctx.esc;
    const data=()=>{const state=ctx.state();if(!state.curriculum||typeof state.curriculum!=='object')state.curriculum={};for(const key of ['students','allocations'])if(!Array.isArray(state.curriculum[key]))state.curriculum[key]=[];return state.curriculum;};
    const labels={assigned:'Назначено',submitted:'На проверке',revision:'На доработке',approved:'Проверено локально'};
    function scoped(role){const c=data();if(role==='learner'){if(!c.students.some(s=>s.id===c.activeStudent))c.activeStudent=c.students[0]?.id||'';return c.allocations.filter(a=>a.student===c.activeStudent);}return c.allocations.filter(a=>cohort==='all'||c.students.find(s=>s.id===a.student)?.cohort===cohort);}
    const shown=(items)=>items.filter(a=>filter==='all'||(filter==='overdue'?overdue(a):a.status===filter)).slice().sort((a,b)=>a.due.localeCompare(b.due)||a.created.localeCompare(b.created));
    const metricCards=m=>`<div class="metrics"><div class="metric"><b>${m.total}</b><span>назначений в выборке</span></div><div class="metric"><b>${m.approved}</b><span>проверено локально</span></div><div class="metric"><b>${m.submitted}</b><span>ожидают проверки</span></div><div class="metric"><b>${m.overdue}</b><span>просрочено без сдачи</span></div></div>`;
    function render(role,tab){
      if(!(role==='learner'&&tab==='planner')&&!(['admin','teacher'].includes(role)&&tab==='monitoring'))return null;
      const c=data(),items=scoped(role),m=metrics(items),list=shown(items);
      return `<div class="dashboard-head"><div><span class="eyebrow">SCM STUDY DESK</span><h1>${role==='learner'?'Сроки и учебный план':'Мониторинг обучения'}</h1><p>Состояние локальных назначений на ${today()}. Чтение не считается подтверждением навыка.</p></div><span class="badge">РАБОЧЕЕ ПРОСТРАНСТВО</span></div>${role==='learner'?`<form class="panel" id="study-profile"><label>Локальный учебный профиль<select name="student">${c.students.map(s=>`<option value="${e(s.id)}" ${s.id===c.activeStudent?'selected':''}>${e(s.name)} · ${e(s.cohort)}</option>`).join('')}</select></label><button class="button outline" ${c.students.length?'':'disabled'}>Выбрать профиль</button><p class="micro">Это не вход в аккаунт. Другой пользователь устройства может переключить профиль.</p></form>`:''}${metricCards(m)}<form id="study-filter" class="panel study-filters">${role!=='learner'?`<label>Группа<select name="cohort"><option value="all">Все группы</option>${[...new Set(c.students.map(s=>s.cohort))].map(g=>`<option value="${e(g)}" ${g===cohort?'selected':''}>${e(g)}</option>`).join('')}</select></label>`:''}<label>Состояние<select name="status"><option value="all">Все состояния</option>${Object.entries({...labels,overdue:'Просрочено без сдачи'}).map(([k,l])=>`<option value="${k}" ${k===filter?'selected':''}>${l}</option>`).join('')}</select></label><button class="button">Применить фильтр</button></form><p role="status">Показано: ${list.length}. Счётчики выше учитывают все статусы выбранного профиля или группы.</p>${role==='learner'?'<button class="button outline" data-study-calendar>Скачать сроки в календарь (.ics) ↧</button><p class="micro">Экспорт всех несданных работ текущего профиля, независимо от фильтра. События на весь день, не подписка: при изменениях нужен новый экспорт. Push/email-напоминаний нет.</p>':'<button class="button outline" data-tab="responses">Открыть проверку работ ↗</button>'}<div class="study-agenda">${list.map(a=>`<article class="panel"><div class="study-event-head"><time datetime="${e(a.due)}">${e(a.due)}</time><span class="badge">${e(labels[a.status]||a.status)}</span>${overdue(a)?'<span class="badge planned">Срок прошёл</span>':''}</div><h2>${e(a.snapshot.title)}</h2><p>${role!=='learner'?`${e(c.students.find(s=>s.id===a.student)?.name||'Участник')} · `:''}Редакция материала ${e(a.snapshot.version)} · ${Array.isArray(a.history)?a.history.length:0} записей в истории</p>${a.feedback?`<p><b>Обратная связь:</b> ${e(a.feedback)}</p>`:''}${role==='learner'?`<button class="button outline small" data-study-open="${e(a.id)}">Материал, черновик и решение ↗</button>`:''}</article>`).join('')||'<div class="empty"><h2>Работ в этой выборке нет</h2><p>Проверьте профиль и фильтры. Новые назначения создаёт администратор.</p></div>'}</div><div class="warning">Просрочка означает только: дата на устройстве позже срока, а работа находится в состоянии «Назначено» или «На доработке». Ожидание преподавателя не считается просрочкой студента. Штрафы автоматически не назначаются; часы чтения, риск отсева и квалификация не вычисляются.</div>`;
    }
    return {render,resetView(){filter='all';cohort='all';},submit(form,role){
      if(!['study-filter','study-profile'].includes(form.id))return false;
      if(!['learner','teacher','admin'].includes(role))return true;
      const f=new FormData(form),c=data();
      if(form.id==='study-filter'){const value=String(f.get('status'));filter=['all','overdue',...Object.keys(labels)].includes(value)?value:'all';if(role!=='learner')cohort=String(f.get('cohort')||'all');}
      else if(role==='learner'&&c.students.some(s=>s.id===f.get('student'))){c.activeStudent=String(f.get('student'));ctx.save();filter='all';}
      ctx.render();return true;
    },click(t,role){
      if(t.hasAttribute('data-study-calendar')){
        if(role!=='learner')return true;
        const blob=new Blob([calendar(scoped(role))],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='scm-study-deadlines.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
      }
      if(t.dataset.studyOpen){if(role==='learner'&&scoped(role).some(a=>a.id===t.dataset.studyOpen))ctx.openAssignment(t.dataset.studyOpen);return true;}return false;
    }};
  }
  return {create,today,overdue,metrics,calendar};
})();
