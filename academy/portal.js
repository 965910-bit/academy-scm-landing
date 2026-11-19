"use strict";
/* Public catalog; no remote requests, invented prices or credential promises. */
window.SCMPortal = {
  create({ programs, settings, isOpen, esc, apply }) {
    let query = '', audience = 'all', availability = 'all';
    const selected = new Set();
    const labels = { degree: 'Системное образование', leaders: 'Руководителям', practice: 'Практикам', business: 'Компаниям' };
    const outlines = {
      higher: ['Основы менеджмента и экономики', 'Количественные методы и анализ данных', 'Логистика и проектирование цепей поставок', 'Исследовательская и проектная работа'],
      mba: ['Стратегия и финансовая модель SCM', 'Операционная модель и управление рисками', 'S&OP и межфункциональное управление', 'Проект трансформации цепи поставок'],
      intensive: ['Постановка практической задачи', 'Данные и ограничения модели', 'Расчёт и сравнение сценариев', 'Защита решения и план проверки'],
      retraining: ['Закупки и управление поставщиками', 'Склад, транспорт и распределение', 'Запасы, сервис и аналитика', 'Итоговый межфункциональный проект'],
      international: ['Выбор внешней программы и проверка требований', 'Профессиональная терминология', 'Разбор предметных тем выбранной траектории', 'План самостоятельной подготовки к внешней оценке'],
      corporate: ['Диагностика задач команды', 'Матрица компетенций и учебный маршрут', 'Практика на обезличенном кейсе', 'Защита проекта и оценка переноса в работу'],
      seminars: ['Обзор предметной темы', 'Разбор кейса с экспертом', 'Обсуждение подходов и ограничений', 'План дальнейшего самостоятельного изучения']
    };
    const outcomes = {
      higher: 'Системно связывать управленческие решения, данные и процессы цепи поставок.',
      mba: 'Обосновывать программу изменений через стратегию, финансы, сервис и риски.',
      intensive: 'Сформулировать задачу и проверить рабочую модель на учебном сценарии.',
      retraining: 'Связывать закупки, запасы, склад и транспорт в единую модель решений.',
      international: 'Составить маршрут подготовки с учётом требований внешнего правообладателя.',
      corporate: 'Согласовать язык решений и план развития компетенций команды.',
      seminars: 'Разобраться в выбранном вопросе и определить следующий шаг развития.'
    };
    const visible = () => programs.filter(p => settings()[p.id].visible);
    const status = p => `<span class="badge ${isOpen(p) ? '' : 'planned'}">${isOpen(p) ? 'Локальный приём открыт' : 'Подготовка к запуску'}</span>`;
    const link = p => `<a href="#/program/${p.id}" class="button outline small">Изучить программу ↗</a>`;
    const crumb = label => `<nav class="portal-crumb" aria-label="Хлебные крошки"><a href="#home">Главная</a><span>/</span><a href="#/catalog">Каталог</a><span>/</span><span>${label}</span></nav>`;
    const intro = (tag, title, text) => `<span class="eyebrow">${tag}</span><h1 tabindex="-1">${title}</h1><p class="lead">${text}</p>`;
    const warning = '<p class="warning">Проектируемые программы. Содержание предварительное, а стоимость, преподаватели и условия выдачи документов не утверждены. Реальные приём и оплата на сайте не ведутся.</p>';
    function card(p) {
      return `<article class="card portal-card" data-direction="${p.id}"><span class="number">${p.code}</span><h2>${p.title}</h2><p>${p.text}</p><div class="card-meta"><span>${p.duration}</span>${status(p)}</div><p class="micro">${labels[p.audience]}</p>${link(p)}<button class="portal-compare-toggle" data-compare="${p.id}" aria-pressed="${selected.has(p.id)}">${selected.has(p.id) ? '✓ В сравнении' : '+ Сравнить'}</button></article>`;
    }
    function catalog() {
      const shown = visible().filter(p => (audience === 'all' || p.audience === audience) && (availability === 'all' || (availability === 'open' ? isOpen(p) : !isOpen(p))) && `${p.title} ${p.text} ${p.code}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
      return `<div class="container portal-page">${crumb('Все направления')}<div class="portal-intro">${intro('НАЙДИТЕ СВОЮ ТРАЕКТОРИЮ', 'Образование под<br>вашу задачу.', 'От первого практического инструмента до системной подготовки и развития команды.')}<a href="#/advisor" class="button">Помогите выбрать ↗</a></div><form id="portal-search" class="portal-search"><label>Поиск по названию и содержанию<input name="query" type="search" maxlength="160" value="${esc(query)}" placeholder="Например: запасы, MBA, закупки"></label><label>Для кого<select name="audience"><option value="all">Все аудитории</option>${Object.entries(labels).map(([id,l])=>`<option value="${id}" ${id===audience?'selected':''}>${l}</option>`).join('')}</select></label><label>Доступность<select name="availability"><option value="all">Все статусы</option><option value="planned" ${availability==='planned'?'selected':''}>Подготовка к запуску</option><option value="open" ${availability==='open'?'selected':''}>Локальный приём открыт</option></select></label><button class="button">Найти</button></form><div class="portal-result-line"><p role="status">Найдено направлений: <b>${shown.length}</b></p><a href="#/compare" class="button outline small">Сравнить (${selected.size}/3) ↗</a></div><div class="grid">${shown.map(card).join('') || '<div class="empty"><h2>Ничего не найдено</h2><p>Попробуйте другую формулировку или сбросьте фильтры.</p><button class="button outline" data-portal-reset>Сбросить фильтры</button></div>'}</div>${warning}</div>`;
    }
    function detail(id) {
      const p = visible().find(p=>p.id===id);
      if (!p) return `<div class="container portal-page">${crumb('Недоступно')}${intro('СТРАНИЦА НЕДОСТУПНА', 'Направление не опубликовано', 'Программа скрыта или адрес указан неверно.')}<a class="button" href="#/catalog">Вернуться в каталог</a></div>`;
      return `<div class="container portal-page">${crumb(p.title)}<section class="portal-program-hero"><div>${intro(p.code,p.title,p.text)}${status(p)}<div class="actions"><button class="button" data-portal-apply="${p.id}" ${isOpen(p)?'':'disabled'}>Подать заявку ↗</button><button class="button outline" data-compare="${p.id}" aria-pressed="${selected.has(p.id)}">${selected.has(p.id)?'✓ В сравнении':'+ Сравнить'}</button></div><a href="#/compare">Открыть сравнение →</a></div><aside class="panel portal-facts"><span class="eyebrow">ПАСПОРТ НАПРАВЛЕНИЯ</span><dl><dt>Аудитория</dt><dd>${labels[p.audience]}</dd><dt>Продолжительность</dt><dd>${p.duration}</dd><dt>Стоимость и даты</dt><dd>Не утверждены</dd><dt>Формат</dt><dd>Уточняется для конкретной программы</dd><dt>Приём</dt><dd>${isOpen(p)?'Только локальная заявка':'Пока закрыт'}</dd></dl><a href="#/admission">Как устроено поступление →</a></aside></section><nav class="portal-subnav" aria-label="Разделы программы"><a href="#/program/${p.id}/outcomes">Результат</a><a href="#/program/${p.id}/curriculum">Учебный план</a><a href="#/program/${p.id}/requirements">Условия и документы</a></nav><section id="portal-outcomes" class="section"><span class="eyebrow">ОТ ЗНАНИЯ К РЕШЕНИЮ</span><h2>На что направлена подготовка</h2><p class="lead">${outcomes[p.id]}</p><p>Это проектируемый учебный результат, а не гарантия трудоустройства, дохода или присвоения квалификации.</p></section><section id="portal-curriculum" class="portal-curriculum"><div><span class="eyebrow">ПРЕДВАРИТЕЛЬНАЯ СТРУКТУРА</span><h2>Что внутри<br>программы</h2><p>Темы для проектирования. Часы, дисциплины и формы контроля требуют методического утверждения.</p></div><div>${outlines[p.id].map((t,i)=>`<details><summary><span>0${i+1}</span> ${t}</summary><p>Предлагаемый блок: теория, разбор учебной ситуации и самостоятельное решение с обратной связью. Окончательное содержание и критерии проверки будут опубликованы после утверждения.</p></details>`).join('')}</div></section><section class="section"><h2>Попробуйте подход до выбора</h2><p>Три общих учебных модуля и лаборатория запасов доступны в учебной среде. Это не полная версия данной программы.</p><button class="button" data-role-entry="learner">Открыть учебную среду ↗</button></section><section id="portal-requirements" class="portal-curriculum"><div><span class="eyebrow">ПРОЗРАЧНЫЕ УСЛОВИЯ</span><h2>До начала обучения</h2></div><div><h3>Правовые основания</h3><p>${p.requirement}</p><h3>Документ по завершении</h3><p>${p.document}</p><h3>Преподаватели и оценивание</h3><p>Состав преподавателей не утверждён. Критерии итоговой работы, порядок проверки человеком и условия пересдачи должны быть опубликованы до реального набора.</p></div></section>${warning}<a href="#/catalog" class="button outline">← Другие направления</a></div>`;
    }
    function compare() {
      const list=visible().filter(p=>selected.has(p.id));
      return `<div class="container portal-page">${crumb('Сравнение')}${intro('ОСОЗНАННЫЙ ВЫБОР','Сравните траектории','До трёх направлений рядом. Неизвестные условия не подменяем рекламными обещаниями.')}<p><a href="#/catalog">← Добавить из каталога</a></p>${list.length?`<div class="portal-table-wrap" tabindex="0" role="region" aria-label="Сравнение направлений, таблица с горизонтальной прокруткой"><table class="portal-table"><caption>Предварительные условия программ</caption><thead><tr><th scope="col">Параметр</th>${list.map(p=>`<th scope="col">${p.title}<br><button data-compare="${p.id}">Убрать из сравнения</button></th>`).join('')}</tr></thead><tbody>${[['Аудитория',p=>labels[p.audience]],['Срок',p=>p.duration],['Учебная цель',p=>outcomes[p.id]],['Документ',p=>p.document],['Основания',p=>p.requirement],['Стоимость',()=>'Не утверждена'],['Приём',p=>isOpen(p)?'Локальный приём открыт':'Подготовка к запуску']].map(([label,f])=>`<tr><th scope="row">${label}</th>${list.map(p=>`<td>${f(p)}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Подробнее</th>${list.map(p=>`<td>${link(p)}</td>`).join('')}</tr></tbody></table></div>`:'<div class="empty"><h2>Пока нечего сравнивать</h2><p>Выберите до трёх направлений в каталоге.</p></div>'}${warning}</div>`;
    }
    function advisor() {
      return `<div class="container portal-page">${crumb('Подбор')}${intro('НАЧНИТЕ С ЗАДАЧИ','Какой следующий шаг — ваш?','Выберите цель. Подбор работает по прозрачным правилам, без ИИ и сбора контактов.')}<form id="portal-advisor" class="panel"><label>Что вы хотите получить?<select name="goal"><option value="degree">Системное образование или смена специализации</option><option value="leaders">Развитие управленческой практики</option><option value="practice">Инструмент для конкретной задачи</option><option value="business">Развитие команды компании</option></select></label><button class="button">Показать подходящие направления ↗</button></form><p class="micro">Рекомендация учитывает только выбранную цель и опубликованные направления. Требования к образованию и допуску проверяются отдельно.</p></div>`;
    }
    function admission() {
      return `<div class="container portal-page">${crumb('Поступление')}${intro('ОТ ВЫБОРА К ОБУЧЕНИЮ','Понятный маршрут.<br>Без скрытых шагов.','Сейчас можно пройти локальный учебный сценарий. Реальные документы и платежи не принимаются.')}<div class="grid">${[['01','Выберите направление','Сравните цель, содержание и основания выдачи документа.'],['02','Проверьте условия','До реального набора должны быть опубликованы требования, договор, стоимость, даты и сведения об организации.'],['03','Оформите поступление','Локальная заявка доступна только для направления с открытым администратором локальным приёмом.'],['04','Учитесь и получайте обратную связь','Учебные материалы, практика и проверка преподавателем объединяются в кабинете.']].map(([n,t,d])=>`<article class="card"><span class="number">${n}</span><h2>${t}</h2><p>${d}</p></article>`).join('')}</div><section class="section"><h2>Какие документы понадобятся?</h2><p>Зависит от вида программы и требований законодательства. Утверждённого перечня для наших программ пока нет. Не загружайте паспорт, диплом или другие реальные документы в прототип.</p><a href="#/catalog" class="button">Выбрать направление ↗</a> <button data-role-entry="applicant" class="button outline">Кабинет абитуриента ↗</button></section>${warning}</div>`;
    }
    return {
      active: () => location.hash.startsWith('#/'),
      render() {
        // Visibility may change during the session; never expose hidden selections.
        for (const id of selected) if (!visible().some(p=>p.id===id)) selected.delete(id);
        const parts=location.hash.slice(2).split('/');
        if(parts[0]==='catalog') return catalog();
        if(parts[0]==='program') return detail(parts[1]);
        if(parts[0]==='compare') return compare();
        if(parts[0]==='advisor') return advisor();
        if(parts[0]==='admission') return admission();
        return `<div class="container portal-page">${intro('404','Страница не найдена','Проверьте адрес или вернитесь в каталог.')}<a class="button" href="#/catalog">Открыть каталог</a></div>`;
      },
      click(t) {
        if(t.hasAttribute('data-compare')) {
          const id=t.dataset.compare;
          if(!visible().some(p=>p.id===id)) return false;
          if(selected.has(id)) selected.delete(id);
          else if(selected.size<3) selected.add(id);
          else return 'Для сравнения можно выбрать не больше трёх направлений.';
          return true;
        }
        if(t.hasAttribute('data-portal-reset')) {query='';audience='all';availability='all';return true;}
        if(t.dataset.portalApply) {const p=visible().find(p=>p.id===t.dataset.portalApply);if(p&&isOpen(p)) apply(p);return true;}
        return false;
      },
      submit(form) {
        if(form.id==='portal-search') {
          const f=new FormData(form);query=String(f.get('query')||'').trim().slice(0,160);audience=String(f.get('audience'));availability=String(f.get('availability'));return true;
        }
        if(form.id==='portal-advisor') {
          query='';availability='all';audience=String(new FormData(form).get('goal'));location.hash='/catalog';return true;
        }
        return false;
      },
      scrollSection() {
        const anchor=location.hash.split('/')[3];
        if(['outcomes','curriculum','requirements'].includes(anchor)) document.getElementById(`portal-${anchor}`)?.scrollIntoView();
      }
    };
  }
};
