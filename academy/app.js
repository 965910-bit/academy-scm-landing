"use strict";
(() => {
  const KEY = "scm-academy-demo-v1";
  const programs = [
    {
      id: "higher",
      code: "01 / ВЫСШЕЕ ОБРАЗОВАНИЕ",
      title: "Бакалавриат и магистратура",
      text: "Планируемые траектории 38.03.02 и 38.04.02 «Менеджмент»: логистика и управление цепями поставок.",
      duration: "4 года / 2 года",
      audience: "degree",
      regulated: true,
      requirement:
        "Лицензия на соответствующий уровень ВО; проверка аккредитации и оснований выдачи документа.",
      document:
        "Вид диплома будет определён после проверки правовых оснований.",
    },
    {
      id: "mba",
      code: "02 / EXECUTIVE EDUCATION",
      title: "MBA / Master in SCM",
      text: "Стратегия цепей поставок, финансы, операционная модель и трансформационный проект руководителя.",
      duration: "Срок уточняется",
      audience: "leaders",
      regulated: true,
      requirement:
        "Лицензия ДПО; проверка формата и правомерности названия квалификации. MBA не равен магистратуре.",
      document:
        "Документ и квалификация будут указаны после юридической проверки.",
    },
    {
      id: "intensive",
      code: "03 / ПРАКТИЧЕСКИЙ ИНТЕНСИВ",
      title: "Два дня. Одна задача.",
      text: "Запасы, S&OP и устойчивость поставок. Разбор кейса и рабочая модель для вашей команды.",
      duration: "2 дня",
      audience: "practice",
      regulated: false,
      requirement:
        "Проверка договора и формата услуги. При реализации образовательной программы требуется проверка лицензирования.",
      document:
        "Демонстрационный формат. Вид подтверждения участия уточняется.",
    },
    {
      id: "retraining",
      code: "04 / ПРОФЕССИОНАЛЬНАЯ ПЕРЕПОДГОТОВКА",
      title: "Управление цепями поставок",
      text: "Системная программа для перехода в SCM: закупки, транспорт, склад, аналитика и итоговая работа.",
      duration: "Срок уточняется",
      audience: "degree",
      regulated: true,
      requirement:
        "Лицензия ДПО; порядок приёма, итоговой аттестации и передачи сведений в ФИС ФРДО.",
      document:
        "Диплом о переподготовке — только при выполнении установленных требований. ФРДО — реестр, не отдельная квалификация.",
    },
    {
      id: "international",
      code: "05 / МЕЖДУНАРОДНАЯ ТРАЕКТОРИЯ",
      title: "Подготовка к международным программам",
      text: "Планируемые маршруты ASCM/APICS, FIATA и MITx MicroMasters. Отдельные требования у каждого правообладателя.",
      duration: "По траектории",
      audience: "leaders",
      regulated: true,
      requirement:
        "Подтверждение прав на партнёрские заявления, условий подготовки и доступа к экзаменам. Проверка лицензирования.",
      document:
        "Собственный курс не даёт сертификат ASCM, FIATA или MIT. Партнёрства не заявляются.",
    },
    {
      id: "corporate",
      code: "06 / ДЛЯ КОМПАНИЙ",
      title: "Внутренняя академия предприятия",
      text: "Матрица компетенций, корпоративные кейсы, обучение команд и измерение изменений в процессах.",
      duration: "Индивидуально",
      audience: "business",
      regulated: false,
      requirement:
        "Проверка модели корпоративной программы, договора и применимых требований к лицензированию.",
      document: "Условия корпоративной программы согласуются отдельно.",
    },
    {
      id: "seminars",
      code: "07 / ПРОФЕССИОНАЛЬНОЕ СООБЩЕСТВО",
      title: "Семинары и открытые разборы",
      text: "Узкая тема, практик отрасли и обсуждение решений. Без обещаний новой профессии за один вечер.",
      duration: "2–4 часа",
      audience: "practice",
      regulated: false,
      requirement:
        "Проверка формата мероприятия и условий участия; отсутствие необоснованных обещаний квалификации.",
      document: "Не заявляется выдача диплома или международной сертификации.",
    },
  ];
  const initial = () => ({
    version: 1,
    settings: Object.fromEntries(
      programs.map((p) => [
        p.id,
        {
          visible: true,
          admissions: false,
          verified: false,
          evidence: "",
          checkedAt: "",
        },
      ]),
    ),
    applications: [],
    documents: [],
    messages: [],
    grades: {},
    assignments: [],
    profile: { name: "Алексей · демо", email: "applicant@example.test" },
    status: "На рассмотрении",
  });
  let state = initial(),
    storageOK = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw?.version === 1) {
      state = {
        ...state,
        ...raw,
        settings: { ...state.settings, ...raw.settings },
      };
      for (const p of programs)
        state.settings[p.id] = {
          ...initial().settings[p.id],
          ...raw.settings?.[p.id],
        };
      for (const field of [
        "applications",
        "documents",
        "messages",
        "assignments",
      ])
        if (!Array.isArray(state[field])) state[field] = [];
    }
  } catch {
    storageOK = false;
  }
  let role = null,
    tab = "overview",
    filter = "all";
  const main = document.querySelector("#main");
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const date = (s) => new Date(s).toLocaleDateString("ru-RU");
  const open = (p) => {
    const s = state.settings[p.id];
    return (
      s.visible &&
      s.admissions &&
      s.verified &&
      s.evidence.trim() &&
      s.checkedAt
    );
  };
  // Every admissions switch requires a recorded review, including non-degree formats.
  for (const p of programs)
    if (!state.settings[p.id].verified) state.settings[p.id].admissions = false;
  function toast(text) {
    const el = document.querySelector("#toast");
    el.textContent = text;
    el.style.display = "block";
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (el.style.display = "none"), 4500);
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storageOK = true;
      return true;
    } catch {
      storageOK = false;
      toast(
        "Хранилище недоступно или переполнено. Изменения останутся только до перезагрузки.",
      );
      return false;
    }
  }
  function shell() {
    return `<div class="container"><div class="workspace"><aside class="sidebar"><div class="profile"><div class="avatar">${role === "applicant" ? "АП" : role === "teacher" ? "ПР" : "АД"}</div><b>${role === "applicant" ? "Алексей · демо" : role === "teacher" ? "Преподаватель" : "Администратор"}</b><p>Демонстрационный кабинет</p></div>${(role ===
    "applicant"
      ? [
          ["overview", "Мой маршрут"],
          ["application", "Подать заявку"],
          ["documents", "Документы"],
          ["messages", "Сообщения"],
        ]
      : role === "teacher"
        ? [
            ["overview", "Учебные группы"],
            ["grading", "Ведомость"],
            ["assignments", "Задания"],
            ["messages", "Сообщения"],
          ]
        : [
            ["overview", "Обзор платформы"],
            ["directions", "Направления и допуски"],
            ["applications", "Заявки"],
            ["messages", "Сообщения"],
          ]
    )
      .map(
        ([id, label]) =>
          `<button data-tab="${id}" class="${tab === id ? "active" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}<button data-action="logout">← На сайт</button></aside><section>${!storageOK ? '<div class="warning">Постоянное хранилище недоступно. Данные могут не сохраниться.</div>' : ""}${dashboard()}</section></div></div>`;
  }
  function heading(title, sub) {
    return `<div class="dashboard-head"><div><span class="eyebrow">${role === "admin" ? "УПРАВЛЕНИЕ АКАДЕМИЕЙ" : role === "teacher" ? "КАБИНЕТ ПРЕПОДАВАТЕЛЯ" : "КАБИНЕТ АБИТУРИЕНТА"}</span><h1>${title}</h1><p class="subtle">${sub}</p></div><span class="badge">ДЕМО</span></div>`;
  }
  function landing() {
    const shown = programs.filter(
      (p) =>
        state.settings[p.id].visible &&
        (filter === "all" || p.audience === filter),
    );
    return `<div class="container"><section class="hero" id="home"><div><span class="eyebrow">ШКОЛА СИСТЕМНОГО УПРАВЛЕНИЯ</span><h1>Цепи поставок.<br>Системное мышление.<br><em>Новый масштаб.</em></h1><p class="lead">Академия для тех, кто проектирует, управляет и меняет цепи поставок. От конкретной задачи до стратегии предприятия.</p><div class="actions"><a class="button" href="#programs">Выбрать направление ↗</a><button class="button outline" data-action="login">Мой учебный маршрут</button></div><span class="micro">Для специалистов, руководителей и корпоративных команд</span></div><div class="visual" aria-label="Схема связей глобальной цепи поставок"><div class="visual-top"><span>SCM / CONNECTED THINKING</span><span>01 — 07</span></div><svg class="network" viewBox="0 0 520 400" fill="none" aria-hidden="true"><path d="M-40 280 130 205 285 285 460 180 560 225M130 205 130 88 285 165 460 65M285 285 285 165 130 88M460 180 460 65M-40 160 130 88 285 165 460 180M130 205 285 165M285 285 460 65" stroke="#a4c2a1" stroke-width="1.3"/><path d="m130 205 155 80 175-105" stroke="#d8f16c" stroke-width="3"/>${[
      [130, 205],
      [285, 285],
      [460, 180],
      [130, 88],
      [285, 165],
      [460, 65],
    ]
      .map(
        ([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="${i < 3 ? 8 : 5}" fill="${i < 3 ? "#d8f16c" : "#8aab92"}"/><circle cx="${x}" cy="${y}" r="18" stroke="#b2d3a6" opacity=".35"/>`,
      )
      .join(
        "",
      )}<text x="92" y="245" fill="#c5d8c3" font-size="10">SOURCE</text><text x="250" y="325" fill="#c5d8c3" font-size="10">TRANSFORM</text><text x="420" y="220" fill="#c5d8c3" font-size="10">DELIVER</text></svg><div class="float-card"><span class="micro">ЕДИНАЯ ЭКОСИСТЕМА</span><b>7 направлений</b><span class="micro">Один системный взгляд</span></div><span class="visual-label">ОТ ЛОКАЛЬНОГО РЕШЕНИЯ К ЦЕЛОЙ СИСТЕМЕ ↗</span></div></section><div class="stats"><div><b>07</b><span>траекторий в архитектуре</span></div><div><b>Практика</b><span>в основе учебного подхода</span></div><div><b>B2B + B2C</b><span>команды и специалисты</span></div><div><b>Одна среда</b><span>поступление и обучение</span></div></div><section class="section" id="programs"><span class="eyebrow">ОБРАЗОВАТЕЛЬНАЯ АРХИТЕКТУРА</span><div class="section-head"><h2>Ваша следующая<br>точка роста</h2><p>Выберите масштаб задачи. Планируемые направления отмечены отдельно: публикация не означает открытый набор.</p></div><div class="filters" aria-label="Фильтр направлений">${[
      ["all", "Все направления"],
      ["leaders", "Руководителям"],
      ["practice", "Практикам"],
      ["degree", "Системное образование"],
      ["business", "Компаниям"],
    ]
      .map(
        ([id, t]) =>
          `<button class="chip ${filter === id ? "active" : ""}" data-filter="${id}" aria-pressed="${filter === id}">${t}</button>`,
      )
      .join(
        "",
      )}</div><div class="grid">${shown.map((p) => `<article class="card"><span class="number">${p.code}</span><h3>${p.title}</h3><p>${p.text}</p><p class="micro">${p.document}</p><div class="card-meta"><span>${p.duration}</span><span class="badge ${open(p) ? "" : "planned"}">${open(p) ? "Демо-приём открыт" : "Подготовка к запуску"}</span></div><button class="button outline small" data-program="${p.id}">${open(p) ? "Подать демо-заявку ↗" : "Посмотреть условия ↗"}</button></article>`).join("") || '<p class="empty">В этой категории пока нет опубликованных направлений.</p>'}</div><p class="micro" style="margin-top:20px">Даты, стоимость и преподаватели будут опубликованы после утверждения программ. Дипломы государственного образца и международные партнёрства не заявляются.</p></section><section class="section" id="approach"><div class="dark"><div><span class="eyebrow">НЕ ПРОСТО НАБОР ЛЕКЦИЙ</span><h2>Учиться видеть<br>всю цепь.</h2><p>Закупки, производство, запасы, транспорт и клиентский сервис — не отдельные дисциплины, а части одного решения.</p><button class="button lime" data-action="login">Открыть личный кабинет ↗</button></div><div class="steps"><div class="step"><b>01</b><div><h3>Определить задачу</h3><p>Выбрать направление и пройти входную диагностику.</p></div></div><div class="step"><b>02</b><div><h3>Проверить на практике</h3><p>Работать с кейсами, данными и обратной связью преподавателя.</p></div></div><div class="step"><b>03</b><div><h3>Собрать решение</h3><p>Связать инструменты в проект изменений для своей цепи поставок.</p></div></div></div></div></section><section class="section" id="enterprise"><div class="enterprise"><div><span class="eyebrow">КОРПОРАТИВНАЯ АКАДЕМИЯ</span><h2>Одна команда.<br>Общий язык управления.</h2><p>От матрицы компетенций до проектной работы: создайте внутреннюю траекторию развития под процессы вашего предприятия.</p></div><button class="button" data-program="corporate">Обсудить формат ↗</button></div></section></div>`;
  }
  function dashboard() {
    if (tab === "messages") return messages();
    if (role === "admin") return admin();
    if (role === "teacher") return teacher();
    if (tab === "application")
      return (
        heading(
          "Новая заявка",
          "Тестовый сценарий поступления. Не отправляется в приёмную комиссию.",
        ) + applicationForm()
      );
    if (tab === "documents")
      return (
        heading(
          "Мои документы",
          "Только демонстрационные названия и статусы, без загрузки содержимого файлов.",
        ) +
        `<div class="warning">Не добавляйте паспорт, СНИЛС или реальные документы. В рабочей версии потребуется защищённое файловое хранилище.</div><form id="document-form" class="panel"><label>Тип документа<select name="type"><option>Документ об образовании · демо</option><option>Заявление · демо</option><option>Портфолио · демо</option></select></label><button class="button">Добавить демо-запись</button></form><div class="panel">${state.documents.length ? state.documents.map((d) => `<p>${esc(d.type)} <span class="badge">Запись добавлена</span> <button class="link" data-remove-doc="${esc(d.id)}">Удалить</button></p>`).join("") : "Пока нет документов."}</div>`
      );
    return (
      heading(
        "Ваш следующий шаг",
        "Выберите программу, подготовьте заявку и отслеживайте её статус.",
      ) +
      `<div class="metrics"><div class="metric"><b>${state.applications.length}</b><span>демо-заявок</span></div><div class="metric"><b>${state.documents.length}</b><span>записей документов</span></div><div class="metric"><b>${programs.filter(open).length}</b><span>направлений с демо-приёмом</span></div></div><div class="two-col"><div class="panel"><h3>Маршрут поступления</h3><p>01 — Выбор программы<br>02 — Заявка и документы<br>03 — Рассмотрение приёмной комиссией<br>04 — Решение и договор</p><button class="button small" data-tab="application">Выбрать программу ↗</button></div><div class="panel"><h3>Мои заявки</h3>${applicationList(false)}</div></div><div class="panel"><h3>Обучение — после зачисления</h3><p class="subtle">Расписание, материалы и задания станут доступны в рабочей системе после зачисления. Сейчас вы в демонстрационном кабинете абитуриента.</p></div>`
    );
  }
  function applicationForm(selected = "") {
    const available = programs.filter(open);
    return available.length
      ? `<form id="application-form" class="panel"><label>Направление<select name="program" required>${available.map((p) => `<option value="${p.id}" ${selected === p.id ? "selected" : ""}>${p.title}</option>`).join("")}</select></label><div class="two-col"><label>Демонстрационное имя<input name="name" required maxlength="100" value="Алексей · демо"></label><label>Тестовый email<input name="email" type="email" required maxlength="150" value="applicant@example.test"></label></div><label>Учебная задача<textarea name="goal" required maxlength="1500" placeholder="Например: снизить избыточные запасы в учебном кейсе"></textarea></label><label class="check"><input type="checkbox" required>Подтверждаю, что использую только вымышленные данные и понимаю, что заявка сохраняется в этом браузере, а не отправляется в академию.</label><button class="button">Сохранить демо-заявку ↗</button></form>`
      : `<div class="empty"><h3>Приём пока не открыт</h3><p>Администратору нужно проверить основания, заполнить сведения и включить приём по направлению.</p><a href="#programs" class="button outline small" data-action="logout">Посмотреть направления</a></div>`;
  }
  function applicationList(edit) {
    if (!state.applications.length)
      return '<p class="subtle">Заявок пока нет.</p>';
    return `<div class="table-scroll"><table><thead><tr><th>Направление</th><th>Заявитель / дата</th><th>Статус</th></tr></thead><tbody>${state.applications.map((a) => `<tr><td>${esc(programs.find((p) => p.id === a.program)?.title || a.program)}</td><td>${esc(a.name)}<br>${esc(a.email)}<br>${date(a.created)}</td><td>${edit ? `<select data-application-status="${esc(a.id)}" aria-label="Статус заявки ${esc(a.name)}">${["На рассмотрении", "Нужны документы", "Приглашение на собеседование", "Принята", "Отклонена"].map((s) => `<option ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}</select>` : `<span class="badge">${esc(a.status)}</span>`}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function admin() {
    if (tab === "directions")
      return (
        heading(
          "Направления и допуски",
          "Настройки меняют каталог и формы в этом браузере, а не на публичном сервере.",
        ) +
        `<div class="warning">Галочка не подтверждает наличие лицензии. Перед открытием реального набора необходима юридическая проверка лицензии, аккредитации, договоров и партнёрских прав. Все направления по умолчанию опубликованы как планируемые, приём закрыт.</div><form id="settings-form">${programs
          .map((p) => {
            const s = state.settings[p.id];
            return `<fieldset class="panel"><legend>${p.code}</legend><h3>${p.title}</h3><p class="subtle">${p.requirement}</p><label class="check"><input type="checkbox" name="${p.id}-visible" ${s.visible ? "checked" : ""}>Показать на витрине</label><label class="check"><input type="checkbox" name="${p.id}-verified" ${s.verified ? "checked" : ""}>Основания и условия проверены ответственным лицом (демо)</label><div class="two-col"><label>Реквизиты оснований / результат проверки<input name="${p.id}-evidence" maxlength="500" value="${esc(s.evidence)}" placeholder="Лицензия, реестр, договор или обоснование формата"></label><label>Дата проверки<input type="date" name="${p.id}-date" max="${new Date().toISOString().slice(0, 10)}" value="${esc(s.checkedAt)}"></label></div><label class="check"><input type="checkbox" name="${p.id}-admissions" ${s.admissions ? "checked" : ""}>Открыть демо-приём (нужны публикация, проверка, реквизиты и дата)</label></fieldset>`;
          })
          .join("")}<button class="button">Сохранить настройки</button></form>`
      );
    if (tab === "applications")
      return (
        heading("Приёмная комиссия", "Заявки, созданные в этом браузере.") +
        `<div class="panel">${applicationList(true)}</div>`
      );
    return (
      heading(
        "Платформа под контролем",
        "Семь направлений. Раздельное управление публикацией и приёмом.",
      ) +
      `<div class="metrics"><div class="metric"><b>${programs.filter((p) => state.settings[p.id].visible).length}/7</b><span>опубликовано</span></div><div class="metric"><b>${programs.filter(open).length}</b><span>демо-приём открыт</span></div><div class="metric"><b>${state.applications.length}</b><span>заявок в браузере</span></div></div><div class="panel"><h3>Готовность к запуску</h3><p>Витрина → проверка оснований → публикация условий → открытие приёма.</p><p class="subtle">Для реальной эксплуатации ещё нужны серверная авторизация и роли, база данных, аудит изменений, защищённые документы, договоры и согласия.</p><button class="button small" data-tab="directions">Настроить направления ↗</button></div><div class="panel"><h3>Данные прототипа</h3><p class="subtle">Экспорт содержит заявки и сообщения из этого браузера. Сброс удаляет только данные нового раздела academy/.</p><div class="actions"><button class="button outline small" data-action="export">Экспорт JSON</button><button class="button outline small" data-action="reset">Сбросить демо-данные</button></div></div>`
    );
  }
  const learners = [
    ["student-1", "Анна · демо"],
    ["student-2", "Михаил · демо"],
    ["student-3", "Елена · демо"],
  ];
  function teacher() {
    if (tab === "grading")
      return (
        heading(
          "Ведомость",
          "Учебная группа SCM-01 · демонстрационные слушатели",
        ) +
        `<div class="panel"><h3>Практикум: управление запасами</h3><div class="table-scroll"><table><thead><tr><th>Слушатель</th><th>Результат</th></tr></thead><tbody>${learners.map(([id, name]) => `<tr><td>${name}</td><td><select data-grade="${id}" aria-label="Результат: ${name}">${["Не проверено", "На доработку", "Зачёт"].map((g) => `<option ${state.grades[id] === g ? "selected" : ""}>${g}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div><p class="micro">Ведомость учебная, не является документом об аттестации.</p></div>`
      );
    if (tab === "assignments")
      return (
        heading(
          "Задания группы",
          "Создайте учебное задание и критерии оценки.",
        ) +
        `<form class="panel" id="assignment-form"><label>Тема<input name="title" required maxlength="150" placeholder="Расчёт страхового запаса"></label><label>Задание и критерии<textarea name="body" required maxlength="3000"></textarea></label><label>Срок сдачи<input type="date" name="deadline" required></label><button class="button">Добавить задание</button></form>${state.assignments.map((a) => `<article class="panel"><span class="badge">SCM-01 · до ${esc(a.deadline)}</span><h3>${esc(a.title)}</h3><p style="white-space:pre-wrap">${esc(a.body)}</p></article>`).join("")}`
      );
    return (
      heading(
        "Рабочий стол преподавателя",
        "Учебные группы, задания и обратная связь в одном месте.",
      ) +
      `<div class="metrics"><div class="metric"><b>01</b><span>демо-группа</span></div><div class="metric"><b>03</b><span>демо-слушателя</span></div><div class="metric"><b>${state.assignments.length}</b><span>заданий создано</span></div></div><div class="panel"><span class="badge">SCM-01 · ДЕМО</span><h3>Основы системного управления запасами</h3><p class="subtle">Учебная группа для проверки интерфейса. Не настоящий поток академии.</p><div class="actions"><button class="button small" data-tab="grading">Открыть ведомость ↗</button><button class="button outline small" data-tab="assignments">Создать задание</button></div></div>`
    );
  }
  function messages() {
    return (
      heading(
        "Сообщения",
        "Локальная демонстрационная переписка между ролями, без отправки email.",
      ) +
      `<div class="panel">${state.messages.length ? state.messages.map((m) => `<article><span class="badge">${esc({ applicant: "Абитуриент", teacher: "Преподаватель", admin: "Администратор" }[m.role])} · ${date(m.created)}</span><p style="white-space:pre-wrap">${esc(m.body)}</p></article>`).join("") : "Сообщений пока нет."}</div><form id="message-form" class="panel"><label>Новое сообщение<textarea name="body" required maxlength="2000" placeholder="Только вымышленные сведения"></textarea></label><button class="button">Сохранить сообщение</button></form>`
    );
  }
  function render() {
    main.innerHTML = role ? shell() : landing();
    document.querySelector("#account-button").textContent = role
      ? "Сменить роль ↗"
      : "Личный кабинет ↗";
  }
  function login() {
    document.querySelector("#login-dialog").showModal();
  }
  document.querySelector("#account-button").addEventListener("click", login);
  document
    .querySelectorAll("dialog .close")
    .forEach((button) =>
      button.addEventListener("click", () => button.closest("dialog").close()),
    );
  document.querySelector("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    role = new FormData(e.target).get("role");
    tab = "overview";
    document.querySelector("#login-dialog").close();
    location.hash = "cabinet";
    render();
    window.scrollTo(0, 0);
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button,a");
    if (!t) return;
    if (t.dataset.filter) {
      const top = window.scrollY;
      filter = t.dataset.filter;
      render();
      window.scrollTo(0, top);
      return;
    }
    if (t.dataset.tab) {
      tab = t.dataset.tab;
      render();
      return;
    }
    if (t.dataset.removeDoc) {
      state.documents = state.documents.filter(
        (d) => d.id !== t.dataset.removeDoc,
      );
      save();
      render();
      return;
    }
    if (t.dataset.program) {
      const p = programs.find((p) => p.id === t.dataset.program);
      if (open(p)) {
        role = "applicant";
        tab = "application";
        location.hash = "cabinet";
        render();
        main.querySelector("[name=program]").value = p.id;
        window.scrollTo(0, 0);
      } else {
        document.querySelector("#program-detail").innerHTML =
          `<span class="eyebrow">${p.code}</span><h2>${p.title}</h2><span class="badge planned">Подготовка к запуску</span><p style="margin-top:20px">${p.text}</p><h3>До открытия набора</h3><p>${p.requirement}</p><h3>Документ и результат</h3><p>${p.document}</p><p class="subtle">Стоимость, даты и условия поступления пока не утверждены. Оплата и запись на обучение недоступны.</p>`;
        document.querySelector("#program-dialog").showModal();
      }
      return;
    }
    switch (t.dataset.action) {
      case "login":
        login();
        break;
      case "logout":
        role = null;
        tab = "overview";
        render();
        location.hash = t.hash || "home";
        break;
      case "reset":
        if (confirm("Удалить все локальные данные демо-академии?")) {
          state = initial();
          for (const p of programs) state.settings[p.id].admissions = false;
          save();
          render();
          toast("Демо-данные сброшены");
        }
        break;
      case "export": {
        const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "scm-academy-demo.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        break;
      }
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.grade && role === "teacher") {
      state.grades[t.dataset.grade] = t.value;
      save();
      toast("Результат сохранён в этом браузере");
    }
    if (t.dataset.applicationStatus && role === "admin") {
      const a = state.applications.find(
        (a) => a.id === t.dataset.applicationStatus,
      );
      if (a) {
        a.status = t.value;
        save();
        toast("Статус обновлён");
      }
    }
  });
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (form.id === "login-form") return;
    e.preventDefault();
    const f = new FormData(form);
    const id = () =>
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    if (form.id === "settings-form" && role === "admin") {
      const next = {};
      for (const p of programs) {
        const s = {
          visible: f.has(p.id + "-visible"),
          verified: f.has(p.id + "-verified"),
          admissions: f.has(p.id + "-admissions"),
          evidence: String(f.get(p.id + "-evidence")).trim(),
          checkedAt: String(f.get(p.id + "-date")),
        };
        if (
          s.admissions &&
          (!s.visible ||
            !s.verified ||
            !s.evidence ||
            !s.checkedAt ||
            s.checkedAt > new Date().toISOString().slice(0, 10))
        ) {
          toast(
            `«${p.title}»: для приёма нужны публикация, проверка, реквизиты и корректная дата.`,
          );
          return;
        }
        next[p.id] = s;
      }
      state.settings = next;
      save();
      render();
      toast("Настройки сохранены в этом браузере");
    }
    if (form.id === "application-form" && role === "applicant") {
      const p = programs.find((p) => p.id === f.get("program"));
      if (!p || !open(p)) {
        toast("Приём по этому направлению закрыт");
        render();
        return;
      }
      if (!String(f.get("name")).trim() || !String(f.get("goal")).trim()) {
        toast("Заполните имя и учебную задачу");
        return;
      }
      state.applications.push({
        id: id(),
        program: p.id,
        name: String(f.get("name")).trim(),
        email: f.get("email"),
        goal: String(f.get("goal")).trim(),
        status: "На рассмотрении",
        created: new Date().toISOString(),
      });
      save();
      tab = "overview";
      render();
      toast("Демо-заявка сохранена. Она не отправлена в академию.");
    }
    if (form.id === "document-form" && role === "applicant") {
      state.documents.push({ id: id(), type: f.get("type") });
      save();
      render();
    }
    if (form.id === "message-form" && role) {
      const body = String(f.get("body")).trim();
      if (!body) return;
      state.messages.push({
        id: id(),
        role,
        body,
        created: new Date().toISOString(),
      });
      save();
      render();
      toast("Сообщение сохранено локально");
    }
    if (form.id === "assignment-form" && role === "teacher") {
      const title = String(f.get("title")).trim(),
        body = String(f.get("body")).trim();
      if (!title || !body) {
        toast("Заполните тему и задание");
        return;
      }
      state.assignments.push({
        id: id(),
        title,
        body,
        deadline: f.get("deadline"),
      });
      save();
      render();
      toast("Задание добавлено");
    }
  });
  window.addEventListener("hashchange", () => {
    if (
      ["#home", "#programs", "#approach", "#enterprise"].includes(
        location.hash,
      ) &&
      role
    ) {
      role = null;
      render();
    }
    document
      .querySelector(
        location.hash === "#programs"
          ? "#programs"
          : location.hash === "#approach"
            ? "#approach"
            : location.hash === "#enterprise"
              ? "#enterprise"
              : "#home",
      )
      ?.scrollIntoView();
  });
  render();
})();
