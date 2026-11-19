"use strict";
window.SCMDocuments = (() => {
  const allowedRoles = ['admin', 'learner', 'teacher', 'applicant'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fieldLabels = type => type.fields.split(';').map(label => label.trim()).filter(Boolean);
  const clean = (value, max) => String(value ?? '').slice(0, max);
  function content(type, input = {}) {
    const values = input.values && typeof input.values === 'object' ? input.values : {};
    return {
      title: clean(input.title || type.title, 240), organization: clean(input.organization, 300),
      recipient: clean(input.recipient, 300), date: /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : '',
      body: clean(input.body, 12000), values: Object.fromEntries(fieldLabels(type).map((_, i) => [String(i), clean(values[i], 2000)]))
    };
  }
  function markdown(type, input) {
    const data = content(type, input);
    return `# ПРОЕКТ — НЕ ВЫДАННЫЙ ДОКУМЕНТ\n\n## ${data.title}\n\nОрганизация: ${data.organization || '[не заполнено]'}\nПолучатель / заявитель: ${data.recipient || '[не заполнено]'}\nДата проекта: ${data.date || '[не заполнено]'}\n\n${fieldLabels(type).map((label, i) => `${label}: ${data.values[i] || '[не заполнено]'}`).join('\n\n')}\n\n${data.body}\n\n## Ограничения\n${type.limits}\nПрименимость: ${type.requirement}\n\nЭто проект. Документ не выдан, не подписан и не зарегистрирован. Проверка подготовки не является официальным утверждением.\n`;
  }
  function html(type, input) {
    const data = content(type, input), e = escape;
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(data.title)} — проект</title><style>*{box-sizing:border-box}body{margin:0;background:#eeeaf4;color:#241934;font:15px/1.6 system-ui,sans-serif}article{max-width:210mm;margin:20px auto;padding:16mm;background:white}h1{font-size:25px;line-height:1.25}h1,p,dt,dd{overflow-wrap:anywhere}.label{font-size:13px;letter-spacing:.08em;font-weight:800;color:#6331bb;border-bottom:2px solid #6331bb;padding-bottom:12px}.warning{border:1px solid #9782b7;padding:12px;font-size:12px;break-inside:avoid}dl{margin:24px 0}dt{font-weight:700;margin-top:15px}dd{margin:3px 0 0;white-space:pre-wrap}.body{white-space:pre-wrap;margin:25px 0}.meta{white-space:pre-wrap}.limits{font-size:12px;color:#50445f}@page{size:A4;margin:16mm}@media print{body{background:white}article{margin:0;padding:0;max-width:none}.label{color:black}.warning{color:black}h1,dt{break-after:avoid}a{color:inherit}}@media(max-width:600px){article{margin:0;padding:18px}h1{font-size:22px}}</style></head><body><article><p class="label">АКАДЕМИЯ SCM · ПРОЕКТ</p><h1>${e(data.title)}</h1><p class="meta"><b>Организация:</b> ${e(data.organization || 'Не заполнено')}<br><b>Получатель / заявитель:</b> ${e(data.recipient || 'Не заполнено')}<br><b>Дата проекта:</b> ${e(data.date || 'Не заполнено')}</p><dl>${fieldLabels(type).map((label, i) => `<dt>${e(label)}</dt><dd>${e(data.values[i] || 'Не заполнено')}</dd>`).join('')}</dl>${data.body ? `<section class="body">${e(data.body)}</section>` : ''}<p class="warning">ПРОЕКТ — НЕ ВЫДАННЫЙ ДОКУМЕНТ. Нет электронной подписи, официальной регистрации и подтверждения выдачи. Отметка проверки подготовки не является официальным утверждением.</p><p class="limits">${e(type.limits)}<br>Применимость: ${e(type.requirement)}</p></article></body></html>`;
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
        values: Object.fromEntries(fieldLabels(type).map((_, i) => [i, data.get(`field_${i}`)]))
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
    function open(record) { selected = record.id; working = content(typeBy(record.type), record.content); dirty = false; showPreview = false; }
    function editor(record, role) {
      const type = typeBy(record.type);
      if (!type) return '<p>Тип документа недоступен. Вернитесь к каталогу.</p><button data-document-back>К каталогу</button>';
      if (!working) working = content(type, record.content);
      return `<button class="button outline small" data-document-back>← К документам</button><section class="panel"><span class="eyebrow">РЕДАКТОР ДОКУМЕНТА</span><h1>${e(type.title)}</h1><p class="micro">Редакция ${Number(record.revision) || 1} · ${record.status === 'reviewed' ? 'Проверка подготовки отмечена; изменение создаст новую редакцию и снимет отметку.' : 'Черновик'}${record.updated ? ` · сохранён ${e(record.updated)}` : ''}</p><div class="warning">${e(type.limits)} Заполнение, скачивание и печать не означают выдачу. Не вносите паспорт, СНИЛС и другие чувствительные данные: защищённый юридический документооборот ещё не подключён.</div><form id="document-editor" method="post"><div class="two-col"><label>Заголовок<input name="title" maxlength="240" required value="${e(working.title)}"></label><label>Организация<input name="organization" maxlength="300" value="${e(working.organization)}"></label><label>Получатель / заявитель<input name="recipient" maxlength="300" value="${e(working.recipient)}"></label><label>Дата проекта<input name="date" type="date" value="${e(working.date)}"></label></div><h2>Реквизиты по типу документа</h2><div class="two-col">${fieldLabels(type).map((label, i) => `<label>${e(label)}<textarea name="field_${i}" rows="2" maxlength="2000">${e(working.values[i])}</textarea></label>`).join('')}</div><label>Текст документа / дополнительные условия<textarea name="body" rows="10" maxlength="12000" placeholder="Введите текст своими словами. HTML и скрипты не исполняются.">${e(working.body)}</textarea></label><p id="document-edit-status" role="status">${dirty ? 'Есть несохранённые изменения.' : 'Показана сохранённая редакция. Изменения сохраняются отдельной кнопкой.'}</p><div class="actions document-editor-actions"><button class="button" type="submit">Сохранить черновик</button><button type="button" class="button outline" data-document-preview>Предпросмотр</button><button type="button" class="button outline" data-document-html>Скачать HTML</button><button type="button" class="button outline" data-document-markdown>Скачать Markdown</button><button type="button" class="button outline" data-document-print>Печать / PDF</button></div><p class="micro">Скачивание, предпросмотр и печать используют текущие поля, даже если вы ещё не сохранили их. PDF — через «Сохранить как PDF» в системном окне печати, если браузер поддерживает это действие. Окончательное сохранение на сервере проверяйте по статусу рабочего пространства.</p></form></section>${showPreview ? `<section class="panel document-preview"><h2>Предпросмотр текущих полей</h2><p>Проект для проверки оформления. Итоговая разбивка страниц зависит от браузера, бумаги и настроек печати.</p><iframe id="document-print-frame" title="Предпросмотр проекта документа" sandbox="allow-same-origin allow-modals" srcdoc="${e(html(type, working))}"></iframe></section>` : ''}`;
    }
    function render(role, tab) {
      if (!['documents','student-card'].includes(tab) || !allowedRoles.includes(role)) return null;
      const record = current();
      if (record && (tab !== 'student-card' || record.type === 'student-card')) return editor(record, role);
      if (tab === 'student-card') return `<section class="panel"><span class="eyebrow">ЛИЧНЫЕ ДОКУМЕНТЫ</span><h1>Студенческий билет</h1><p>Электронная карточка слушателя Академии SCM. Заполните реквизиты, сохраните проект, проверьте оформление и скачайте или распечатайте.</p><div class="document-pass"><span>АКАДЕМИЯ SCM · ПРОЕКТ</span><h3>Электронный студенческий билет</h3><p>Карточка слушателя</p><p>Проект внутренней карточки. Не подтверждает зачисление и не предоставляет льгот.</p></div><div class="actions"><button class="button" data-document-draft="student-card">Заполнить студенческий билет</button><button class="button outline" data-tab="documents">Все документы</button></div></section><section class="panel"><h2>Сохранённые студенческие билеты</h2>${records().filter(item=>item.type==='student-card').map(item=>`<article class="decision-record"><h3>${e(item.content?.title || 'Студенческий билет')}</h3><p>${e(item.updated || item.created)}</p><button class="button small" data-document-edit="${e(item.id)}">Открыть / редактировать / печать</button></article>`).join('') || '<p>Карточек пока нет. Нажмите «Заполнить студенческий билет».</p>'}</section>`;
      const list = types.filter(type => `${type.title} ${type.group} ${type.requirement}`.toLowerCase().includes(query.toLowerCase()));
      return `<div class="dashboard-head"><div><span class="eyebrow">ЭЛЕКТРОННЫЕ ДОКУМЕНТЫ</span><h1>Документы и карточка слушателя</h1><p>Каталог из ${types.length} типов: заполнение, редактирование, предпросмотр, скачивание и печать.</p></div></div><div class="warning">Документы подготавливаются как проекты. Официальная выдача и электронная подпись не подключены. Доступ определяется вашей учётной записью.</div><section class="panel"><h2>Электронный студенческий</h2><p><button class="button" data-tab="student-card">Открыть студенческий билет →</button></p><div class="document-pass"><span>АКАДЕМИЯ SCM · ПРОЕКТ</span><h3>Карточка слушателя</h3><p>Статус не подтверждён · номер не присвоен</p><p>Не является официальным студенческим билетом, удостоверением личности или основанием льгот.</p></div><p><a href="../registry/registry.html">Проверить выданный документ →</a> · <a href="documents/">Открытый каталог и правила →</a></p></section><form id="document-search" class="panel"><label>Поиск типа документа<input name="query" type="search" maxlength="120" value="${e(query)}"></label><button class="button">Найти</button></form><p role="status">Найдено: ${list.length}</p><div class="grid knowledge-grid">${list.map(type => `<article class="card"><span class="number">${e(type.group)} · ${e(type.requirement)}</span><h2>${e(type.title)}</h2><p>${e(type.limits)}</p><details><summary>Реквизиты для подготовки</summary><p>${e(type.fields)}</p></details><button class="button outline small" data-document-template="${type.id}">Скачать заготовку Markdown</button><button class="button small" data-document-draft="${type.id}">Заполнить документ</button></article>`).join('') || '<p>Измените запрос: ничего не найдено.</p>'}</div><section class="panel"><h2>Мои проекты документов</h2><p>Не отправляются в учебную часть и не появляются в публичном реестре. Лимит: 50 записей. Существующие проекты можно открыть и дополнить.</p>${records().map(record => { const type = typeBy(record.type); return `<article class="decision-record"><h3>${e(record.content?.title || type?.title || 'Неизвестный тип')}</h3><p>${record.status === 'reviewed' ? 'Проверка подготовки отмечена' : 'Черновик'} · ${e(record.updated || record.created)} · редакция ${Number(record.revision) || 1}</p>${type ? `<button class="button small" data-document-edit="${e(record.id)}">Открыть / редактировать</button>` : ''}${role === 'admin' && record.status === 'draft' ? `<button class="button outline small" data-document-review="${e(record.id)}">Отметить проверку подготовки</button>` : ''}<button class="button outline small" data-document-remove="${e(record.id)}">Удалить</button></article>`; }).join('') || '<p>Проектов пока нет.</p>'}</section>`;
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
        const actions = ['template', 'draft', 'edit', 'review', 'remove', 'back', 'preview', 'html', 'markdown', 'print'];
        const action = actions.find(key => Object.hasOwn(target.dataset, 'document' + key[0].toUpperCase() + key.slice(1)));
        if (!action) return false;
        if (!allowedRoles.includes(role)) return true;
        capture();
        const id = target.dataset['document' + action[0].toUpperCase() + action.slice(1)], type = typeBy(id);
        if (action === 'template' && type) { download(`${type.id}-draft.md`, markdown(type, {}), 'text/markdown'); return true; }
        if (action === 'draft' && type) {
          if(id==='student-card' && ctx.openStudentCard){ctx.openStudentCard();return true;}
          if (records().length >= 50) { ctx.toast('Достигнут лимит 50 проектов. Удалите ненужные.'); return true; }
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
  return {create, html, markdown, content, fieldLabels};
})();
