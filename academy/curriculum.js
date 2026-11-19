"use strict";
/* Original introductory teaching materials. Not a licensed syllabus or external certification. */
window.SCMCurriculum = (() => {
  const extra = [
    ['strategy','Стратегия цепи поставок','Стратегия','Сопоставить цели сервиса, затрат и капитала.',
      'Начните с клиента: какие сроки, полнота и вариативность поставки действительно нужны? Затем определите границы цепи: поставщики, производство, распределение и возвраты. Локальное снижение затрат не гарантирует улучшения результата всей сети.',
      'Сравнивайте варианты по одинаковому периметру и периоду. Отдельно фиксируйте разовые инвестиции, регулярные расходы, оборотный капитал и риск нарушения сервиса. Не складывайте денежные потоки разных периодов без согласованной методики.',
      'В учебном кейсе сеть А требует 2 млн руб. регулярных затрат в месяц, сеть Б — 1,7 млн и разовых вложений 3 млн. Простая окупаемость разницы равна 10 месяцам, если экономия действительно реализуется. Это не NPV: налоги, стоимость денег и риски здесь не учтены.',
      'Сравните сети А и Б на горизонте 12 месяцев. Добавьте сценарий, где экономия Б ниже на 50%. Дайте рекомендацию и укажите минимум три недостающих факта.',
      'Единый горизонт; отдельный учёт разовых затрат; два сценария; ограничения рекомендации.'],
    ['procurement','Закупки и выбор поставщика','Закупки','Обосновать выбор через совокупные затраты и ограничения.',
      'Цена единицы — только часть решения. В состав сопоставимых затрат могут входить доставка, пошлины, контроль качества, потери от брака и административные расходы. Сначала задайте обязательные условия допуска, затем сравнивайте допустимые предложения.',
      'Оценка по весам полезна только при понятной шкале. Веса должны суммироваться до 1, а направление шкалы должно быть единым. Высокий итоговый балл не отменяет обязательных требований к безопасности и качеству.',
      'Для 1000 единиц поставщик А предлагает цену 100 руб. и доставку 10000 руб.; Б — 105 руб. и доставку 2000 руб. Без прочих различий затраты составят 110000 и 107000 руб. соответственно. Дешевле за единицу не всегда дешевле за заказ.',
      'Рассчитайте затраты А и Б. При доле брака 2% у Б оцените стоимость пригодной единицы без компенсации брака. Назовите условия, которые нужно закрепить в договоре.',
      'Верные суммы; явный знаменатель пригодных единиц; допущения о браке; условия качества и поставки.'],
    ['warehouse','Склад: поток, размещение, точность','Склад','Найти узкое место и обосновать улучшение процесса.',
      'Опишите поток от приёмки до отгрузки. Для каждой операции нужны вход, выход, единица производительности и доступное время. Складская площадь сама по себе не описывает пропускную способность.',
      'Сравнивайте мощности операций на одном временном интервале. Улучшение операции, которая не ограничивает поток, может не увеличить общий выпуск. Перед изменением размещения проверьте совместимость грузов, безопасность и доступность проходов.',
      'Приёмка обрабатывает 120 строк в час, размещение — 90, отбор — 110. В упрощённой последовательной модели без буферных ограничений поток ограничен размещением: 90 строк в час. За 6 часов это не более 540 строк.',
      'Для потока из 600 строк оцените минимальное время. Предложите два изменения и план измерения результата, не ухудшающий точность и безопасность.',
      'Найдено ограничение; согласованы единицы; рассчитано время; учтены качество и безопасность.'],
    ['transport','Транспорт и экономика доставки','Транспорт','Сравнить варианты доставки по стоимости и сервису.',
      'Опишите маршрут, тип груза, окна приёмки и ограничения транспорта. Загрузка по массе и по объёму — разные показатели: машина может исчерпать один лимит раньше другого.',
      'Сравнивайте полную стоимость рейса и стоимость доставленной единицы. Дешёвый рейс с низкой загрузкой не обязательно выгоднее. Учитывайте возврат, ожидание, платные участки и вероятность нарушения окна.',
      'Рейс А стоит 30000 руб. и везёт 600 единиц, Б — 24000 руб. и везёт 400. Стоимость единицы: 50 и 60 руб. Выбор А возможен лишь при совместимых сроках, спросе и грузовых ограничениях.',
      'Рассчитайте стоимость единицы при падении загрузки А до 450 единиц. Определите, какой вариант дешевле, и какие ограничения могут изменить решение.',
      'Верные расчёты; общий периметр затрат; проверка сроков и загрузки; условная, а не безусловная рекомендация.'],
    ['forecast','Прогноз спроса и ошибка','Аналитика','Отделить прогноз от цели и измерить ошибку.',
      'Прогноз описывает ожидаемый спрос при заданных предпосылках; план задаёт согласованные действия, а цель — желаемый результат. Нельзя считать отгрузки точным спросом при дефиците без дополнительной проверки.',
      'Для учебной оценки используем MAE: среднее абсолютное отклонение факта от прогноза. Оно имеет размерность исходных данных. Процентные метрики требуют осторожности при нулевом и малом спросе.',
      'Факт по трём периодам: 100, 120, 80; прогноз: 90, 110, 100. Абсолютные ошибки: 10, 10, 20; MAE = 40 / 3 ≈ 13,33 единицы. На трёх наблюдениях нельзя доказать устойчивость модели.',
      'Рассчитайте MAE для прогноза 100, 100, 100. Сравните с примером. Опишите проверку на последующих периодах без утечки будущих данных.',
      'Верный MAE; одинаковые периоды; разделение обучения и проверки; ограничения малой выборки.'],
    ['finance','Финансы и оборотный капитал SCM','Финансы','Отделить экономию затрат от высвобождения капитала.',
      'Запас — актив, а не автоматически расход периода. Снижение запаса может высвободить деньги, но само по себе не равно такой же прибыли. Потери, стоимость хранения и стоимость капитала рассматриваются отдельно.',
      'В учебном приближении денежный цикл CCC = DIO + DSO − DPO: дни запаса плюс дни дебиторской задолженности минус дни кредиторской. Определения средних остатков и знаменателей должны быть согласованы с финансовой службой.',
      'При DIO = 40, DSO = 30 и DPO = 25 денежный цикл равен 45 дням. Снижение DIO на 5 дней сокращает его до 40 при неизменности остальных условий.',
      'Оцените изменение среднего запаса при снижении DIO на 5 дней и учебной себестоимости 200000 руб. в день. Объясните, почему это не равнозначно приросту прибыли.',
      'Верный CCC; 1 млн руб. изменения запаса в упрощённой модели; различие капитала и прибыли; указаны допущения.'],
    ['risk','Риски и устойчивость поставок','Риски','Составить проверяемый план реагирования.',
      'Риск описывают как событие, причину и последствия для конкретного процесса. Для каждого сценария нужен владелец. Общая запись «проблемы с поставщиками» недостаточна для действия.',
      'Оценка вероятности и ущерба — инструмент приоритизации, а не точное предсказание. Необходимо отдельно рассматривать редкие события с критическим ущербом, зависимости между поставщиками и время восстановления.',
      'Основной поставщик даёт 80 единиц в день, резервный — 30. При спросе 70 и остановке основного ежедневный разрыв составит 40. Буфер 200 единиц покрывает 5 дней при постоянном спросе и немедленной доступности резерва.',
      'Рассчитайте покрытие буфера при задержке подключения резерва на 2 дня. Опишите триггер, владельца и последовательность действий.',
      'Разделены периоды до/после резерва; корректный баланс запаса; назначен владелец; учтены ограничения сценария.'],
    ['digital','Данные и цифровые инструменты SCM','Данные','Спроектировать проверку качества данных перед автоматизацией.',
      'До выбора системы задайте владельца данных, идентификаторы объектов и единицы измерения. Один и тот же артикул в штуках и коробках без коэффициента пересчёта способен исказить расчёт потребности.',
      'Проверки качества включают полноту, уникальность, допустимые диапазоны и согласованность справочников. Автоматический расчёт не делает ошибочный источник достоверным. Логи должны помогать воспроизводить решение без раскрытия лишних данных.',
      'В учебном файле 1000 строк: 20 без артикула, 10 — повторные записи, 15 с неизвестной единицей измерения. Эти множества могут пересекаться, поэтому нельзя утверждать, что ошибочны ровно 45 разных строк.',
      'Опишите схему таблицы заказа и минимум пять проверок. Предложите обработку ошибок без молчаливого удаления строк и план сверки после исправления.',
      'Определены ключи и единицы; есть проверки пересечений; журнал исключений; повторная сверка и ответственный.'],
    ['project','Итоговый проект улучшений','Проект','Собрать воспроизводимое обоснование решения.',
      'Начните с паспорта проблемы: процесс, базовый период, показатель, владелец и границы. Формулировка «повысить эффективность» не задаёт измеримого результата. Используйте обезличенные учебные данные.',
      'Опишите исходную модель, альтернативы, расчёты, ограничения и критерии принятия решения. План внедрения должен включать этап проверки на ограниченном объёме, владельца, срок и условия остановки.',
      'Для учебного проекта по запасам результатом может быть сравнение двух политик по среднему запасу и дефициту на одинаковом наборе данных. Нельзя сравнивать разные сезоны и приписывать всю разницу только изменению политики.',
      'Подготовьте паспорт проекта, таблицу исходных данных, два сценария, расчёт эффекта, перечень рисков и план пилотирования. Отдельно перечислите, чего данные не позволяют доказать.',
      'Воспроизводимость; сопоставимость сценариев; обоснованные допущения; план пилота; ограничения выводов.']
  ].map(([id,title,category,skill,a,b,c,task,rubric])=>({id,title,category,skill,minutes:30,sections:[['Понятия и границы',a],['Метод решения',b],['Учебный пример',c]],task,rubric,version:1}));
  const tracks = [
    ['higher','Системная подготовка', ['strategy','forecast','inventory','service','procurement','warehouse','transport','finance','planning','digital','risk','project']],
    ['mba','Управленческий маршрут', ['strategy','finance','planning','risk','digital','project']],
    ['intensive','Практикум по запасам', ['inventory','service','forecast']],
    ['retraining','Основы профессии SCM', ['strategy','procurement','warehouse','transport','inventory','service','forecast','planning','project']],
    ['international','База для выбора внешней траектории', ['strategy','inventory','service','planning']],
    ['corporate','Развитие команды', ['strategy','planning','digital','risk','project']],
    ['seminars','Вводные разборы', ['inventory','service','risk']]
  ];
  function create(ctx) {
    const e=ctx.esc;
    let selected=null, query='';
    const all=()=>[...window.SCMLearning.modules.map(m=>({...m,version:1,task:({inventory:'Спрос 80 ед./день, срок 7 дней, σ = 15, z = 1,645. Рассчитайте точку заказа, укажите единицы и ограничения модели.',service:'Из 1200 запрошенных единиц выдано 1116. Рассчитайте fill rate. Объясните, почему этого недостаточно для расчёта CSL.',planning:'Спрос 1500, мощность 1200. Сравните перенос 300 единиц и подряд на 300 единиц. Укажите недостающие данные и владельца решения.'})[m.id],rubric:'Корректность расчёта; единицы и определения; явные допущения; ограничения; собственное объяснение.'})),...extra];
    const get=()=>{
      const state=ctx.state();
      if(!state.curriculum||typeof state.curriculum!=='object')state.curriculum={};
      const c=state.curriculum;
      for(const key of ['students','allocations'])if(!Array.isArray(c[key]))c[key]=[];
      return c;
    };
    const id=()=>crypto.randomUUID();
    const moduleBy=id=>all().find(m=>m.id===id);
    const head=(title,text)=>`<div class="dashboard-head"><div><span class="eyebrow">УЧЕБНО-МЕТОДИЧЕСКАЯ БАЗА</span><h1>${title}</h1><p>${text}</p></div><span class="badge">ЛОКАЛЬНЫЙ РЕЖИМ</span></div>`;
    const note='<div class="warning">Авторские вводные материалы, редакция 1. Нужны методическое рецензирование и утверждение. Это не полные программы семи образовательных линий и не подготовка, одобренная внешними правообладателями. Реальные персональные данные вводить нельзя.</div>';
    function lesson(m,assignment){
      return `<button class="button outline small" data-curriculum-back>← К списку</button><article class="panel lesson-body"><span class="eyebrow">${e(m.category)} · РЕДАКЦИЯ ${m.version}</span><h2>${e(m.title)}</h2><p><b>Учебная цель:</b> ${e(m.skill)}</p>${m.sections.map(([t,b])=>`<section><h3>${e(t)}</h3><p>${e(b)}</p></section>`).join('')}<h3>Практическое задание</h3><p>${e(m.task)}</p><h3>Критерии рассмотрения преподавателем</h3><p>${e(m.rubric)}</p><p class="micro">Время на странице — ориентир для чтения, а не академические часы. Примеры синтетические; внешние материалы не скопированы. Расчёты не предназначены для применения без проверки предпосылок.</p></article>${assignment?`<form class="panel" id="curriculum-answer"><input type="hidden" name="allocation" value="${e(assignment.id)}"><h3>Решение по назначению</h3><label>Ваше решение и допущения<textarea name="answer" minlength="40" maxlength="8000" required>${e(assignment.answer||'')}</textarea></label><button class="button" ${assignment.status==='approved'?'disabled':''}>Отправить на проверку</button><p>${e(assignment.feedback||'Подтверждение выполняет человек. Отправка сохраняет решение только в этом браузере.')}</p></form>`:''}${note}`;
    }
    function library(){
      if(selected&&moduleBy(selected))return head('Материал модуля','Просмотрите содержание и критерии до назначения.')+lesson(moduleBy(selected));
      const list=all().filter(m=>`${m.title} ${m.category} ${m.skill}`.toLowerCase().includes(query.toLowerCase()));
      return head('Библиотека модулей','12 вводных модулей: теория, учебные примеры, задания и критерии проверки.')+`<form class="learning-search" id="curriculum-search"><label>Поиск по теме<input type="search" name="query" maxlength="120" value="${e(query)}" placeholder="Закупки, склад, финансы…"></label><button class="button">Найти</button></form><p role="status">Найдено: ${list.length}</p><div class="grid curriculum-grid">${list.map(m=>`<article class="card"><span class="number">${e(m.category)} · v${m.version}</span><h2>${e(m.title)}</h2><p>${e(m.skill)}</p><p class="micro">Теория · кейс · практика · критерии</p><button class="button outline small" data-curriculum-module="${m.id}">Просмотреть материал ↗</button></article>`).join('')||'<p>Модули не найдены.</p>'}</div><section class="panel"><h2>Семь маршрутов назначения</h2><p>Подборки вводных материалов, не полноценные программы или внешняя сертификация.</p>${tracks.map(([,title,ids])=>`<details class="curriculum-track"><summary>${e(title)} · ${ids.length} модулей</summary><ol>${ids.map(id=>`<li>${e(moduleBy(id).title)}</li>`).join('')}</ol></details>`).join('')}</section>${note}`;
    }
    function students(){
      const c=get();return head('Студенты и учебные группы','Локальный реестр для распределения учебных работ, без настоящих аккаунтов.')+`<form class="panel" id="curriculum-student"><label>Учебный псевдоним<input name="name" maxlength="80" required placeholder="Например: Участник 01"></label><label>Группа<input name="cohort" maxlength="50" required placeholder="SCM-01"></label><button class="button">Добавить студента</button></form><div class="panel"><h2>Реестр (${c.students.length})</h2>${c.students.map(s=>`<p><b>${e(s.name)}</b> · ${e(s.cohort)} · назначений: ${c.allocations.filter(a=>a.student===s.id).length}</p>`).join('')||'<p>Пока нет записей. Добавьте первого участника.</p>'}</div>${note}`;
    }
    const status=a=>({assigned:'Назначено',submitted:'На проверке',revision:'На доработке',approved:'Проверено локально'})[a.status]||'Назначено';
    function allocations(){
      const c=get();return head('Назначение обучения','Назначьте один модуль студенту или всей группе. Можно назначить целый маршрут. Общий срок применяется ко всем его модулям; порядок прохождения рекомендательный. Повторные активные назначения пропускаются.')+`<form class="panel" id="curriculum-allocate"><label>Кому<select name="target" required><option value="">Выберите участника или группу</option>${[...new Set(c.students.map(s=>s.cohort))].map(g=>`<option value="group:${e(g)}">Группа: ${e(g)}</option>`).join('')}${c.students.map(s=>`<option value="student:${e(s.id)}">${e(s.name)} · ${e(s.cohort)}</option>`).join('')}</select></label><label>Модуль или учебный маршрут<select name="module"><optgroup label="Маршруты по образовательным линиям">${tracks.map(([key,title,ids])=>`<option value="track:${key}">${e(title)} · ${ids.length} модулей</option>`).join('')}</optgroup><optgroup label="Отдельные модули">${all().map(m=>`<option value="${m.id}">${e(m.title)}</option>`).join('')}</optgroup></select></label><label>Срок сдачи<input name="due" type="date" required></label><button class="button" ${c.students.length?'':'disabled'}>Назначить модуль</button></form><div class="panel"><h2>Назначения (${c.allocations.length})</h2>${c.allocations.slice().reverse().map(a=>`<p><b>${e(c.students.find(s=>s.id===a.student)?.name)}</b> · ${e(a.snapshot.title)} · до ${e(a.due)} <span class="badge">${status(a)}</span></p>`).join('')||'<p>Назначений пока нет.</p>'}</div>`;
    }
    function responses(){
      const c=get();const items=c.allocations.filter(a=>a.answer);return head('Проверка назначенных работ','Рассмотрение решения по зафиксированной редакции задания. Не автоматическая аттестация.')+items.slice().reverse().map(a=>`<article class="panel"><h2>${e(a.snapshot.title)}</h2><p>${e(c.students.find(s=>s.id===a.student)?.name)} · ${status(a)} · редакция ${a.snapshot.version}</p><details><summary>Задание и критерии</summary><p>${e(a.snapshot.task)}</p><p>${e(a.snapshot.rubric)}</p></details><p style="white-space:pre-wrap">${e(a.answer)}</p>${a.status==='submitted'?`<form class="curriculum-review"><input type="hidden" name="allocation" value="${e(a.id)}"><label>Решение<select name="decision"><option value="revision">Вернуть на доработку</option><option value="approved">Подтвердить локально</option></select></label><label>Обратная связь<textarea name="feedback" required minlength="20" maxlength="3000"></textarea></label><label class="check"><input name="reviewed" type="checkbox" required>Я рассмотрел решение и критерии</label><button class="button">Сохранить решение</button></form>`:`<p>${e(a.feedback||'')}</p>`}</article>`).join('')+(items.length?'':'<div class="empty">Отправленные решения появятся здесь.</div>');
    }
    function myPlan(){
      const c=get();if(!c.students.some(s=>s.id===c.activeStudent))c.activeStudent=c.students[0]?.id||'';
      const items=c.allocations.filter(a=>a.student===c.activeStudent);
      const assignment=items.find(a=>a.id===selected);
      return head('Назначенное обучение','Выбор участника ниже переключает локальный профиль, а не выполняет вход. На общем устройстве данные не защищены.')+`<form class="panel" id="curriculum-profile"><label>Учебный профиль<select name="student">${c.students.map(s=>`<option value="${e(s.id)}" ${s.id===c.activeStudent?'selected':''}>${e(s.name)} · ${e(s.cohort)}</option>`).join('')}</select></label><button class="button outline" ${c.students.length?'':'disabled'}>Открыть профиль</button></form>${assignment?lesson(assignment.snapshot,assignment):items.map(a=>`<article class="panel"><span class="badge">${status(a)}</span><h2>${e(a.snapshot.title)}</h2><p>Срок: ${e(a.due)} · редакция ${a.snapshot.version}</p>${a.feedback?`<p>Отзыв: ${e(a.feedback)}</p>`:''}<button class="button outline" data-curriculum-allocation="${e(a.id)}">Материал и задание ↗</button></article>`).join('')||'<div class="empty">Нет назначений. Администратор добавляет студентов и назначает модули в своём кабинете.</div>'}`;
    }
    return {
      resetView(){selected=null;query='';},
      render(role,tab){if(role==='admin')return ({library,students,allocations,responses})[tab]?.()??null;if(role==='teacher'&&tab==='responses')return responses();if(role==='learner'&&tab==='studyplan')return myPlan();return null;},
      click(t,role){
        if(t.hasAttribute('data-curriculum-back')){selected=null;ctx.render();return true;}
        if(t.dataset.curriculumModule&&role==='admin'){selected=t.dataset.curriculumModule;ctx.render();return true;}
        if(t.dataset.curriculumAllocation&&role==='learner'){selected=t.dataset.curriculumAllocation;ctx.render();return true;}return false;
      },
      submit(form,role){
        if(!['curriculum-search','curriculum-student','curriculum-allocate','curriculum-profile','curriculum-answer'].includes(form.id)&&!form.classList.contains('curriculum-review'))return false;
        const c=get(),f=new FormData(form),v=k=>String(f.get(k)||'').trim();
        const fail=message=>{ctx.toast(message);return true;};
        if(form.id==='curriculum-search'){if(role!=='admin')return true;query=v('query').slice(0,120);selected=null;ctx.render();return true;}
        if(form.id==='curriculum-student'){
          if(role!=='admin')return true;
          const name=v('name'),cohort=v('cohort');if(!name||name.length>80||!cohort||cohort.length>50)return fail('Заполните псевдоним и группу в указанных пределах.');
          if(c.students.length>=200)return fail('Локальный лимит: 200 студентов.');
          if(c.students.some(s=>s.name===name&&s.cohort===cohort))return fail('Такой участник уже есть в группе.');
          c.students.push({id:id(),name,cohort});
        }
        if(form.id==='curriculum-allocate'){
          if(role!=='admin')return true;
          const track=tracks.find(([key])=>`track:${key}`===v('module'));
          const modules=track?track[2].map(moduleBy):[moduleBy(v('module'))];
          const due=v('due'),target=v('target');
          if(modules.some(m=>!m)||!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due)return fail('Выберите модуль и корректную дату.');
          const people=c.students.filter(s=>target===`student:${s.id}`||target===`group:${s.cohort}`);
          const added=people.flatMap(s=>modules.filter(m=>!c.allocations.some(a=>a.student===s.id&&a.module===m.id&&a.status!=='approved')).map(m=>({s,m})));
          if(!added.length)return fail('Нет новых назначений: выберите участников или проверьте существующие работы.');
          if(c.allocations.length+added.length>1000)return fail('Локальный лимит: 1000 назначений.');
          for(const {s,m} of added)c.allocations.push({id:id(),student:s.id,module:m.id,due,status:'assigned',created:new Date().toISOString(),snapshot:JSON.parse(JSON.stringify(m))});
        }
        if(form.id==='curriculum-profile'){
          if(role!=='learner')return true;if(!c.students.some(s=>s.id===v('student')))return fail('Профиль не найден.');c.activeStudent=v('student');selected=null;
        }
        if(form.id==='curriculum-answer'){
          if(role!=='learner')return true;const a=c.allocations.find(a=>a.id===v('allocation')&&a.student===c.activeStudent);
          if(!a||!['assigned','revision','submitted'].includes(a.status))return fail('Назначение недоступно для отправки.');
          if(v('answer').length<40||v('answer').length>8000)return fail('Решение должно содержать от 40 до 8000 символов.');
          a.answer=v('answer');a.status='submitted';a.submittedAt=new Date().toISOString();
        }
        if(form.classList.contains('curriculum-review')){
          if(!['admin','teacher'].includes(role))return true;const a=c.allocations.find(a=>a.id===v('allocation')&&a.status==='submitted');
          if(!a||!['approved','revision'].includes(v('decision'))||v('feedback').length<20||v('feedback').length>3000||!f.has('reviewed'))return fail('Нужны решение, отзыв от 20 символов и подтверждение рассмотрения.');
          a.status=v('decision');a.feedback=v('feedback');a.reviewedAt=new Date().toISOString();
        }
        const saved=ctx.save();ctx.render();if(saved!==false)ctx.toast('Изменения сохранены в этом браузере.');return true;
      }
    };
  }
  return {create};
})();
