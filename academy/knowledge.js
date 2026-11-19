"use strict";
/* Dated editorial summaries, not copies of standards or claims of endorsement. */
window.SCMKnowledge = (() => {
  const checked='2026-11-19';
  const sources=[
    ['scor','ASCM · SCOR Digital Standard','Процессы','Обзор стандарта','https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/',['strategy','planning','project'],
      'Страница ASCM описывает SCOR DS через процессы Orchestrate, Plan, Order, Source, Transform, Fulfill и Return. Используйте её как ориентир для карты процессов, не как готовое описание своей компании.',
      'SCOR DS; версия страницы не зафиксирована издателем в нашем срезе.','Проверяйте отдельные условия Creative Commons перед использованием материалов. Числа ROI на странице — заявления поставщика, не обещание нашей академии.',
      'Опишите учебный заказ через несколько процессов. Для каждого укажите вход, выход, владельца и наблюдаемый показатель. Не копируйте схему стандарта.'],
    ['cscmp','CSCMP · определения SCM и логистики','Основы','Терминология','https://cscmp.org/CSCMP/Educate/SCM_Definitions_and_Glossary_of_Terms.aspx',['strategy','procurement','warehouse','transport'],
      'CSCMP различает SCM как межфункциональную координацию и логистику как часть управления потоками и хранением. Это помогает не сводить всю цепь поставок только к перевозке.',
      'Дата редакции на прочитанной странице не указана.','Здесь авторское русское пояснение, не официальный перевод словаря. Полный словарь не скопирован.',
      'Разберите ситуацию: продажи обещали срок, закупки выбрали поставщика, склад готовит отгрузку. Где логистическая операция, а где межфункциональное решение?'],
    ['incoterms','ICC · Incoterms®','ВЭД','Правила и ограничения','https://iccwbo.org/business-solutions/incoterms-rules/',['procurement','transport','risk'],
      'ICC описывает Incoterms как правила распределения задач, затрат и рисков доставки между продавцом и покупателем. Для договора нужно проверять выбранное правило, именованное место и редакцию.',
      'На странице представлена редакция Incoterms® 2020.','Полные правила защищены авторским правом. Это не юридическая консультация и не проверка применимости к конкретной сделке.',
      'Составьте перечень вопросов к договору: правило и редакция, место, распределение затрат, рисков и документов. Не выбирайте базис для реального груза без специалиста.'],
    ['epcis','GS1 · EPCIS и CBV','Данные','Стандарт данных','https://www.gs1.org/standards/epcis',['digital','warehouse','transport'],
      'GS1 представляет EPCIS как стандарт событий видимости: что, когда, где, почему и как произошло с объектом. CBV задаёт согласованные значения для описания бизнес-контекста.',
      'На обзорной странице описаны EPCIS/CBV 2.0 и руководство марта 2023.','Наш учебный журнал не реализует EPCIS. Обзор не заменяет схему, API, правила идентификации и проверку соответствия.',
      'Опишите три события учебной поставки: объект, время и часовой пояс, место, операция, источник данных. Покажите, как обнаружить дубликат.'],
    ['safe','WCO · SAFE Package','Риски','Международная рамка','https://www.wcoomd.org/en/topics/facilitation/instrument-and-tools/frameworks-of-standards/safe_package.aspx',['risk','procurement','transport'],
      'Пакет WCO SAFE посвящён безопасности и упрощению международной торговли, взаимодействию таможни и бизнеса. На странице есть материалы об AEO и редакции рамки 2025 года.',
      'Обзор SAFE Framework 2025.','Международная рамка не заменяет национальные таможенные требования. Статус AEO не присваивается чтением материала.',
      'Составьте учебный реестр рисков целостности поставки: событие, причина, контроль, владелец и свидетельство исполнения. Укажите, что требует проверки по стране.'],
    ['imdg','IMO · морская перевозка опасных грузов','Безопасность','Навигация по требованиям','https://www.imo.org/en/ourwork/safety/pages/dangerousgoods-default.aspx',['transport','risk','warehouse'],
      'IMO объясняет связь IMDG Code с морской перевозкой опасных грузов в упаковке и конвенциями SOLAS/MARPOL. Для работы нужны действующие требования и подготовленный специалист.',
      'Обзорная страница; действующее издание/поправки отдельно не установлены.','Не инструкция по классификации, упаковке, совместной погрузке или аварийному реагированию. Действия с опасными грузами по этой карточке недопустимы.',
      'Без подбора класса или упаковки составьте список вопросов ответственному специалисту: свойства груза, применимое издание, документы, обучение, перевозчик.'],
    ['iata','IATA · опасные грузы в авиации','Безопасность','Навигация по требованиям','https://www.iata.org/en/programs/cargo/dangerous-goods/',['transport','risk'],
      'Раздел IATA ведёт к DGR, документации и специальным материалам по опасным грузам. Сфера авиации требует отдельной проверки и не тождественна морским правилам.',
      'На странице одновременно представлены материалы 2026 и объявления обновлений 2027; применимость устанавливается на дату перевозки.','Срез 19.11.2026: дата 01.01.2027 ещё не наступила. Не считать будущую редакцию действующей автоматически. Не заменяет подготовку и разрешения.',
      'Опишите процедуру проверки актуальности источника: дата перевозки, редакция, требования государства/оператора, ответственный специалист. Не составляйте инструкцию по отправке конкретного опасного груза.'],
    ['glec','Smart Freight Centre · учёт выбросов','Устойчивость','Методический обзор','https://smartfreightcentre.org/page/emissions-accounting',['transport','digital','project'],
      'Страница SFC объединяет GLEC Framework, ISO 14083 и обмен данными о выбросах. Для сравнения нужны единые границы расчёта и понятный источник исходных данных.',
      'Страница указывает GLEC v3.3, октябрь 2026.','Полная методика и ISO 14083 не проанализированы. Наши калькуляторы не рассчитывают сертифицированный углеродный след и не подтверждают соответствие ISO.',
      'Составьте паспорт набора данных для будущей оценки: границы, вид транспорта, масса, расстояние, источник коэффициентов, период и неопределённость. Не подставляйте выдуманный коэффициент.'],
    ['mitocw','MIT OCW · Supply Chain Planning','Планирование','Открытый учебный курс','https://ocw.mit.edu/courses/15-762j-supply-chain-planning-spring-2011/',['planning','inventory','forecast'],
      'Страница курса включает планирование сети, размещение запасов, координацию и обмен информацией. В описании указаны модели, компьютерные упражнения и обсуждение кейсов.',
      'Курс Spring 2011, не текущий набор.','Открытые материалы OCW не означают зачисление, диплом MIT или партнёрство нашей академии. Перед повторным использованием файлов проверять лицензию каждого материала.',
      'Выберите тему из описания курса и сформулируйте компромисс между запасом, сервисом и координацией. Укажите предпосылки и какие данные потребуются.'],
    ['unctad','UNCTAD · Review of Maritime Transport','Транспорт','Аналитические отчёты','https://unctad.org/topic/transport-and-trade-logistics/review-of-maritime-transport',['transport','strategy','risk'],
      'Серия UNCTAD содержит обзор морской торговли, флота, ставок, портов и связанности. Для проекта выбирайте конкретный выпуск, таблицу, период и единицу, а не число без контекста.',
      'В прочитанном списке представлен выпуск 2025 от 24.09.2025; актуальный ряд 2026 отдельно не подтверждён.','Обзор страницы не означает проверки всех таблиц отчёта. Макроданные не дают автоматически прогноз стоимости конкретной перевозки.',
      'Выберите показатель в одном отчёте. Запишите выпуск, номер таблицы, единицу, период и ограничения; объясните, почему его нельзя напрямую превратить в тариф своего заказа.']
  ].map(([id,title,topic,type,url,modules,summary,edition,limits,task])=>({id,title,topic,type,url,modules,summary,edition,limits,task,checked}));
  const terms=[
    ['SCM — Supply Chain Management','Управление цепями поставок: согласование спроса, снабжения, преобразования и логистики между функциями и компаниями.','cscmp'],
    ['Логистика — Logistics','Управление прямыми и обратными потоками и хранением в рамках цепи поставок; не синоним всего SCM.','cscmp'],
    ['SCOR DS — Supply Chain Operations Reference Digital Standard','Рамка описания процессов и показателей. Наша карта процессов не становится сертифицированной от одного упоминания SCOR.','scor'],
    ['EPCIS — Electronic Product Code Information Services','Стандарт обмена событиями видимости. Наличие QR-кода или журнала само по себе не означает соответствие EPCIS.','epcis'],
    ['CBV — Core Business Vocabulary','Согласованный бизнес-словарь для событий EPCIS. Участники должны одинаково понимать значения, не только передавать одинаковые поля.','epcis'],
    ['Incoterms® — International Commercial Terms','Правила ICC для распределения задач, затрат и рисков доставки. При использовании указывают редакцию и место.','incoterms'],
    ['AEO — Authorized Economic Operator','Уполномоченный экономический оператор: статус и требования зависят от применимого режима. Наш материал статус не присваивает.','safe'],
    ['IMDG — International Maritime Dangerous Goods Code','Кодекс для морской перевозки опасных грузов в упаковке. Актуальность и применимость проверяет специалист.','imdg'],
    ['DGR — Dangerous Goods Regulations','Материалы IATA по опасным грузам для авиации; не универсальное разрешение на перевозку.','iata'],
    ['GLEC — Global Logistics Emissions Council','Инициатива и методическая рамка учёта логистических выбросов; сравнение требует согласованных границ.','glec']
  ];
  const get=id=>sources.find(s=>s.id===id);
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function related(module){const list=module.startsWith('reading:')?[get(module.slice(8))].filter(Boolean):sources.filter(s=>s.modules.includes(module));return list.length?`<section class="knowledge-related"><h3>Источники для углубления</h3><p class="micro">Редакционные аннотации проверены ${checked}. Для внешних страниц нужна сеть; чтение не подтверждает квалификацию.</p>${list.map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a><br><small>${escape(s.edition)}</small></p>`).join('')}</section>`:'';}
  function create(ctx){
    const e=ctx.esc;let query='',topic='all',bookmarksOnly=false;
    const data=()=>{const state=ctx.state();if(!Array.isArray(state.knowledgeBookmarks))state.knowledgeBookmarks=[];return state.knowledgeBookmarks;};
    function render(role,tab){if(!['admin','teacher','learner'].includes(role)||tab!=='knowledge')return null;
      const bookmarks=data(),list=sources.filter(s=>(topic==='all'||s.topic===topic)&&(!bookmarksOnly||bookmarks.includes(s.id))&&`${s.title} ${s.topic} ${s.summary} ${s.type}`.toLowerCase().includes(query.toLowerCase()));
      const c=ctx.state().curriculum||{students:[],allocations:[]};
      return `<div class="dashboard-head"><div><span class="eyebrow">SCM KNOWLEDGE BASE</span><h1>База знаний и первоисточники</h1><p>10 отобранных ресурсов, авторские пояснения и практические вопросы. Срез ${checked}, не вся информация отрасли.</p></div><span class="badge">РЕДАКЦИОННАЯ ПОДБОРКА</span></div><div class="warning">Это навигация по знаниям, не юридическая консультация, не допуск к опасным грузам и не одобрение нашей академии указанными организациями. Полные стандарты и чужие курсы не скопированы. Аннотации доступны в офлайн-пакете; внешние сайты требуют сети и могут требовать оплату/регистрацию.</div><form id="knowledge-search" class="panel study-filters"><label>Поиск<input name="query" type="search" maxlength="120" value="${e(query)}" placeholder="Например: EPCIS, ВЭД, риски"></label><label>Тема<select name="topic"><option value="all">Все темы</option>${[...new Set(sources.map(s=>s.topic))].map(t=>`<option ${topic===t?'selected':''}>${e(t)}</option>`).join('')}</select></label><label class="check"><input name="bookmarks" type="checkbox" ${bookmarksOnly?'checked':''}>Только закладки</label><button class="button">Найти</button></form><p role="status">Найдено: ${list.length}. Закладки общие для этого браузера, не отметки освоения.</p><div class="grid knowledge-grid">${list.map(s=>`<article class="card"><span class="number">${e(s.topic)} · ${e(s.type)}</span><h2>${e(s.title)}</h2><p>${e(s.summary)}</p><p class="micro">${e(s.edition)}<br>Дата проверки: ${s.checked}</p><details><summary>Задание и границы применения</summary><p><b>Учебный вопрос:</b> ${e(s.task)}</p><p><b>Ограничения:</b> ${e(s.limits)}</p></details><a class="button outline small" href="${s.url}" target="_blank" rel="noopener noreferrer">Открыть первоисточник ↗</a><button class="button outline small" data-knowledge-bookmark="${s.id}" aria-pressed="${bookmarks.includes(s.id)}">${bookmarks.includes(s.id)?'✓ В закладках':'+ В закладки'}</button></article>`).join('')||'<p class="empty">Ничего не найдено. Измените запрос или фильтры.</p>'}</div>${role==='admin'?`<section class="panel"><h2>Назначить работу с источником</h2><p>Участник получит нашу аннотацию, ссылку, вопрос и критерии. Это дополнение к 12 модулям, не автоматическое завершение внешнего курса.</p><form id="knowledge-assign"><label>Источник<select name="source">${sources.map(s=>`<option value="${s.id}">${e(s.title)}</option>`).join('')}</select></label><label>Участник или группа<select name="target" required><option value="">Выберите получателя</option>${[...new Set(c.students.map(s=>s.cohort))].map(g=>`<option value="group:${e(g)}">Группа ${e(g)}</option>`).join('')}${c.students.map(s=>`<option value="student:${e(s.id)}">${e(s.name)} · ${e(s.cohort)}</option>`).join('')}</select></label><label>Срок<input type="date" name="due" required></label><button class="button" ${c.students.length?'':'disabled'}>Назначить изучение</button></form></section>`:''}<section class="panel"><h2>Словарь: русский термин и английский эквивалент</h2><p>Авторские краткие пояснения, не официальный перевод стандартов.</p>${terms.map(([title,body,id])=>`<details class="curriculum-track"><summary>${e(title)}</summary><p>${e(body)}</p><a href="${get(id).url}" target="_blank" rel="noopener noreferrer">Источник: ${e(get(id).title)} ↗</a></details>`).join('')}</section>`;
    }
    return {render,resetView(){query='';topic='all';bookmarksOnly=false;},click(t,role){
      if(!t.dataset.knowledgeBookmark)return false;if(!['admin','teacher','learner'].includes(role))return true;const id=t.dataset.knowledgeBookmark;if(!get(id))return true;const bookmarks=data(),index=bookmarks.indexOf(id);if(index>=0)bookmarks.splice(index,1);else bookmarks.push(id);ctx.save();ctx.render();return true;
    },submit(form,role){
      if(!['knowledge-search','knowledge-assign'].includes(form.id))return false;const f=new FormData(form),v=k=>String(f.get(k)||'').trim();
      if(form.id==='knowledge-search'){if(!['admin','teacher','learner'].includes(role))return true;query=v('query').slice(0,120);topic=v('topic');bookmarksOnly=f.has('bookmarks');ctx.render();return true;}
      if(role!=='admin')return true;
      const s=get(v('source')),c=ctx.state().curriculum,due=v('due');if(!s||!c||!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due){ctx.toast('Выберите источник, получателей и корректную дату.');return true;}
      const module=`reading:${s.id}`,people=c.students.filter(p=>(v('target')===`student:${p.id}`||v('target')===`group:${p.cohort}`)&&!c.allocations.some(a=>a.student===p.id&&a.module===module&&a.status!=='approved'));
      if(!people.length||c.allocations.length+people.length>1000){ctx.toast('Нет новых получателей либо превышен локальный лимит 1000 назначений.');return true;}
      const snapshot={id:module,title:`Работа с источником: ${s.title}`,category:s.topic,skill:'Различать источник, вывод и ограничения применения',version:1,sections:[['Авторская аннотация',s.summary],['Версия и дата проверки',`${s.edition} Проверено ${s.checked}. Первоисточник: ${s.url}`],['Границы использования',s.limits]],task:s.task,rubric:'Указаны источник, редакция/дата и границы; вывод сформулирован своими словами; нет подмены учебного разбора юридическим или операционным разрешением.'};
      for(const p of people)c.allocations.push({id:crypto.randomUUID(),student:p.id,module,due,status:'assigned',created:new Date().toISOString(),snapshot:JSON.parse(JSON.stringify(snapshot))});
      const saved=ctx.save();ctx.render();if(saved!==false)ctx.toast('Работа с источником назначена в этом браузере.');return true;
    }};
  }
  return {sources,terms,related,create};
})();
