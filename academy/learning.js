/* Local learning sandbox. No remote AI, certified assessment or VC issuance. */
"use strict";
window.SCMLearning = (() => {
  const modules = [
    {
      id: "inventory", icon: "▦", title: "Запасы: от спроса к решению", category: "Запасы", minutes: 12,
      skill: "Расчёт точки заказа", intro: "Разделяйте ожидаемый спрос и запас для покрытия неопределённости.",
      sections: [
        ["Задача бизнеса", "Точка заказа отвечает на вопрос «когда заказывать», а не «сколько». Сравнивать её нужно с позицией запаса: остаток + ожидаемые поступления − неудовлетворённый спрос."],
        ["Базовая модель", "При постоянном сроке поставки L дней и среднем спросе d единиц в день: ожидаемый спрос за поставку = d × L. Если спрос по дням независим, его стандартное отклонение за L дней равно σ × √L."],
        ["Решение и границы", "Страховой запас SS = z × σ × √L; точка заказа ROP = d × L + SS. Модель предполагает стационарный независимый спрос, постоянный срок поставки и приближение нормальным распределением. Для сезонности, редкого спроса или нестабильных сроков эта формула может не подходить."],
      ],
      questions: [
        { prompt: "Средний спрос — 20 ед./день, поставка — 5 дней. Каков ожидаемый спрос за время поставки?", options: ["4 единицы", "100 единиц", "25 единиц"], correct: 1, explanation: "20 × 5 = 100 единиц. Страховой запас добавляется отдельно." },
        { prompt: "Что сравнивают с точкой заказа в этой модели?", options: ["Только физический остаток", "Выручку за месяц", "Позицию запаса с учётом ожидаемых поступлений и неудовлетворённого спроса"], correct: 2, explanation: "Решение учитывает не только физический остаток, но и уже заказанные поставки и неудовлетворённый спрос." },
      ],
    },
    {
      id: "service", icon: "◎", title: "Уровень сервиса без подмены метрик", category: "Сервис", minutes: 10,
      skill: "Интерпретация уровня сервиса", intro: "Не путайте вероятность цикла без дефицита с долей удовлетворённого спроса.",
      sections: [
        ["Две разные метрики", "Cycle service level (CSL) — вероятность цикла без дефицита. Fill rate — доля объёма спроса, удовлетворённого из доступного запаса. Одинаковое число процентов не делает эти показатели одинаковыми."],
        ["Цена решения", "При прочих равных увеличение страхового запаса увеличивает вложение в запасы. Целевой уровень сервиса выбирают с учётом последствий дефицита, стоимости хранения и требований клиента, а не автоматически максимизируют."],
        ["Проверка результата", "В отчёте фиксируйте формулу, единицу наблюдения, период и исключения. Уровень сервиса по строкам заказа и по штукам может отличаться. Параметр z в нормальной модели связан с CSL, но не задаёт напрямую fill rate."],
      ],
      questions: [
        { prompt: "Покупатели запросили 1000 единиц, из доступного запаса выдали 950. Чему равен fill rate по объёму в этом примере?", options: ["95%", "50%", "Нельзя вычислить без числа циклов"], correct: 0, explanation: "950 / 1000 = 95%. Число циклов необходимо для другой метрики." },
        { prompt: "Означает ли z = 1,645 в нормальной модели автоматически fill rate 95%?", options: ["Да, при любых условиях", "Нет: CSL и fill rate различаются", "Да, если округлить запас"], correct: 1, explanation: "z относится к вероятности отсутствия дефицита в цикле при принятых предпосылках, а не непосредственно к доле удовлетворённого спроса." },
      ],
    },
    {
      id: "planning", icon: "↗", title: "S&OP: одно решение для всей цепи", category: "Планирование", minutes: 15,
      skill: "Согласование плана спроса и ресурсов", intro: "Сопоставьте спрос, ограничения и экономику, прежде чем утверждать план.",
      sections: [
        ["Общая картина", "В учебном сценарии S&OP объединяет план спроса, ресурсные ограничения и финансовые последствия. План продаж сам по себе не означает наличия мощностей, материалов и транспорта."],
        ["Работа со сценариями", "Спрос следующего периода — 1200 единиц, доступная мощность — 1000. Разрыв составляет 200 единиц. Возможные действия: пересмотреть сроки, перераспределить ресурсы, привлечь подрядчика или управлять спросом. У каждого действия есть стоимость и риск."],
        ["Кто принимает решение", "Зафиксируйте допущения, владельца решения, срок пересмотра и показатель результата. Алгоритм может подготовить варианты, но не должен незаметно принимать коммерческие обязательства за руководителя."],
      ],
      questions: [
        { prompt: "Спрос — 1200 единиц, мощность — 1000. Какой разрыв нужно вынести на обсуждение?", options: ["100 единиц", "200 единиц", "2200 единиц"], correct: 1, explanation: "1200 − 1000 = 200 единиц. Необходимо оценить варианты покрытия или изменения спроса." },
        { prompt: "Какой следующий шаг наиболее обоснован?", options: ["Утвердить продажи без проверки ресурсов", "Автоматически обещать клиентам любой объём", "Сравнить сценарии по стоимости, ограничениям и рискам; назначить ответственного"], correct: 2, explanation: "План требует согласованных ресурсов и ответственного за принятое решение." },
      ],
    },
  ];
  const defaults = () => ({ read: [], attempts: [], submissions: [], events: [], lab: null, goal: "inventory" });
  function ensure(state) {
    const d = defaults(), old = state.learning;
    state.learning = { ...d, ...(old && typeof old === "object" ? old : {}) };
    for (const k of ["read", "attempts", "submissions", "events"]) if (!Array.isArray(state.learning[k])) state.learning[k] = [];
    if (!modules.some(m => m.id === state.learning.goal)) state.learning.goal = "inventory";
    for (const attempt of state.learning.attempts) {
      if (typeof attempt.recordCode === 'string') attempt.recordCode = attempt.recordCode.replace(/^DEMO-/i, 'LOCAL-');
    }
    return state.learning;
  }
  function calculateInventory({ demand, lead, sigma, z }) {
    if (![demand, lead, sigma, z].every(Number.isFinite) || demand <= 0 || demand > 1e7 || lead <= 0 || lead > 365 || sigma < 0 || sigma > 1e7 || z <= 0 || z > 4) {
      throw new Error("Проверьте входы: спрос > 0, срок 0–365 дней, σ ≥ 0, z от 0 до 4 (границы не включены для нуля). Спрос и σ — до 10 млн.");
    }
    const expected = demand * lead, safety = z * sigma * Math.sqrt(lead);
    return { expected, safety, reorder: Math.ceil(expected + safety) };
  }
  function create(ctx) {
    let selected = null, testing = false, query = "", assistantReply = "";
    const get = () => ensure(ctx.state());
    const e = ctx.esc;
    const id = () => window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = () => new Date().toISOString();
    const stamp = t => new Date(t).toLocaleString("ru-RU");
    const num = n => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
    const course = key => modules.find(m => m.id === key);
    const record = (type, payload = {}) => {
      const l = get();
      l.events.push({ id: id(), type, at: now(), ...payload });
      if (l.events.length > 500) l.events.splice(0, l.events.length - 500);
    };
    const commit = text => { ctx.save(); ctx.render(); if (text) ctx.toast(text); };
    const pill = status => `<span class="badge ${status === "approved" ? "" : "planned"}">${({pending:"Ожидает проверки", approved:"Проверено локально", revision:"Нужна доработка"})[status] || "Практика"}</span>`;
    const head = (title, text) => `<div class="dashboard-head"><div><span class="eyebrow">SCM LEARNING LAB</span><h1>${title}</h1><p class="subtle">${text}</p></div><span class="badge">РАБОЧЕЕ ПРОСТРАНСТВО</span></div>`;
    function summary() {
      const l = get(), approved = new Set(l.attempts.filter(a => a.status === "approved").map(a => a.module));
      return head("Ваши знания. В действии.", "Открытая учебная лаборатория: не означает зачисление на лицензируемую программу.") + `<div class="learning-welcome"><div><span class="eyebrow">ОТ ЗНАНИЯ К САМОСТОЯТЕЛЬНОМУ РЕШЕНИЮ</span><h2>Понять. Рассчитать.<br>Обосновать.</h2><p>Три коротких модуля, практикум по запасам и проверка преподавателем. Просмотр материала не считается освоением навыка.</p><button class="button lime" data-tab="courses">Продолжить обучение ↗</button></div><div class="mastery-orbit"><strong>${approved.size}<small>из 3 навыков</small></strong><span>проверено локально</span></div></div><div class="metrics"><div class="metric"><b>${l.read.length}/3</b><span>модулей прочитано</span></div><div class="metric"><b>${l.attempts.length}</b><span>проверок выполнено</span></div><div class="metric"><b>${l.attempts.filter(a => a.status === "pending").length}</b><span>ожидают преподавателя</span></div></div><div class="two-col"><section class="panel"><h3>Выберите рабочую задачу</h3><form id="goal-form"><label>С чего начать?<select name="goal">${modules.map(m => `<option value="${m.id}" ${m.id===l.goal?"selected":""}>${m.skill}</option>`).join("")}</select></label><button class="button outline small">Настроить мой маршрут</button></form><p class="subtle">Рекомендация по вашему выбору, не AI-профилирование.</p></section><section class="panel"><h3>Рекомендуемый следующий шаг</h3><p>${course(l.goal).title}</p><p class="subtle">${course(l.goal).intro}</p><button class="button small" data-learn-module="${l.goal}">Открыть модуль ↗</button></section></div>`;
    }
    function courses() {
      const l = get();
      if (selected) return lesson();
      const shown = modules.filter(m => `${m.title} ${m.category} ${m.skill}`.toLowerCase().includes(query.toLowerCase()));
      return head("Мои модули", "Короткая теория → задача → объяснение решения → проверка преподавателем.") + `<form id="course-search" class="learning-search"><label>Найти модуль<input name="query" type="search" value="${e(query)}" placeholder="Запасы, сервис, планирование…" maxlength="100"></label><button class="button small">Найти</button></form><div class="learning-course-grid">${shown.map((m,i) => {const done=l.attempts.some(a=>a.module===m.id&&a.status==="approved");return `<article class="learning-course"><div class="course-cover cover-${m.id}"><span>${m.icon}</span><b>0${modules.indexOf(m)+1}</b><small>${m.category.toUpperCase()}</small></div><div class="course-body"><span class="subtle">${m.minutes} минут · теория + проверка</span><h3>${m.title}</h3><p>${m.intro}</p><div class="course-checkpoints"><span>${l.read.includes(m.id)?"✓ Прочитано":"○ Теория"}</span><span>${done?"✓ Подтверждено":"○ Проверка"}</span></div><button class="button outline small full" data-learn-module="${m.id}">Открыть модуль ↗</button></div></article>`;}).join("") || '<div class="empty">Ничего не найдено. Попробуйте другое название.</div>'}</div>`;
    }
    function lesson() {
      const m = course(selected), l = get();
      const attempts = l.attempts.filter(a=>a.module===m.id);
      if (testing) return head("Проверка понимания", `${m.title} · учебная самопроверка, не защищённый экзамен`) + `<div class="warning">В этом экране нет подсказок. Это не прокторинг: платформа не может доказать отсутствие внешней помощи. Окончательное подтверждение требует преподавателя.</div><form id="learning-quiz" class="panel"><input type="hidden" name="module" value="${m.id}">${m.questions.map((q,i)=>`<fieldset class="quiz-question"><legend>${i+1}. ${q.prompt}</legend>${q.options.map((option,j)=>`<label class="radio-option"><input type="radio" name="q${i}" value="${j}" required> ${option}</label>`).join("")}</fieldset>`).join("")}<label>Почему вы выбрали эти решения?<textarea name="reason" required minlength="20" maxlength="2000" placeholder="Объясните ход рассуждений своими словами; минимум 20 символов"></textarea></label><label class="check"><input type="checkbox" name="declaration" required>Понимаю, что это учебная самопроверка с локальным сохранением, не сертификация.</label><div class="actions"><button class="button">Сохранить попытку</button><button type="button" class="button outline" data-learning-action="cancel-test">Вернуться к материалу</button></div></form>`;
      return head(m.title, `${m.category} · ${m.minutes} минут · редакция учебного материала 1`) + `<button class="link" data-learning-action="back-courses">← Все модули</button><div class="lesson-layout"><article class="panel lesson-body">${m.sections.map(([title,body],i)=>`<section><span class="eyebrow">0${i+1}</span><h2>${title}</h2><p>${body}</p></section>`).join("")}<div class="lesson-note">Учебная модель, а не рекомендация для реальных закупок. Для применения нужны проверка данных, единиц, распределений спроса и ограничений процесса.</div><div class="actions"><button class="button outline small" data-learning-action="mark-read">${l.read.includes(m.id)?"✓ Материал отмечен прочитанным":"Отметить прочитанным"}</button><button class="button small" data-learning-action="start-test">Проверить понимание ↗</button></div></article><aside><section class="panel"><h3>Навык модуля</h3><p>${m.skill}</p><div class="progress"><span style="width:${l.attempts.some(a=>a.module===m.id&&a.status==="approved")?100:l.read.includes(m.id)?35:0}%"></span></div><p class="subtle">Прочтение — только этап маршрута. Подтверждение — отдельное решение преподавателя.</p></section>${attempts.slice().reverse().map(a=>`<section class="panel"><span class="subtle">${stamp(a.created)}</span><h3>Результат: ${a.score}/2</h3>${pill(a.status)}${a.feedback?`<p>${e(a.feedback)}</p>`:""}<details><summary>Разбор самопроверки</summary>${m.questions.map((q,i)=>`<p class="subtle"><b>${a.answers[i]===q.correct?"Верно":"Нужно повторить"}.</b> ${q.explanation}</p>`).join("")}</details></section>`).join("")}</aside></div>`;
    }
    function lab() {
      const l = get(), v = l.lab?.inputs || {demand:80,lead:7,sigma:15,z:1.645};
      return head("Лаборатория запасов", "Измените параметры, получите расчёт и проверьте предпосылки.") + `<div class="lab-banner"><span aria-hidden="true">▦</span><div><h2>Что произойдёт с точкой заказа?</h2><p>Постоянный срок поставки · независимый дневной спрос · нормальное приближение.</p></div></div><div class="two-col"><form id="inventory-form" class="panel"><h3>Параметры сценария</h3>${[["demand","Средний спрос, ед./день",0.01,10000000],["lead","Постоянный срок поставки, дней",0.01,365],["sigma","Стандартное отклонение спроса, ед./день",0,10000000],["z","Коэффициент z (не fill rate)",0.01,4]].map(([key,title,min,max])=>`<label>${title}<input name="${key}" type="number" step="any" min="${min}" max="${max}" required value="${e(v[key])}"></label>`).join("")}<button class="button full">Рассчитать сценарий ↗</button></form><section class="panel" id="inventory-result" aria-live="polite">${l.lab?`<span class="eyebrow">РАСЧЁТ ПО ВАШЕМУ СЦЕНАРИЮ</span><h2>${num(l.lab.result.reorder)} ед.</h2><p>Точка заказа с округлением вверх</p><div class="result-line"><span>Ожидаемый спрос d × L</span><b>${num(l.lab.result.expected)} ед.</b></div><div class="result-line"><span>Страховой запас z × σ × √L</span><b>${num(l.lab.result.safety)} ед.</b></div><div class="result-line"><span>ROP = d × L + SS</span><b>${num(l.lab.result.reorder)} ед.</b></div><p class="subtle">Рассчитано ${stamp(l.lab.created)}. Сравнивайте с позицией запаса, не только с остатком.</p>`:'<div class="empty"><h3>Ваше решение появится здесь</h3><p>Это прозрачный расчёт по формуле, а не ответ языковой модели.</p></div>'}<div class="lesson-note">Не применять без проверки при коррелированном, сезонном или редком спросе и переменном сроке поставки. z = 1,645 в нормальной модели соответствует CSL около 95%, а не автоматически fill rate 95%.</div><button class="link" data-learn-module="inventory">Изучить предпосылки →</button></section></div>`;
    }
    function skills() {
      const l = get();
      return head("Карта навыков", "Наблюдаемые результаты вместо вероятностного рейтинга человека.") + `<div class="panel"><p class="subtle">Нет BKT и автоматической сертификации. Статусы отражают чтение, тест и решение преподавателя в этом рабочем пространстве.</p>${modules.map(m=>{const aa=l.attempts.filter(a=>a.module===m.id), approved=aa.find(a=>a.status==="approved"), pending=aa.some(a=>a.status==="pending");return `<div class="skill-row"><div class="course-icon">${m.icon}</div><div><h3>${m.skill}</h3><p>${approved?"Проверено локально":pending?"Ожидает проверки":aa.length?"Повторите материал":l.read.includes(m.id)?"Теория прочитана":"Ещё не начато"}</p><div class="progress"><span style="width:${approved?100:pending?65:l.read.includes(m.id)?35:0}%"></span></div>${approved?`<span class="subtle">Код локальной записи: <b>${e(approved.recordCode)}</b></span>`:""}</div><button class="button outline small" data-learn-module="${m.id}">Практика ↗</button></div>`;}).join("")}</div><div class="warning">Локальная запись не является дипломом, цифровой подписью или W3C Verifiable Credential. Код проверяется только внутри этого рабочего пространства; это не публичный реестр.</div>`;
    }
    function assistant() {
      return head("Предметный помощник", "Проверенные правила и подсказки. LLM не подключена; свободный AI-диалог не имитируется.") + `<div class="panel"><h3>Разберём типичное затруднение</h3><form id="learning-assistant"><label>Вопрос<select name="topic"><option value="rop">Когда размещать заказ?</option><option value="sigma">Почему используется √L?</option><option value="service">Чем CSL отличается от fill rate?</option><option value="sop">Что делать при дефиците мощности?</option></select></label><button class="button">Получить объяснение</button></form></div><section class="panel" id="assistant-response" aria-live="polite">${assistantReply || '<p class="subtle">Выберите вопрос. Ответ основан на материалах учебных модулей; данные никуда не отправляются.</p>'}</section>`;
    }
    function assignments() {
      const l = get(), tasks = ctx.state().assignments;
      return head("Практические задания", "Работы преподавателя и ваши локальные ответы. Только вымышленные данные.") + (tasks.length?tasks.map(a=>{const submitted=l.submissions.filter(s=>s.assignment===a.id);return `<article class="panel"><span class="badge">SCM-01 · срок ${e(a.deadline)}</span><h3>${e(a.title)}</h3><p style="white-space:pre-wrap">${e(a.body)}</p><form class="learning-work-form"><input type="hidden" name="assignment" value="${e(a.id)}"><label>Ваше решение<textarea name="body" required minlength="20" maxlength="5000" placeholder="Обоснование и ограничения; минимум 20 символов"></textarea></label><button class="button small">Сохранить работу</button></form>${submitted.map(s=>`<div class="work-receipt"><span class="subtle">${stamp(s.created)} · локальная запись, не серверная квитанция</span>${pill(s.status)}<p>${e(s.feedback||"Работа доступна преподавателю в этом же браузере.")}</p></div>`).join("")}</article>`;}).join(""):'<div class="empty"><h3>Пока нет заданий</h3><p>Преподаватель может создать задание в своём кабинете. Оно появится здесь в том же браузере.</p></div>');
    }
    function reviews() {
      const l = get(), pending = l.attempts.filter(a=>a.status==="pending").length;
      return head("Проверка и обратная связь", "Реальные действия над локальными учебными попытками, не AI-оценка.") + `<div class="metrics"><div class="metric"><b>${pending}</b><span>тестов ждут проверки</span></div><div class="metric"><b>${l.submissions.filter(s=>s.status==="pending").length}</b><span>работ ждут ответа</span></div><div class="metric"><b>${l.attempts.filter(a=>a.score<2).length}</b><span>попыток с ошибками</span></div></div><div class="warning">Сигнал «есть ошибка» — наблюдение, не предсказание отсева и не характеристика человека. Все записи принадлежат одному слушателю.</div>${l.attempts.slice().reverse().map(a=>`<article class="panel"><span class="subtle">Слушатель · ${stamp(a.created)}</span><h3>${course(a.module)?.skill||"Модуль"} · ${a.score}/2</h3>${pill(a.status)}<p style="white-space:pre-wrap">${e(a.reason)}</p><details><summary>Ответы и критерии</summary>${course(a.module)?.questions.map((q,i)=>`<p class="subtle"><b>${q.prompt}</b><br>Ответ: ${e(q.options[a.answers[i]])}<br>${q.explanation}</p>`).join("")}</details>${a.status==="pending"?reviewForm(a.id,"attempt",a.score===2):`<p>${e(a.feedback)}</p>`}</article>`).join("")}${l.submissions.slice().reverse().map(s=>`<article class="panel"><span class="subtle">Практическая работа · ${stamp(s.created)}</span><h3>${e(ctx.state().assignments.find(a=>a.id===s.assignment)?.title||"Задание")}</h3>${pill(s.status)}<p style="white-space:pre-wrap">${e(s.body)}</p>${s.status==="pending"?reviewForm(s.id,"work",true):`<p>${e(s.feedback)}</p>`}</article>`).join("")}${!l.attempts.length&&!l.submissions.length?'<div class="empty">Когда слушатель сохранит попытку или работу, она появится здесь.</div>':""}`;
    }
    function reviewForm(key,type,canApprove) {
      return `<form class="learning-review-form"><input type="hidden" name="id" value="${e(key)}"><input type="hidden" name="type" value="${type}"><label>Решение<select name="decision">${canApprove?'<option value="approved">Подтвердить локально</option>':""}<option value="revision">Вернуть на доработку</option></select></label><label>Содержательная обратная связь<textarea name="feedback" required minlength="20" maxlength="2000" placeholder="Критерии, сильные стороны, что улучшить; минимум 20 символов"></textarea></label><label class="check"><input type="checkbox" name="reviewed" required>Я рассмотрел ответы и обоснование. Подтверждение не является выдачей официального документа.</label><button class="button small">Сохранить решение</button></form>`;
    }
    function activity() {
      const l = get();
      const labels={"module.read":"Материал отмечен прочитанным","quiz.submitted":"Сохранена учебная попытка","lab.calculated":"Рассчитан сценарий запасов","attempt.reviewed":"Преподаватель рассмотрел попытку","work.submitted":"Сохранена практическая работа","work.reviewed":"Преподаватель рассмотрел работу","goal.changed":"Изменён учебный маршрут"};
      return head("Журнал учебных действий", "Последние 500 локальных событий. Это не серверный аудит и не xAPI/LRS.") + `<div class="panel"><div class="table-scroll"><table><thead><tr><th>Время</th><th>Событие</th><th>Контекст</th></tr></thead><tbody>${l.events.slice().reverse().map(a=>`<tr><td>${stamp(a.at)}</td><td>${e(labels[a.type]||a.type)}</td><td>${e(a.module||a.reference||"Учебный контур")}</td></tr>`).join("")||'<tr><td colspan="3">Событий пока нет.</td></tr>'}</tbody></table></div></div>`;
    }
    let verification = "";
    function verify() {
      return head("Проверка учебной записи", "Локальная проверка записи работодателем. Не публичный реестр и не криптографическая верификация.") + `<div class="panel"><h3>Найдите подтверждённый результат</h3><p class="subtle">Код появляется в карте навыков после проверки преподавателем. Работает только с данными этого браузера. Личные ответы и сообщения здесь не показываются.</p><form id="learning-verify"><label>Код локальной записи<input name="code" required maxlength="80" placeholder="LOCAL-…"></label><button class="button">Найти локальную запись ↗</button></form></div><div id="verification-result" aria-live="polite">${verification}</div><div class="warning">Данные можно изменить на устройстве. Результат не доказывает личность, подлинность навыка или право выдачи квалификации.</div>`;
    }
    let offlineStatus = '';
    function offline() {
      return head('Обучение без сети', 'Публичные материалы доступны из подготовленного пакета. Для входа и сохранения на сервере нужна сеть.') + `<section class="panel"><span class="badge" id="connection-status">${navigator.onLine?'Браузер сообщает: сеть доступна':'Браузер сообщает: нет сети'}</span><h3>Возьмите учебную среду с собой</h3><p>Подготовьте пакет при подключённой сети. После подготовки можно повторно открыть публичную библиотеку без подключения. Новая авторизация и загрузка кабинета требуют сети.</p><button class="button" data-learning-action="prepare-offline">Подготовить офлайн-пакет ↧</button><p id="offline-status" class="subtle" role="status" style="margin-top:15px">${e(offlineStatus)}</p></section><section class="panel"><h3>Что сохраняется</h3><p>Учебные тексты и интерфейс — в Cache Storage; рабочее пространство сохраняется на сервере под вашей учётной записью. При потере сети текущие несохранённые изменения остаются только в открытой вкладке. Не закрывайте её до сохранения или экспорта.</p><h3>Границы надёжности</h3><p class="subtle">Первая загрузка требует сети. Браузер может очистить данные или ограничить хранилище; приватный режим и общие устройства не подходят. Скачанные файлы и публичный кэш не являются защищённым архивом: не вводите реальные документы или производственные секреты. Перед очисткой браузера экспортируйте данные из кабинета администратора.</p></section>`;
    }
    function render(role, tab) {
      if(role==="learner") return ({overview:summary,courses,lab,skills,assistant,offline,work:assignments})[tab]?.() || summary();
      if(role==="teacher"&&tab==="reviews") return reviews();
      if(role==="admin"&&tab==="activity") return activity();
      if(role==="employer") return verify();
      return null;
    }
    function click(t, role) {
      if(t.dataset.learnModule) {
        if(!course(t.dataset.learnModule)) return true;
        selected=t.dataset.learnModule;testing=false;ctx.navigate("learner","courses");return true;
      }
      if(!t.dataset.learningAction) return false;
      if(role!=="learner") return true;
      switch(t.dataset.learningAction) {
        case "prepare-offline":
          t.disabled=true;
          offlineStatus='Загружаем публичный пакет…';
          document.querySelector('#offline-status').textContent=offlineStatus;
          window.SCMOffline.prepare().then(()=>{offlineStatus='Пакет проверен и готов. После первой загрузки можно попробовать повторное открытие без сети.';}).catch(err=>{offlineStatus=err.message;}).finally(()=>{t.disabled=false;const status=document.querySelector('#offline-status');if(status)status.textContent=offlineStatus;});
          break;
        case "back-courses":selected=null;testing=false;ctx.render();break;
        case "mark-read":if(!get().read.includes(selected)){get().read.push(selected);record("module.read",{module:selected});}commit("Прочтение сохранено. Это ещё не подтверждение навыка.");break;
        case "start-test":testing=true;ctx.render();break;
        case "cancel-test":testing=false;ctx.render();break;
      }
      return true;
    }
    function submit(form, role) {
      const f=new FormData(form), l=get();
      const isLearning=["goal-form","course-search","inventory-form","learning-quiz","learning-assistant","learning-verify"].includes(form.id)||form.matches('.learning-work-form,.learning-review-form');
      if(!isLearning)return false;
      const learnerForms=["goal-form","course-search","inventory-form","learning-quiz","learning-assistant"];
      if((learnerForms.includes(form.id)||form.matches('.learning-work-form'))&&role!=="learner")return true;
      if(form.id==="goal-form") {if(course(f.get("goal"))){l.goal=f.get("goal");record("goal.changed",{module:l.goal});commit("Маршрут обновлён");}}
      if(form.id==="course-search") {query=String(f.get("query")).trim();selected=null;ctx.render();}
      if(form.id==="inventory-form") {
        if(['demand','lead','sigma','z'].some(k=>!String(f.get(k)||'').trim())){ctx.toast('Заполните все параметры расчёта');return true;}
        const inputs=Object.fromEntries(["demand","lead","sigma","z"].map(k=>[k,Number(f.get(k))]));
        try{const result=calculateInventory(inputs);l.lab={inputs,result,created:now()};record("lab.calculated");commit("Сценарий рассчитан и сохранён локально");}catch(err){ctx.toast(err.message);}
      }
      if(form.id==="learning-quiz") {
        const m=course(f.get("module")), reason=String(f.get("reason")||"").trim();
        if(!m||reason.length<20||!f.has("declaration")){ctx.toast("Ответьте на вопросы, добавьте обоснование от 20 символов и подтвердите условия.");return true;}
        const answers=m.questions.map((q,i)=>f.get(`q${i}`));
        if(answers.some((a,i)=>a===null||!/^\d+$/.test(a)||Number(a)>=m.questions[i].options.length)){ctx.toast("Ответьте на каждый вопрос");return true;}
        if(l.attempts.length>=100){ctx.toast("Локальный лимит: 100 попыток. Экспортируйте данные и сбросьте локальные данные при необходимости.");return true;}
        const score=answers.reduce((n,a,i)=>n+(Number(a)===m.questions[i].correct?1:0),0);
        l.attempts.push({id:id(),module:m.id,version:1,answers:answers.map(Number),reason,score,status:score===2?"pending":"revision",created:now(),feedback:score===2?"":"Повторите материал и проверьте разбор ошибок. Затем создайте новую попытку."});
        record("quiz.submitted",{module:m.id});testing=false;commit(score===2?"Попытка ждёт рассмотрения преподавателем":"Попытка сохранена. Посмотрите разбор и повторите материал.");
      }
      if(form.id==="learning-assistant") {
        const replies={rop:["Когда размещать заказ?","Сравните позицию запаса с ROP. В нашей модели ROP = d × L + z × σ × √L. Сначала проверьте постоянство срока поставки и независимость спроса.","inventory"],sigma:["Почему √L?","Для независимых дневных величин дисперсии складываются: L × σ². Стандартное отклонение — корень из дисперсии, поэтому σ × √L. При корреляции эта простая модель неприменима.","inventory"],service:["CSL ≠ fill rate","CSL — вероятность цикла без дефицита. Fill rate — доля удовлетворённого объёма спроса. Всегда уточняйте формулу показателя и единицу наблюдения.","service"],sop:["Сначала сравните сценарии","Посчитайте разрыв спроса и мощности. Сравните дополнительную смену, подрядчика и перенос спроса по цене, ограничениям и рискам. Решение принимает ответственный руководитель.","planning"]};
        const r=replies[f.get("topic")];if(r){assistantReply=`<span class="badge">ПОДСКАЗКА ПО ПРАВИЛАМ · НЕ LLM</span><h3>${r[0]}</h3><p>${r[1]}</p><button class="link" data-learn-module="${r[2]}">Источник: учебный модуль →</button>`;ctx.render();}
      }
      if(form.matches('.learning-work-form')) {
        const body=String(f.get("body")||"").trim(), assignment=ctx.state().assignments.find(a=>a.id===f.get("assignment"));
        if(!assignment||body.length<20){ctx.toast("Добавьте решение от 20 символов для существующего задания.");return true;}
        if(l.submissions.length>=100){ctx.toast("Достигнут лимит 100 учебных работ");return true;}
        l.submissions.push({id:id(),assignment:assignment.id,body,created:now(),status:"pending"});record("work.submitted",{reference:assignment.id});commit("Работа сохранена локально и доступна в кабинете преподавателя");
      }
      if(form.matches('.learning-review-form')) {
        if(role!=="teacher")return true;
        const type=f.get("type");
        if(!['attempt','work'].includes(type))return true;
        const list=type==="attempt"?l.attempts:l.submissions;
        const target=list.find(a=>a.id===f.get("id")), feedback=String(f.get("feedback")||"").trim(), decision=f.get("decision");
        if(!target||target.status!=="pending"||feedback.length<20||!f.has("reviewed")||!["approved","revision"].includes(decision)){ctx.toast("Нужны непроверенная работа, обоснованное решение и подтверждение рассмотрения.");return true;}
        if(type==="attempt"&&decision==="approved"&&target.score!==2){ctx.toast("Сначала требуется корректная учебная попытка");return true;}
        target.status=decision;target.feedback=feedback;target.reviewedAt=now();
        if(type==="attempt"&&decision==="approved")target.recordCode=`LOCAL-${id().replace(/-/g,"").toUpperCase()}`;
        record(type==="attempt"?"attempt.reviewed":"work.reviewed",{reference:target.id});commit("Решение преподавателя сохранено локально");
      }
      if(form.id==="learning-verify") {
        if(role!=="employer")return true;
        const code=String(f.get("code")||"").trim().toUpperCase().replace(/^DEMO-/, "LOCAL-");
        const a=l.attempts.find(a=>a.status==="approved"&&a.recordCode===code);
        verification=a?`<section class="panel"><span class="badge">ЛОКАЛЬНАЯ ЗАПИСЬ НАЙДЕНА</span><h3>${e(course(a.module)?.skill)}</h3><p>Участник: слушатель<br>Решение преподавателя: ${stamp(a.reviewedAt)}<br>Редакция задания: ${a.version}</p><p class="subtle">Без цифровой подписи. Только локальный режим сценария проверки.</p></section>`:'<section class="panel"><h3>Запись не найдена</h3><p>Проверьте код. Нужна подтверждённая преподавателем попытка в этом же браузере.</p></section>';
        ctx.render();
      }
      return true;
    }
    return {render,click,submit,resetView:()=>{selected=null;testing=false;assistantReply="";verification="";query="";}};
  }
  return {defaults,ensure,create,calculateInventory,modules};
})();
