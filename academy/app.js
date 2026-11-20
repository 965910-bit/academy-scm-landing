"use strict";
(() => {
 function start() {
  const identity = window.SCMIdentity;
  const KEY = "scm-academy-workspace-v2";
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
        "Учебный формат. Вид подтверждения участия уточняется.",
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
    learning: window.SCMLearning.defaults(),
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
    profile: { name: "Алексей", email: "applicant@example.test" },
    status: "На рассмотрении",
  });
  let state = initial(),
    storageOK = true;
  try {
    const raw = identity ? identity.workspace : null;
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
  // Preserve existing local records while removing obsolete generated labels.
  const cleanLegacyName = value => typeof value === 'string' ? value.replace(/ · демо$/i, '') : value;
  if (state.profile) state.profile.name = cleanLegacyName(state.profile.name);
  for (const application of state.applications) application.name = cleanLegacyName(application.name);
  for (const document of state.documents) document.type = cleanLegacyName(document.type);
  window.SCMLearning.ensure(state);
  let role = null,
    tab = "overview",
    filter = "all";
  if (identity?.user) { role = (identity.target || identity.user).role; tab = ["admin","admissions","superadmin"].includes(role)?"accounts":"workflows"; }
  if(identity?.user && sessionStorage.getItem("scm-open-assembly")==="1"){tab="assembly";sessionStorage.removeItem("scm-open-assembly");}
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
      if (identity?.remote || identity?.local) { return identity.save(state); }
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
  const learning = window.SCMLearning.create({
    state: () => state, esc, save, render, toast,
    navigate: (nextRole, nextTab) => { role = nextRole; tab = nextTab; location.hash = 'cabinet'; render(); window.scrollTo(0,0); }
  });
  const curriculum = window.SCMCurriculum.create({ state: () => state, esc, save, render, toast });
  const studyTools = window.SCMStudyTools.create({ state: () => state, esc, save, render,
    openAssignment: id => { curriculum.openAllocation(id); role = "learner"; tab = "studyplan"; render(); window.scrollTo(0,0); }
  });
  const decisionLab = window.SCMDecisionLab.create({state: () => state, esc, save, render, toast});
  const studentCard = window.SCMStudentCard.create({state:()=>state,save,render,toast,
    name:()=> (identity?.target||identity?.user)?.name||state.profile?.name||'',
    isAdmin:()=>identity?.user?.role==='admin'
  });
  const assembly=window.SCMAssembly?.create({render,toast});
  const workflows = window.SCMWorkflows?.create({identity,render,toast,programs});
  const manualRecords = window.SCMManualRecords.create({state:()=>state,save,render,toast});
  const documents = window.SCMDocuments.create({state: () => state, esc, save, render, toast,openStudentCard:()=>{tab='student-card';render();}});
  const knowledge = window.SCMKnowledge.create({state: () => state, esc, save, render, toast});
  const portal = window.SCMPortal.create({
    programs, settings: () => state.settings, isOpen: open, esc,
    apply: p => { if (!identity?.user || identity.user.role !== "applicant") {login();return;} role = "applicant"; tab = "application"; location.hash = "cabinet"; render(); main.querySelector("[name=program]").value = p.id; window.scrollTo(0, 0); }
  });
  function shell() {
    const roles = { applicant: ['АП','Абитуриент'], learner: ['СЛ','Слушатель'], teacher: ['ПР','Преподаватель'], admin: ['АД','Администратор'], employer: ['РБ','Работодатель'], curator:['КР','Куратор / методист'], alumni:['ВП','Выпускник'], auditor:['АУ','Аудитор'], superadmin:['СА','Суперадминистратор'], admissions: ['ПК','Приёмная комиссия'] };
    const menus = {
      applicant: [['overview','Мой маршрут'],['application','Подать заявку'],['intake-documents','Документы для приёма'],['documents','Документы'],['student-card','Студенческий билет'],['messages','Сообщения']],
      learner: [['overview','Мой учебный маршрут'],['studyplan','Назначенное обучение'],['planner','Сроки и учебный план'],['courses','Учебные модули'],['lab','Лаборатория запасов'],['decisionlab','Практикум решений'],['knowledge','База знаний'],['documents','Документы'],['student-card','Студенческий билет'],['skills','Карта навыков'],['work','Практические задания'],['assistant','Предметный помощник'],['offline','Без сети'],['messages','Сообщения']],
      teacher: [['overview','Учебные группы'],['decisionlab','Практикум решений'],['knowledge','База знаний'],['documents','Документы'],['student-card','Студенческий билет'],['responses','Назначенные работы'],['monitoring','Мониторинг обучения'],['reviews','Проверка работ'],['grading','Учебная ведомость'],['assignments','Создать задание'],['messages','Сообщения']],
      admissions: [['accounts','Учётные записи'],['documents','Документы']],
      admin: [['accounts','Пользователи и права'],['overview','Обзор платформы'],['decisionlab','Практикум решений'],['knowledge','База знаний'],['documents','Документы'],['student-card','Студенческий билет'],['library','Библиотека модулей'],['students','Студенты и группы'],['allocations','Назначение обучения'],['responses','Проверка назначений'],['monitoring','Мониторинг обучения'],['directions','Направления и допуски'],['applications','Заявки'],['activity','Учебные события'],['messages','Сообщения']],
      employer: [['overview','Проверка учебной записи'],['documents','Документы']],
      curator:[['workflows','Сопровождение потоков'],['documents','Документы']],
      alumni:[['workflows','Архив и развитие'],['documents','Документы']],
      auditor:[['workflows','Журналы и контроль'],['documents','Документы']],
      superadmin:[['accounts','Пользователи и права'],['workflows','Платформа и процессы'],['documents','Документы']]
    };
    const [avatar,name] = roles[role] || roles.applicant;
    return `<div class="container"><div class="workspace"><aside class="sidebar"><div class="profile"><div class="avatar">${avatar}</div><b>${esc((identity?.target||identity?.user)?.name||name)}</b><p>${name}</p></div>${[...(assembly?[['assembly','Все инструменты']]:[]),...(workflows?[['workflows','Рабочий центр']]:[]),...(menus[role]||menus.applicant).filter(([id])=>id!=='workflows'),...([['resources-regulations','Нормативная база'],['resources-classifiers','ОКПДТР–2026'],['resources-guides','Библиотека знаний']]),...(role==='auditor'?[]:[['manual-records','Ручные записи']])].map(([id,label])=>`<button data-tab="${id}" class="${window.SCMUnifiedPages?.route()!=null ? (id==='resources-'+window.SCMUnifiedPages.route().split('/')[0]?'active':'') : tab===id?'active':''}">${label}</button>`).join('')}<button data-action="export">Экспорт рабочего пространства</button><button data-action="logout">Выйти из учётной записи</button></aside><section>${!storageOK?'<div class="warning">Постоянное хранилище недоступно. Данные могут не сохраниться.</div>':''}${studentCard.corner(role)}${identity?.banner?.()||''}${dashboard()}</section></div></div>`;
  }
  function heading(title, sub) {
    return `<div class="dashboard-head"><div><span class="eyebrow">${role === "admin" ? "УПРАВЛЕНИЕ АКАДЕМИЕЙ" : role === "teacher" ? "КАБИНЕТ ПРЕПОДАВАТЕЛЯ" : "КАБИНЕТ АБИТУРИЕНТА"}</span><h1>${title}</h1><p class="subtle">${sub}</p></div><span class="badge">КАБИНЕТ</span></div>`;
  }
  function landing() {
    const shown = programs.filter(
      (p) =>
        state.settings[p.id].visible &&
        (filter === "all" || p.audience === filter),
    );
    return `<div class="container"><section class="hero" id="home"><div><span class="eyebrow">ПРОФЕССИОНАЛЬНОЕ И КОРПОРАТИВНОЕ РАЗВИТИЕ</span><h1>Управление<br>цепями поставок.<br><em>Решения для бизнеса.</em></h1><p class="lead">Закупки, планирование, производство и логистика. Развитие компетенций специалистов, руководителей и корпоративных команд.</p><div class="actions"><a class="button" href="#programs">Выбрать направление ↗</a><a class="button outline" href="#enterprise">Для корпоративных команд ↗</a></div><div class="hero-topics"><span>SCM & логистика</span><span>Лидерство</span><span>Технологии</span></div></div><div class="operations-cover"><img src="assets/operations-cover.jpg" alt="Визуализация контейнерного терминала — отраслевая среда SCM" width="1536" height="1024" fetchpriority="high"><div class="operations-caption"><span>АКАДЕМИЯ SCM</span><strong>Системный взгляд.<br>Управленческий подход.</strong><small>Закупки / Планирование / Логистика</small></div></div></section><div class="stats"><div><b>07</b><span>траекторий в архитектуре</span></div><div><b>Практика</b><span>в основе учебного подхода</span></div><div><b>B2B + B2C</b><span>команды и специалисты</span></div><div><b>Одна среда</b><span>поступление и обучение</span></div></div><section class="product-strip" aria-label="Учебные инструменты"><div><span class="eyebrow">УЖЕ МОЖНО ПОПРОБОВАТЬ</span><h2>Меньше обещаний.<br>Больше практики.</h2></div><button data-role-entry="learner"><span>▦</span><b>SCM-лаборатория</b><small>Сценарии и прозрачные расчёты ↗</small></button><button data-role-entry="learner"><span>◎</span><b>Карта навыков</b><small>От теории к проверке результата ↗</small></button><button data-role-entry="teacher"><span>✳</span><b>Обратная связь</b><small>Решение остаётся за человеком ↗</small></button></section><section class="section" id="programs"><span class="eyebrow">ОБРАЗОВАТЕЛЬНАЯ АРХИТЕКТУРА</span><div class="section-head"><h2>Направления<br>профессионального развития</h2><p>Выберите масштаб задачи. Планируемые направления отмечены отдельно: публикация не означает открытый набор.</p></div><div class="actions"><a href="#/catalog" class="button">Открыть полный каталог ↗</a><a href="#/advisor" class="button outline">Подобрать обучение</a></div><div class="filters" aria-label="Фильтр направлений">${[
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
      )}</div><div class="grid">${shown.map((p) => `<article class="card" data-direction="${p.id}"><span class="course-icon" aria-hidden="true">${{ higher: "◈", mba: "↗", intensive: "ϟ", retraining: "▦", international: "◎", corporate: "⬡", seminars: "✳" }[p.id]}</span><span class="number">${p.code}</span><h3>${p.title}</h3><p>${p.text}</p><p class="micro">${p.document}</p><div class="card-meta"><span>${p.duration}</span><span class="badge ${open(p) ? "" : "planned"}">${open(p) ? "Приём открыт" : "Подготовка к запуску"}</span></div><a class="portal-detail-link" href="#/program/${p.id}">Подробнее о программе →</a><button class="button outline small" data-program="${p.id}">${open(p) ? "Подать заявку ↗" : "Посмотреть условия ↗"}</button></article>`).join("") || '<p class="empty">В этой категории пока нет опубликованных направлений.</p>'}</div><p class="micro" style="margin-top:20px">Даты, стоимость и преподаватели будут опубликованы после утверждения программ. Дипломы государственного образца и международные партнёрства не заявляются.</p></section><section class="section" id="approach"><div class="dark"><div class="approach-intro"><span class="eyebrow">НЕ ПРОСТО НАБОР ЛЕКЦИЙ</span><h2>Учиться видеть<br>всю цепь.</h2><p>Закупки, производство, запасы, транспорт и клиентский сервис — не отдельные дисциплины, а части одного решения.</p><button class="button lime" data-action="login">Открыть личный кабинет ↗</button></div><div class="steps"><div class="step"><b>01</b><div><h3>Определить задачу</h3><p>Выбрать направление и сформулировать задачу для развития.</p></div></div><div class="step"><b>02</b><div><h3>Проверить на практике</h3><p>Работать с кейсами, данными и обратной связью преподавателя.</p></div></div><div class="step"><b>03</b><div><h3>Собрать решение</h3><p>Связать инструменты в проект изменений для своей цепи поставок.</p></div></div></div></div></section><section class="section" id="platform"><span class="eyebrow">ВАША ТОЧКА ВХОДА</span><div class="section-head"><h2>Не просто учиться.<br>Быть частью системы.</h2><p>У каждого своя роль. У всех — общее пространство для развития.</p></div><div class="role-grid"><article class="role-card"><span class="role-symbol" aria-hidden="true">↗</span><span class="number">01 / ПОСТУПЛЕНИЕ</span><h3>Мой следующий уровень</h3><p>Выбор направления, заявка и её статус. Понятный маршрут от интереса к поступлению.</p><button class="button outline" data-role-entry="applicant">Я абитуриент ↗</button></article><article class="role-card"><span class="role-symbol" aria-hidden="true">✳</span><span class="number">02 / ПРЕПОДАВАНИЕ</span><h3>Делиться опытом. Менять мышление.</h3><p>Учебные группы, задания и ведомость — инструменты преподавателя в одном кабинете.</p><button class="button outline" data-role-entry="teacher">Я преподаватель ↗</button></article><article class="role-card"><span class="role-symbol" aria-hidden="true">◈</span><span class="number">03 / УПРАВЛЕНИЕ</span><h3>Вся академия под контролем</h3><p>Семь направлений, условия запуска и заявки. Раздельное управление публикацией и приёмом.</p><button class="button outline" data-role-entry="admin">Управление платформой ↗</button></article></div></section><section class="section" id="enterprise"><div class="enterprise"><div><span class="eyebrow">КОРПОРАТИВНАЯ АКАДЕМИЯ</span><h2>Одна команда.<br>Общий язык управления.</h2><p>От матрицы компетенций до проектной работы: создайте внутреннюю траекторию развития под процессы вашего предприятия.</p></div><button class="button" data-program="corporate">Обсудить формат ↗</button></div></section><section class="section faq" id="questions"><span class="eyebrow">ЕСТЬ ВОПРОСЫ?</span><div class="faq-layout"><h2>Всё важное.<br>Без мелкого шрифта.</h2><div><details><summary>Какие направления уже открыты?</summary><p>Текущий статус указан на карточке каждого направления. По умолчанию все программы планируются, приём закрыт. Администратор может открыть локальный приём после заполнения оснований проверки.</p></details><details><summary>Какой документ я получу?</summary><p>Это зависит от программы и подтверждённых правовых оснований. Условия выдачи документов будут опубликованы до реального набора. Международные сертификаты не выдаются автоматически за собственный курс академии.</p></details><details><summary>Можно ли обучить команду компании?</summary><p>Для этого предусмотрено направление «Внутренняя академия предприятия». Состав программы, формат и условия нужно согласовать отдельно. Пока раздел описывает будущий сценарий.</p></details><details><summary>Как получить доступ к учебной платформе?</summary><p>Сейчас это учебная платформа. Для доступа нужна учётная запись, которую создаёт администратор или приёмная комиссия. Права определяются назначенной ролью.</p></details></div></div></section></div>`;
  }
  function dashboard() {
    if(window.SCMUnifiedPages?.route()!==null && window.SCMUnifiedPages?.route()!==undefined)return window.SCMUnifiedPages.placeholder();
    const assemblyScreen=assembly?.render(role,tab);if(assemblyScreen!=null)return assemblyScreen;
    const workflowScreen=workflows?.render(role,tab);
    if(workflowScreen!=null)return workflowScreen;
    const manualScreen=manualRecords.render(role,tab);
    if(manualScreen!==null)return manualScreen;
    const accountScreen = identity?.render?.(role, tab);
    if (accountScreen != null) return accountScreen;
    const studentCardScreen = studentCard.render(role, tab);
    if (studentCardScreen !== null) return studentCardScreen;
    const documentScreen = documents.render(role, tab);
    if (documentScreen !== null) return documentScreen;
    const knowledgeScreen = knowledge.render(role, tab);
    if (knowledgeScreen !== null) return knowledgeScreen;
    const decisionScreen = decisionLab.render(role, tab);
    if (decisionScreen !== null) return decisionScreen;
    const studyScreen = studyTools.render(role, tab);
    if (studyScreen !== null) return studyScreen;
    const curriculumScreen = curriculum.render(role, tab);
    if (curriculumScreen !== null) return curriculumScreen;
    if (tab === "messages") return messages();
    const learningScreen = learning.render(role, tab);
    if (learningScreen !== null) return learningScreen;
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
    if (tab === "intake-documents")
      return (
        heading(
          "Мои документы",
          "Только условные названия и статусы, без загрузки содержимого файлов.",
        ) +
        `<div class="warning">Не добавляйте паспорт, СНИЛС или реальные документы. В рабочей версии потребуется защищённое файловое хранилище.</div><form id="document-form" class="panel"><label>Тип документа<select name="type"><option>Документ об образовании</option><option>Заявление</option><option>Портфолио</option></select></label><button class="button">Добавить запись</button></form><div class="panel">${state.documents.length ? state.documents.map((d) => `<p>${esc(d.type)} <span class="badge">Запись добавлена</span> <button class="link" data-remove-doc="${esc(d.id)}">Удалить</button></p>`).join("") : "Пока нет документов."}</div>`
      );
    return (
      heading(
        "Ваш следующий шаг",
        "Выберите программу, подготовьте заявку и отслеживайте её статус.",
      ) +
      `<div class="metrics"><div class="metric"><b>${state.applications.length}</b><span>локальных заявок</span></div><div class="metric"><b>${state.documents.length}</b><span>записей документов</span></div><div class="metric"><b>${programs.filter(open).length}</b><span>направлений с локальным приёмом</span></div></div><div class="two-col"><div class="panel"><h3>Маршрут поступления</h3><p>01 — Выбор программы<br>02 — Заявка и документы<br>03 — Рассмотрение приёмной комиссией<br>04 — Решение и договор</p><button class="button small" data-tab="application">Выбрать программу ↗</button></div><div class="panel"><h3>Мои заявки</h3>${applicationList(false)}</div></div><div class="panel"><h3>Обучение — после зачисления</h3><p class="subtle">Расписание, материалы и задания станут доступны в рабочей системе после зачисления. Сейчас вы в локальном кабинете абитуриента.</p></div>`
    );
  }
  function applicationForm(selected = "") {
    const available = programs.filter(open);
    return available.length
      ? `<form id="application-form" class="panel"><label>Направление<select name="program" required>${available.map((p) => `<option value="${p.id}" ${selected === p.id ? "selected" : ""}>${p.title}</option>`).join("")}</select></label><div class="two-col"><label>ФИО<input name="name" required maxlength="100" value="${esc(identity?.remote?(identity.target||identity.user)?.name||'':'Алексей')}"></label><label>Email<input name="email" type="email" required maxlength="150" value="${identity?.remote?'':'applicant@example.test'}"></label></div><label>Учебная задача<textarea name="goal" required maxlength="1500" placeholder="Например: снизить избыточные запасы в учебном кейсе"></textarea></label><label class="check"><input type="checkbox" required>Понимаю, что это запись рабочего пространства. Рассмотрение учебной частью и зачисление оформляются отдельно.</label><button class="button">Сохранить заявку ↗</button></form>`
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
          "Настройки меняют каталог и формы в этом рабочем пространстве, а не на публичном сервере.",
        ) +
        `<div class="warning">Галочка не подтверждает наличие лицензии. Перед открытием реального набора необходима юридическая проверка лицензии, аккредитации, договоров и партнёрских прав. Все направления по умолчанию опубликованы как планируемые, приём закрыт.</div><form id="settings-form">${programs
          .map((p) => {
            const s = state.settings[p.id];
            return `<fieldset class="panel"><legend>${p.code}</legend><h3>${p.title}</h3><p class="subtle">${p.requirement}</p><label class="check"><input type="checkbox" name="${p.id}-visible" ${s.visible ? "checked" : ""}>Показать на витрине</label><label class="check"><input type="checkbox" name="${p.id}-verified" ${s.verified ? "checked" : ""}>Основания и условия проверены ответственным лицом (локальная настройка)</label><div class="two-col"><label>Реквизиты оснований / результат проверки<input name="${p.id}-evidence" maxlength="500" value="${esc(s.evidence)}" placeholder="Лицензия, реестр, договор или обоснование формата"></label><label>Дата проверки<input type="date" name="${p.id}-date" max="${new Date().toISOString().slice(0, 10)}" value="${esc(s.checkedAt)}"></label></div><label class="check"><input type="checkbox" name="${p.id}-admissions" ${s.admissions ? "checked" : ""}>Открыть локальный приём (нужны публикация, проверка, реквизиты и дата)</label></fieldset>`;
          })
          .join("")}<button class="button">Сохранить настройки</button></form>`
      );
    if (tab === "applications")
      return (
        heading("Приёмная комиссия", "Заявки, созданные в этом рабочем пространстве.") +
        `<div class="panel">${applicationList(true)}</div>`
      );
    return (
      heading(
        "Платформа под контролем",
        "Семь направлений. Раздельное управление публикацией и приёмом.",
      ) +
      `<div class="metrics"><div class="metric"><b>${programs.filter((p) => state.settings[p.id].visible).length}/7</b><span>опубликовано</span></div><div class="metric"><b>${programs.filter(open).length}</b><span>локальный приём открыт</span></div><div class="metric"><b>${state.applications.length}</b><span>заявок в браузере</span></div></div><div class="panel"><h3>Учебно-методическая база</h3><p>12 вводных модулей и семь маршрутов. Студентов в локальном реестре: ${state.curriculum?.students?.length || 0}; назначений: ${state.curriculum?.allocations?.length || 0}.</p><div class="actions"><button class="button small" data-tab="library">Библиотека модулей ↗</button><button class="button outline small" data-tab="students">Добавить студента</button><button class="button outline small" data-tab="allocations">Назначить обучение</button></div></div><div class="panel"><h3>Готовность к запуску</h3><p>Витрина → проверка оснований → публикация условий → открытие приёма.</p><p class="subtle">Учётные записи и рабочие пространства защищены серверной сессией. Официальные документы, договоры и электронные подписи подключаются отдельными процессами.</p><button class="button small" data-tab="directions">Настроить направления ↗</button></div><div class="panel"><h3>Рабочие данные</h3><p class="subtle">Экспорт содержит заявки и сообщения из этого браузера. Сброс удаляет только данные нового раздела academy/.</p><div class="actions"><button class="button outline small" data-action="export">Экспорт JSON</button><button class="button outline small" data-action="reset">Сбросить локальные данные</button></div></div>`
    );
  }
  const learners = [
    ["student-1", "Анна"],
    ["student-2", "Михаил"],
    ["student-3", "Елена"],
  ];
  function teacher() {
    if (tab === "grading")
      return (
        heading(
          "Ведомость",
          "Учебная группа SCM-01 · вымышленные слушатели",
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
      `<div class="metrics"><div class="metric"><b>01</b><span>учебная группа</span></div><div class="metric"><b>03</b><span>учебных слушателя</span></div><div class="metric"><b>${state.assignments.length}</b><span>заданий создано</span></div></div><div class="panel"><span class="badge">SCM-01 · КАБИНЕТ</span><h3>Основы системного управления запасами</h3><p class="subtle">Учебная группа для проверки интерфейса. Не настоящий поток академии.</p><div class="actions"><button class="button small" data-tab="grading">Открыть ведомость ↗</button><button class="button outline small" data-tab="assignments">Создать задание</button></div></div>`
    );
  }
  function messages() {
    return (
      heading(
        "Сообщения",
        "Локальная переписка между ролями, без отправки email.",
      ) +
      `<div class="panel">${state.messages.length ? state.messages.map((m) => `<article><span class="badge">${esc({ applicant: "Абитуриент", learner: "Слушатель", teacher: "Преподаватель", admin: "Администратор", employer: "Работодатель" }[m.role])} · ${date(m.created)}</span><p style="white-space:pre-wrap">${esc(m.body)}</p></article>`).join("") : "Сообщений пока нет."}</div><form id="message-form" class="panel"><label>Новое сообщение<textarea name="body" required maxlength="2000" placeholder="Только вымышленные сведения"></textarea></label><button class="button">Сохранить сообщение</button></form>`
    );
  }
  function render() {
    const resourceRoute=window.SCMUnifiedPages?.route();
    main.innerHTML = role ? shell() : resourceRoute!=null ? '<div class="container resource-public">'+window.SCMUnifiedPages.placeholder()+'</div>' : portal.active() ? portal.render() : landing();
    if(resourceRoute!=null)window.SCMUnifiedPages.mount();
    if(role && resourceRoute==null && tab!=='documents')window.SCMManualRecords.mountSearch(main.querySelector(".workspace>section"));
    const pageTitle = main.querySelector("h1")?.textContent.trim();
    document.title = pageTitle ? `${pageTitle} — Академия SCM` : "Академия SCM";
    document.querySelector("#account-button").textContent = role
      ? "Мой кабинет ↗"
      : "Личный кабинет ↗";
  }
  function login() {
    if(window.SCMUnifiedPages?.route()!=null)history.pushState(null,'',location.pathname+'#cabinet');
    if (identity?.user) { role = (identity.target || identity.user).role; tab = ["admin","admissions","superadmin"].includes(role)?"accounts":"workflows"; render(); return; }
    document.querySelector("#login-dialog").showModal();
  }
  document.querySelector("#assembly-entry")?.addEventListener("click",event=>{event.preventDefault();if(window.SCMUnifiedPages?.route()!=null)history.pushState(null,'',location.pathname+'#cabinet');if(identity?.user){role=(identity.target||identity.user).role;tab="assembly";render();}else{sessionStorage.setItem("scm-open-assembly","1");login();}});
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const primaryNavigation = document.querySelector('#primary-navigation');
  const closeMenu = () => { menuToggle.setAttribute('aria-expanded', 'false'); primaryNavigation.classList.remove('is-open'); };
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(expanded));
    primaryNavigation.classList.toggle('is-open', expanded);
  });
  primaryNavigation.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') { closeMenu(); menuToggle.focus(); } });
  document.querySelector("#account-button").addEventListener("click", () => { closeMenu(); login(); });
  document
    .querySelectorAll("dialog .close")
    .forEach((button) =>
      button.addEventListener("click", () => button.closest("dialog").close()),
    );
  const ownerLoginName = value => String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru') === 'герасимов дмитрий сергеевич';
  const loginNameField=document.querySelector('#login-form [name="name"]');
  const refreshLoginPassword=()=>{const password=document.querySelector('#login-form [name="password"]');const owner=ownerLoginName(loginNameField.value);password.required=!owner;password.closest('label').hidden=owner;password.closest('label').style.display=owner?'none':'';if(owner)password.value='';};
  loginNameField.addEventListener('input',refreshLoginPassword);
  loginNameField.addEventListener('change',refreshLoginPassword);
  document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    refreshLoginPassword();
    const form=event.target, data=new FormData(form), status=document.querySelector('#login-status');
    const complete=user=>{learning.resetView();curriculum.resetView();studyTools.resetView();decisionLab.resetView();knowledge.resetView();documents.resetView();manualRecords.resetView(); if(identity?.remote||identity?.local){location.hash='cabinet';location.reload();return;} role=user.role;tab='overview';document.querySelector('#login-dialog').close();render(); };
    if(!identity){status.textContent='Сервис входа недоступен. Для кабинетов требуется сервер академии.';return;}
    const button=form.querySelector('button[type="submit"]');button.disabled=true;
    try { const result=identity.login(data.get('name'),data.get('password'));
      if(result?.then)result.then(complete).catch(err=>status.textContent=err.message).finally(()=>button.disabled=false);
      else {complete(result);button.disabled=false;}
    }catch(err){status.textContent=err.message;button.disabled=false;}
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button,a");
    if (!t) return;
    if (identity?.click?.(t, render)) return;
    if (assembly?.click(t)) return;
    if (workflows?.click(t)) return;
    if (manualRecords.click(t, role)) return;
    if (studentCard.click(t, role)) return;
    if (documents.click(t, role)) return;
    if (knowledge.click(t, role)) return;
    if (decisionLab.click(t, role)) return;
    if (studyTools.click(t, role)) return;
    if (curriculum.click(t, role)) return;
    const portalAction = portal.click(t);
    if (portalAction) { if (typeof portalAction === "string") toast(portalAction); else if (!t.dataset.portalApply) render(); return; }
    if (learning.click(t, role)) return;
    if (t.dataset.roleEntry) {
      login();
      return;
    }
    if (t.dataset.filter) {
      const top = window.scrollY;
      filter = t.dataset.filter;
      render();
      window.scrollTo(0, top);
      return;
    }
    if (t.dataset.tab) {
      if(t.dataset.tab.startsWith('resources-')){window.SCMUnifiedPages.go(t.dataset.tab.slice(10)+'/');return;}
      if(window.SCMUnifiedPages?.route()!=null)history.pushState(null,'',location.pathname+'#cabinet');
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
        if (!identity?.user || identity.user.role !== "applicant") {login();return;}
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
        if(identity?.remote||identity?.local){identity.logout().catch(err=>toast(err.message));return;}
        role = null;
        tab = "overview";
        render();
        location.hash = t.hash || "home";
        break;
      case "reset":
        if (confirm("Очистить текущее рабочее пространство? Учётные записи и пароли не удаляются.")) {
          state = initial();
          learning.resetView();
    curriculum.resetView();
    studyTools.resetView();
    decisionLab.resetView();
    knowledge.resetView();
    documents.resetView();manualRecords.resetView();
          for (const p of programs) state.settings[p.id].admissions = false;
          save();
          render();
          toast("Рабочее пространство очищено");
        }
        break;
      case "export": {
        const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "scm-academy-workspace.json";
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
      toast("Результат сохранён в этом рабочем пространстве");
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
    if (identity?.submit?.(form, render)) return;
    if (assembly?.submit(form)) return;
    if (workflows?.submit(form)) return;
    if (manualRecords.submit(form, role)) return;
    if (studentCard.submit(form, role)) return;
    if (documents.submit(form, role)) return;
    if (knowledge.submit(form, role)) return;
    if (decisionLab.submit(form, role)) return;
    if (studyTools.submit(form, role)) return;
    if (curriculum.submit(form, role, e.submitter)) return;
    if (portal.submit(form)) { render(); return; }
    if (learning.submit(form, role)) return;
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
      toast("Настройки сохранены в этом рабочем пространстве");
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
      toast("Заявка сохранена. Она не отправлена в академию.");
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
  window.addEventListener('popstate',()=>{if(window.SCMUnifiedPages?.route()!=null || location.hash==='#cabinet')render();});
  window.addEventListener("hashchange", () => {
    if(window.SCMUnifiedPages?.route()!=null){render();window.scrollTo(0,0);return;}
    if(location.hash==='#cabinet' && identity?.user){role=(identity.target||identity.user).role;render();return;}
    if (portal.active()) {
      role = null; render(); window.scrollTo(0, 0); portal.scrollSection();
      main.querySelector("h1")?.focus({preventScroll:true});
      return;
    }
    const sections = [
      "#home",
      "#programs",
      "#approach",
      "#enterprise",
      "#platform",
      "#questions",
    ];
    if (!sections.includes(location.hash)) return;
    role = null;
    render();
    document.querySelector(location.hash)?.scrollIntoView();
  });
  render();
 }
 if(window.SCMIdentity?.ready) window.SCMIdentity.ready.then(start); else start();
})();
