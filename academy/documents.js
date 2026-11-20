"use strict";
window.SCMDocuments = (() => {
  const allowedRoles = ['admin','superadmin','admissions','curator','alumni','learner','teacher','applicant','employer','auditor'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fieldLabels = type => type.fields.split(';').map(label => label.trim()).filter(Boolean);
  const clean = (value, max) => String(value ?? '').slice(0, max);
  function content(type, input = {}) {
    const values = input.values && typeof input.values === 'object' ? input.values : {};
    const tables = Object.fromEntries((type.tables || []).map(table => [table.id, (Array.isArray(input.tables?.[table.id]) ? input.tables[table.id] : []).map(row => table.columns.map((_, i) => clean(row?.[i], 2000)))]));
    return {
      formVersion: 2, title: clean(input.title || type.title, 240), organization: clean(input.organization, 300),
      recipient: clean(input.recipient, 300), date: /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : '',
      number:clean(input.number,100),place:clean(input.place,200),position:clean(input.position,200),signer:clean(input.signer,200),approval:clean(input.approval,1000),
      body: clean(input.body, 12000), values: Object.fromEntries(fieldLabels(type).map((_, i) => [String(i), clean(values[i], 2000)])),tables,
      legacy: Array.isArray(input.legacy)?input.legacy.map(item=>({label:clean(item.label,240),value:clean(item.value,2000)})):[]
    };
  }
  function migrate(type,input){
    if(!input||input.formVersion===2)return content(type,input);
    const labels=(type.legacyFields||type.fields).split(';').map(s=>s.trim()),legacy=labels.map((label,i)=>({label,value:clean(input.values?.[i],2000)})).filter(x=>x.value);
    const values=Object.fromEntries(fieldLabels(type).map((label,i)=>[i,legacy.find(x=>x.label.toLocaleLowerCase('ru')===label.toLocaleLowerCase('ru'))?.value||'']));
    return content(type,{...input,title:input.title===type.legacyTitle?type.title:input.title,values,legacy});
  }
  function markdown(type, input) {
    const data=content(type,input),rows=(type.tables||[]).map(t=>`\n## ${t.title}\n\n| ${t.columns.join(' | ')} |\n| ${t.columns.map(()=>'---').join(' | ')} |\n${data.tables[t.id].map(row=>'| '+row.map(v=>v.replaceAll('|','\\|').replaceAll('\n',' / ')).join(' | ')+' |').join('\n')}`).join('\n');
    return `# ПРОЕКТ — НЕ ВЫДАННЫЙ ДОКУМЕНТ\n\n## ${data.title}\n\nОрганизация: ${data.organization || '[не заполнено]'}\nПолучатель / заявитель: ${data.recipient || '[не заполнено]'}\nДата: ${data.date||'[не заполнено]'}\nНомер: ${data.number||'[не заполнено]'}\nМесто: ${data.place||'[не заполнено]'}\n\n${fieldLabels(type).map((label,i)=>`${label}: ${data.values[i]||'[не заполнено]'}`).join('\n\n')}\n${rows}\n\n${data.body}\n\n${data.legacy.length?'## Сведения прежней формы\n'+data.legacy.map(x=>x.label+': '+x.value).join('\n'):''}\n\nПодписант: ${data.position} / ${data.signer}\nУтверждение формы: ${data.approval}\n\n${type.basis||''}\n${type.source||''}\n${type.limits}\nЭто проект. Документ не подписан и не зарегистрирован.\n`;
  }
  function html(type,input){
    const data=content(type,input),e=escape,blank=v=>e(v||'________________________'),layout=type.layout||'certificate';
    const labels=fieldLabels(type),value=i=>blank(data.values[i]);
    const fields=(start=0)=>labels.slice(start).map((label,j)=>`<section class="requisite"><h2>${e(label)}</h2><p>${value(start+j)}</p></section>`).join('');
    const numbered=()=>labels.map((label,i)=>`<section class="clause"><h2>${i+1}. ${e(label)}</h2><p>${value(i)}</p></section>`).join('');
    const signature=(label=data.position||(['application'].includes(layout)?'Заявитель':'Уполномоченное лицо'))=>`<div class="signature"><span>${e(label)}</span><span>________________<small>подпись</small></span><span>${blank(data.signer||(['application'].includes(layout)?data.recipient:''))}<small>расшифровка подписи</small></span></div>`;
    const meta=`<div class="doc-meta"><span>${blank(data.date)}</span><span>№ ${blank(data.number)}</span><span>${blank(data.place)}</span></div>`;
    const org=`<header class="organization">${blank(data.organization)}</header>`;
    const tables=(type.tables||[]).map(t=>{let rows=data.tables[t.id];if(!rows.length)rows=Array.from({length:layout==='book'?6:3},()=>t.columns.map(()=>''));return `<section class="table-section ${layout==='book'?'new-page':''}"><h2>${e(t.title)}</h2><table><caption>${e(t.title)}</caption><thead><tr>${t.columns.map(c=>`<th scope="col">${e(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${t.columns.map((_,i)=>`<td>${e(row[i])||'&nbsp;'}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;}).join('');
    let main='';
    if(layout==='application')main=`<div class="addressee"><p>${value(0)}</p><p>${blank(data.organization)}</p><p>от ${blank(data.recipient)}</p></div><h1>${e(data.title)}</h1>${fields(1)}${tables}`;
    else if(layout==='order')main=`${org}<p class="doc-kind">ПРИКАЗ</p>${meta}<h1>${e(data.title)}</h1><p class="command">ПРИКАЗЫВАЮ:</p>${fields()}${tables}`;
    else if(layout==='agreement')main=`${org}<h1>${e(data.title)}</h1>${meta}${numbered()}${tables}`;
    else if(layout==='book')main=`<section class="book-cover">${org}<h1>ЗАЧЁТНАЯ КНИЖКА</h1><p class="center">№ ${blank(data.number)}</p><div class="photo-place">Место<br>для фотографии</div><p class="holder">${blank(data.recipient)}</p><p class="center">Фамилия, имя, отчество (при наличии)</p>${fields()}<p>Дата выдачи: ${blank(data.date)}</p>${signature('Руководитель организации')}<div class="signature"><span>Подпись обучающегося</span><span>________________</span></div></section>${tables}`;
    else if(layout==='student-ticket'||layout==='card')main=`${org}<h1>${e(data.title)}</h1>${meta}<div class="photo-place">Место<br>для фотографии</div><p class="holder">${blank(data.recipient)}</p>${fields()}${tables}`;
    else if(layout==='award')main=`<section class="award">${org}<h1>${e(data.title)}</h1><p class="award-caption">Проект документа</p><p class="holder">${blank(data.recipient)}</p>${fields()}<p>Регистрационный номер ${blank(data.number)}</p><p>${blank(data.place)} · ${blank(data.date)}</p></section>${tables}`;
    else if(layout==='protocol')main=`${org}<p class="doc-kind">ПРОТОКОЛ</p>${meta}<h1>${e(data.title)}</h1>${fields()}${tables}`;
    else if(layout==='copy'||layout==='extract')main=`${org}<h1>${e(data.title)}</h1>${meta}${fields()}${tables}<div class="certification"><b>Верно</b>${signature('Заверившее лицо')}<p>Дата заверения: ${blank(data.date)}</p></div>`;
    else if(['plan','program','policy'].includes(layout))main=`<div class="approval">УТВЕРЖДАЮ<br>${blank(data.position)}<br>___________ ${blank(data.signer)}<br>${blank(data.date)}<p>${blank(data.approval)}</p></div>${org}<h1>${e(data.title)}</h1>${meta}${['program','policy'].includes(layout)?numbered():fields()}${tables}`;
    else main=`${org}<h1>${e(data.title)}</h1>${meta}<p>${layout==='certificate'?'Выдана: ':layout==='sheet'?'Обучающийся / группа: ':'Получатель / составитель: '}<b>${blank(data.recipient)}</b></p>${fields()}${tables}`;
    const legacy=data.legacy.length?`<section class="legacy new-page"><h2>Сведения прежней редакции — для переноса и проверки</h2>${data.legacy.map(x=>`<p><b>${e(x.label)}:</b> ${e(x.value)}</p>`).join('')}</section>`:'';
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(data.title)} — проект</title><style>
*{box-sizing:border-box}body{margin:0;background:#e9edf0;color:#111;font:14pt/1.35 'Times New Roman',serif}article{max-width:210mm;margin:20px auto;padding:20mm 15mm 20mm 25mm;background:white}h1{font-size:18pt;line-height:1.25;text-align:center;margin:10mm 0 8mm}h2{font-size:14pt;margin:5mm 0 2mm}p{margin:2mm 0 4mm;white-space:pre-wrap;overflow-wrap:anywhere}header.organization{text-align:center;font-size:14pt;font-weight:bold;margin:0 auto 8mm;max-width:140mm;overflow-wrap:anywhere}.doc-kind{font-size:18pt;text-align:center;letter-spacing:2px}.doc-meta{display:flex;justify-content:space-between;gap:8mm;font-size:12pt;margin:5mm 0;flex-wrap:wrap}.doc-meta span{overflow-wrap:anywhere}.addressee,.approval{margin:0 0 12mm auto;max-width:80mm;font-size:12pt;overflow-wrap:anywhere}.requisite h2{font-size:12pt;font-weight:normal;color:#333}.requisite p{border-bottom:1px dotted #aaa;min-height:6mm}.clause p,.body{text-align:justify;text-indent:1.25cm}.body{white-space:pre-wrap;margin:8mm 0}.signature{display:flex;align-items:end;justify-content:space-between;gap:8mm;margin:12mm 0 5mm;break-inside:avoid;font-size:12pt}.signature span{overflow-wrap:anywhere}.signature small{display:block;text-align:center;font-size:9pt}.table-section{margin:7mm 0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt}caption{position:absolute;width:1px;height:1px;overflow:hidden}th,td{border:1px solid #222;padding:2mm;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{font-weight:normal;text-align:center}td{height:10mm}thead{display:table-header-group}tr{break-inside:avoid}.photo-place{width:30mm;height:40mm;border:1px solid #555;text-align:center;display:flex;align-items:center;justify-content:center;font-size:10pt;margin:5mm auto}.holder{font-size:18pt;text-align:center;font-weight:bold;margin:10mm 0}.center{text-align:center}.award{border:2px solid #333;padding:10mm}.award-caption{text-align:center;font-size:11pt}.book-cover{min-height:0;font-size:11pt}.book-cover h1{margin:5mm 0}.book-cover .organization{margin-bottom:4mm}.book-cover .holder{font-size:15pt;margin:4mm 0}.book-cover .photo-place{width:25mm;height:35mm;margin:3mm auto}.book-cover .requisite{margin:3mm 0}.book-cover .requisite h2{display:inline;font-size:11pt}.book-cover .requisite h2:after{content:": "}.book-cover .requisite p{display:inline;font-size:11pt;border:0}.book-cover .signature{margin:6mm 0 2mm}.certification{border-top:1px solid #777;margin-top:10mm;padding-top:5mm}.warning{font:9pt/1.3 Arial,sans-serif;border-top:1px solid #999;padding-top:4mm;margin-top:10mm}.limits{font:9pt/1.3 Arial,sans-serif;overflow-wrap:anywhere}.label{text-align:right;font:9pt Arial,sans-serif;color:#555}.legacy{font-size:11pt}.command{font-weight:bold;margin-top:8mm}h1,h2{break-after:avoid}
@page{size:A4;margin:20mm 15mm 20mm 25mm;@top-center{content:counter(page);font-size:10pt}}@page:first{@top-center{content:none}}@media print{body{background:white}article{max-width:none;margin:0;padding:0}.new-page{break-before:page}.award{break-inside:avoid}}@media(max-width:650px){article{margin:0;padding:16px}table{font-size:8pt}th,td{padding:3px}.signature{gap:8px;flex-wrap:wrap}.award{padding:12px}}
</style></head><body><article data-document-layout="${e(layout)}"><p class="label">ПРОЕКТ · НЕ ПОДПИСАНО</p>${main}${data.body?`<section class="body">${e(data.body)}</section>`:''}${signature()}${legacy}<p class="warning">ПРОЕКТ — НЕ ВЫДАННЫЙ ДОКУМЕНТ. Подписи, утверждение и регистрация не выполнены автоматически. Пустые строки предназначены для оформления уполномоченными лицами.</p><p class="limits">${e(type.formStatus||'Проект локальной формы')}. ${e(type.basis||'')}<br>${e(type.limits)}<br>Основание утверждения формы: ${blank(data.approval)}</p></article></body></html>`;
  }
  function create(ctx) {
    const e = ctx.esc, types = window.SCMDocumentCatalog;
    let query = '', selected = null, working = null, dirty = false, showPreview = false;
    const records = () => { const state = ctx.state(); if (!Array.isArray(state.documentDrafts)) state.documentDrafts = []; return state.documentDrafts; };
    const typeBy = id => types.find(type => type.id === id);
    const current = () => records().find(record => record.id === selected);
    function download(name, text, mime) {
      const url = URL.createObjectURL(new Blob([text], {type: mime + ';charset=utf-8'}));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function capture() {
      const form = document.querySelector('#document-editor'), record = current(), type = record && typeBy(record.type);
      if (!form || !type) return;
      const data = new FormData(form), next = content(type, {
        title: data.get('title'), organization: data.get('organization'), recipient: data.get('recipient'), date: data.get('date'), body: data.get('body'),
        values: Object.fromEntries(fieldLabels(type).map((_, i) => [i, data.get(`field_${i}`)])),
        ...Object.fromEntries(['number','place','position','signer','approval'].map(key=>[key,data.get(key)])),
        legacy:working?.legacy||[],tables:Object.fromEntries((type.tables||[]).map(t=>[t.id,(working?.tables?.[t.id]||[]).map((row,r)=>t.columns.map((_,c)=>data.get(`table_${t.id}_${r}_${c}`)))]))
      });
      if (JSON.stringify(next) !== JSON.stringify(working)) { working = next; dirty = true; }
    }
    document.addEventListener('input', event => {
      if (!event.target.closest?.('#document-editor')) return;
      capture();
      const status = document.querySelector('#document-edit-status');
      if (status) status.textContent = 'Есть несохранённые изменения. Предпросмотр обновляется кнопкой «Предпросмотр».';
    });
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
    function open(record) { selected = record.id; working = migrate(typeBy(record.type), record.content); dirty = false; showPreview = false; }
    function editor(record, role) {
      const type = typeBy(record.type);
      if (!type) return '<p>Тип документа недоступен. Вернитесь к каталогу.</p><button data-document-back>К каталогу</button>';
      if (!working) working = migrate(type, record.content);
      return `<button class="button outline small" data-document-back>← К документам</button><section class="panel"><span class="eyebrow">РЕДАКТОР ДОКУМЕНТА</span><h1>${e(type.title)}</h1><p class="micro">Редакция ${Number(record.revision) || 1} · ${record.status === 'reviewed' ? 'Проверка подготовки отмечена; изменение создаст новую редакцию и снимет отметку.' : 'Черновик'}${record.updated ? ` · сохранён ${e(record.updated)}` : ''}</p><div class="warning">${e(type.limits)} Заполнение и печать подготавливают документ, но не проставляют подпись и не подтверждают его выдачу.</div><p class="micro">${e(type.formStatus)} · ${e(type.basis)} <a href="${e(type.source)}" target="_blank" rel="noopener">Источник требований ↗</a></p><form id="document-editor" method="post"><div class="two-col"><label>Заголовок<input name="title" maxlength="240" required value="${e(working.title)}"></label><label>Организация<input name="organization" maxlength="300" value="${e(working.organization)}"></label><label>${['book','sheet','award','student-ticket','card'].includes(type.layout)?'Обучающийся (ФИО)':'Получатель / заявитель'}<input name="recipient" maxlength="300" value="${e(working.recipient)}"></label><label>Дата документа<input name="date" type="date" value="${e(working.date)}"></label></div><div class="two-col">${[["number","Номер документа"],["place","Место составления"],["position","Должность подписанта"],["signer","ФИО подписанта"],["approval","Основание утверждения формы / документа"]].map(([key,label])=>`<label>${label}<input name="${key}" maxlength="${key==='approval'?1000:200}" value="${e(working[key])}"></label>`).join('')}</div><h2>Реквизиты по типу документа</h2><div class="two-col">${fieldLabels(type).map((label, i) => `<label>${e(label)}<textarea name="field_${i}" rows="2" maxlength="2000">${e(working.values[i])}</textarea></label>`).join('')}</div>${(type.tables||[]).map(t=>`<section class="document-table-editor"><h2>${e(t.title)}</h2><div class="document-table-scroll" role="region" aria-label="${e(t.title)}" tabindex="0"><table><thead><tr>${t.columns.map(c=>`<th scope="col">${e(c)}</th>`).join('')}<th scope="col">Действие</th></tr></thead><tbody>${working.tables[t.id].map((row,r)=>`<tr>${t.columns.map((c,col)=>`<td><textarea aria-label="${e(c)} · строка ${r+1}" name="table_${t.id}_${r}_${col}" rows="2" maxlength="2000">${e(row[col])}</textarea></td>`).join('')}<td><button type="button" class="button outline small" data-document-table-remove="${t.id}" data-document-row="${r}">Удалить строку</button></td></tr>`).join('')}</tbody></table></div><button type="button" class="button outline small" data-document-table-add="${t.id}">Добавить строку</button></section>`).join('')}${working.legacy.length?`<details><summary>Сохранённые сведения прежней формы — проверьте перенос</summary>${working.legacy.map(x=>`<p><b>${e(x.label)}:</b> ${e(x.value)}</p>`).join('')}</details>`:''}<label>Текст документа / дополнительные условия<textarea name="body" rows="10" maxlength="12000" placeholder="Введите текст своими словами. HTML и скрипты не исполняются.">${e(working.body)}</textarea></label><p id="document-edit-status" role="status">${dirty ? 'Есть несохранённые изменения.' : 'Показана сохранённая редакция. Изменения сохраняются отдельной кнопкой.'}</p><div class="actions document-editor-actions"><button class="button" type="submit">Сохранить черновик</button><button type="button" class="button outline" data-document-preview>Предпросмотр</button><button type="button" class="button outline" data-document-html>Скачать HTML</button><button type="button" class="button outline" data-document-markdown>Скачать Markdown</button><button type="button" class="button outline" data-document-print>Печать / PDF</button></div><p class="micro">Скачивание, предпросмотр и печать используют текущие поля, даже если вы ещё не сохранили их. PDF — через «Сохранить как PDF» в системном окне печати, если браузер поддерживает это действие. Окончательное сохранение на сервере проверяйте по статусу рабочего пространства.</p></form></section>${showPreview ? `<section class="panel document-preview"><h2>Предпросмотр текущих полей</h2><p>Проект для проверки оформления. Итоговая разбивка страниц зависит от браузера, бумаги и настроек печати.</p><iframe id="document-print-frame" title="Предпросмотр проекта документа" sandbox="allow-same-origin allow-modals" srcdoc="${e(html(type, working))}"></iframe></section>` : ''}`;
    }
    function render(role, tab) {
      if (!['documents','student-card'].includes(tab) || !allowedRoles.includes(role)) return null;
      const record = current();
      if (record && (tab !== 'student-card' || record.type === 'student-card')) return editor(record, role);
      if (tab === 'student-card') return `<section class="panel"><span class="eyebrow">ЛИЧНЫЕ ДОКУМЕНТЫ</span><h1>Студенческий билет</h1><p>Электронная карточка слушателя Академии SCM. Заполните реквизиты, сохраните проект, проверьте оформление и скачайте или распечатайте.</p><div class="document-pass"><span>АКАДЕМИЯ SCM · ПРОЕКТ</span><h3>Электронный студенческий билет</h3><p>Карточка слушателя</p><p>Проект внутренней карточки. Не подтверждает зачисление и не предоставляет льгот.</p></div><div class="actions"><button class="button" data-document-draft="student-card">Заполнить студенческий билет</button><button class="button outline" data-tab="documents">Все документы</button></div></section><section class="panel"><h2>Сохранённые студенческие билеты</h2>${records().filter(item=>item.type==='student-card').map(item=>`<article class="decision-record"><h3>${e(item.content?.title || 'Студенческий билет')}</h3><p>${e(item.updated || item.created)}</p><button class="button small" data-document-edit="${e(item.id)}">Открыть / редактировать / печать</button></article>`).join('') || '<p>Карточек пока нет. Нажмите «Заполнить студенческий билет».</p>'}</section>`;
      const list = types.filter(type => `${type.title} ${type.group} ${type.requirement}`.toLowerCase().includes(query.toLowerCase()));
      return `<div class="dashboard-head"><div><span class="eyebrow">ЭЛЕКТРОННЫЕ ДОКУМЕНТЫ</span><h1>Документы и карточка слушателя</h1><p>Каталог из ${types.length} типов: заполнение, редактирование, предпросмотр, скачивание и печать.</p></div></div><div class="warning">Документы подготавливаются как проекты. Официальная выдача и электронная подпись не подключены. Доступ определяется вашей учётной записью.</div><section class="panel"><h2>Электронный студенческий</h2><p><button class="button" data-tab="student-card">Открыть студенческий билет →</button></p><div class="document-pass"><span>АКАДЕМИЯ SCM · ПРОЕКТ</span><h3>Карточка слушателя</h3><p>Статус не подтверждён · номер не присвоен</p><p>Не является официальным студенческим билетом, удостоверением личности или основанием льгот.</p></div><p><a href="../registry/registry.html">Проверить выданный документ →</a> · <a href="documents/">Открытый каталог и правила →</a></p></section><form id="document-search" class="panel"><label>Поиск типа документа<input name="query" type="search" maxlength="120" value="${e(query)}"></label><button class="button">Найти</button></form><p role="status">Найдено: ${list.length}</p><div class="grid knowledge-grid">${list.map(type => `<article class="card"><span class="number">${e(type.group)} · ${e(type.requirement)}</span><h2>${e(type.title)}</h2><p>${e(type.limits)}</p><details><summary>Реквизиты для подготовки</summary><p>${e(type.fields)}</p></details><a class="button outline small" href="documents/forms/${type.id}.html" target="_blank" rel="noopener">Печатный макет ↗</a><button class="button outline small" data-document-template="${type.id}">Скачать заготовку Markdown</button><button class="button small" data-document-draft="${type.id}">Заполнить документ</button></article>`).join('') || '<p>Измените запрос: ничего не найдено.</p>'}</div><section class="panel"><h2>Мои проекты документов</h2><p>Не отправляются в учебную часть и не появляются в публичном реестре. Существующие проекты можно открыть и дополнить.</p>${records().map(record => { const type = typeBy(record.type); return `<article class="decision-record"><h3>${e(record.content?.title || type?.title || 'Неизвестный тип')}</h3><p>${record.status === 'reviewed' ? 'Проверка подготовки отмечена' : 'Черновик'} · ${e(record.updated || record.created)} · редакция ${Number(record.revision) || 1}</p>${type ? `<button class="button small" data-document-edit="${e(record.id)}">Открыть / редактировать</button>` : ''}${role === 'admin' && record.status === 'draft' ? `<button class="button outline small" data-document-review="${e(record.id)}">Отметить проверку подготовки</button>` : ''}<button class="button outline small" data-document-remove="${e(record.id)}">Удалить</button></article>`; }).join('') || '<p>Проектов пока нет.</p>'}</section>`;
    }
    return {
      render,
      resetView() { query = ''; selected = null; working = null; dirty = false; showPreview = false; },
      submit(form, role) {
        if (!['document-search', 'document-editor'].includes(form.id)) return false;
        if (!allowedRoles.includes(role)) return true;
        if (form.id === 'document-search') { query = String(new FormData(form).get('query') || '').slice(0, 120); ctx.render(); return true; }
        const record = current(), type = record && typeBy(record.type);
        if (!type) { ctx.toast('Документ больше недоступен.'); return true; }
        capture();
        const rawDate = String(new FormData(form).get('date') || '');
        if (!working.title.trim() || (rawDate && (!Number.isFinite(Date.parse(rawDate)) || new Date(rawDate).toISOString().slice(0, 10) !== rawDate))) { ctx.toast('Укажите заголовок и корректную дату.'); return true; }
        if (JSON.stringify(content(type, record.content)) !== JSON.stringify(working)) {
          record.content = JSON.parse(JSON.stringify(working)); record.revision = (Number(record.revision) || 1) + 1;
          record.status = 'draft'; delete record.reviewedAt;
        } else if (!record.content) record.content = JSON.parse(JSON.stringify(working));
        record.updated = new Date().toISOString();
        const saved = ctx.save(); dirty = saved === false; ctx.render();
        if (saved !== false) ctx.toast('Черновик сохранён в рабочем пространстве. Подтверждение сервера отображается отдельно.');
        return true;
      },
      click(target, role) {
        const actions = ['tableAdd','tableRemove','template', 'draft', 'edit', 'review', 'remove', 'back', 'preview', 'html', 'markdown', 'print'];
        const action = actions.find(key => Object.hasOwn(target.dataset, 'document' + key[0].toUpperCase() + key.slice(1)));
        if (!action) return false;
        if (!allowedRoles.includes(role)) return true;
        capture();
        const id = target.dataset['document' + action[0].toUpperCase() + action.slice(1)], type = typeBy(id);
        if(['tableAdd','tableRemove'].includes(action)){const t=typeBy(current()?.type)?.tables?.find(t=>t.id===id);if(!t||!working)return true;if(action==='tableAdd')working.tables[id].push(t.columns.map(()=>''));else working.tables[id].splice(Number(target.dataset.documentRow),1);dirty=true;ctx.render();return true;}
        if (action === 'template' && type) { download(`${type.id}-draft.md`, markdown(type, {}), 'text/markdown'); return true; }
        if (action === 'draft' && type) {
          if(id==='student-card' && ctx.openStudentCard){ctx.openStudentCard();return true;}
          const record = {id: crypto.randomUUID(), type: id, status: 'draft', created: new Date().toISOString(), revision: 1, content: content(type)};
          records().push(record); open(record); ctx.save(); ctx.render(); return true;
        }
        if (action === 'edit') {
          const record = records().find(item => item.id === id);
          if (record && typeBy(record.type)) { if (dirty && !confirm('Заменить несохранённые изменения текущего проекта?')) return true; open(record); ctx.render(); }
          return true;
        }
        if (action === 'back') { if (dirty && !confirm('Есть несохранённые изменения. Вернуться без сохранения?')) return true; selected = null; working = null; dirty = false; showPreview = false; ctx.render(); return true; }
        if (['preview', 'html', 'markdown', 'print'].includes(action)) {
          const record = current(), type = record && typeBy(record.type);
          if (!type || !working) return true;
          if (action === 'html') { download(`${type.id}-project.html`, html(type, working), 'text/html'); return true; }
          if (action === 'markdown') { download(`${type.id}-project.md`, markdown(type, working), 'text/markdown'); return true; }
          showPreview = true; ctx.render();
          if (action === 'print') {
            const frame = document.querySelector('#document-print-frame');
            frame.addEventListener('load', () => {
              try { frame.contentWindow.focus(); frame.contentWindow.print(); }
              catch { ctx.toast('Печать недоступна в этом браузере. Скачайте HTML, откройте файл и выберите «Печать».'); }
            }, {once: true});
          }
          return true;
        }
        if (action === 'review' && role === 'admin') { const record = records().find(item => item.id === id); if (record?.status === 'draft') { record.status = 'reviewed'; record.reviewedAt = new Date().toISOString(); } }
        if (action === 'remove') { ctx.state().documentDrafts = records().filter(item => item.id !== id); }
        ctx.save(); ctx.render(); return true;
      }
    };
  }
  return {create, html, markdown, content, migrate, fieldLabels};
})();
