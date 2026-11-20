const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");
const key = "scm-academy-workspace-v2";
function app(storage) {
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "index.html"), "utf8"),
    { url: "https://example.test/academy/", runScripts: "outside-only" },
  );
  const w = dom.window;
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.confirm = () => true;
  if (storage) w.localStorage.setItem(key, JSON.stringify(storage));
  w.eval(fs.readFileSync(path.join(root, "offline-config.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "offline.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "learning.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "portal.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "documents/catalog.js"), "utf8"));
  for(const f of ["documents/folders.js","documents/directory.js"])w.eval(fs.readFileSync(path.join(root,f),"utf8"));
  w.eval(fs.readFileSync(path.join(root, "documents.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "vendor/qrcode.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "student-card.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "knowledge.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "curriculum.js"), "utf8"));
  w.TextEncoder = TextEncoder;
  w.eval(fs.readFileSync(path.join(root, "study-tools.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "decision-lab.js"), "utf8"));
  // Identity double for synchronous UI regression tests only. Real access is tested against HTTP.
  w.SCMIdentity={workspace:storage||null,user:null,login(name){this.user={id:name,name,role:name};return this.user;}};
  w.eval(fs.readFileSync(path.join(root, "manual-records.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "app.js"), "utf8"));
  const $ = (s) => w.document.querySelector(s);
  const click = (s) => {
    assert.ok($(s), `Missing ${s}`);
    $(s).click();
  };
  const submit = (s) =>
    $(s).dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
  const role = (r) => {
    w.SCMIdentity.user=null;
    click("#account-button");
    $("#login-form [name=name]").value = r;
    $("#login-form [name=password]").value = "fixture-password";
    submit("#login-form");
  };
  const tab = (t) => click(`[data-tab="${t}"]`);
  const value = (s, v) => {
    $(s).value = v;
  };
  const change = (s, v) => {
    value(s, v);
    $(s).dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  const state = () => JSON.parse(w.localStorage.getItem(key));
  function enable() {
    role("admin");
    tab("directions");
    for (const field of ["verified", "admissions"])
      $(`[name="intensive-${field}"]`).checked = true;
    value('[name="intensive-evidence"]', "Демо: условия формата проверены");
    value('[name="intensive-date"]', "2026-01-01");
    submit("#settings-form");
  }
  return { dom, w, $, click, submit, role, tab, value, change, state, enable };
}
test("Каталог: 7 направлений, фильтры и условия без открытого приёма", () => {
  const a = app();
  assert.equal(a.w.document.querySelectorAll(".card").length, 7);
  assert.match(a.$("#main").textContent, /Подготовка к запуску/);
  a.click('[data-program="higher"]');
  assert.equal(a.$("#program-dialog").open, true);
  assert.match(a.$("#program-detail").textContent, /Лицензия/);
  a.click('[data-filter="practice"]');
  assert.equal(a.w.document.querySelectorAll(".card").length, 2);
  a.dom.window.close();
});
test("Без проверенных оснований нельзя открыть приём", () => {
  const a = app();
  a.role("admin");
  a.tab("directions");
  a.$('[name="higher-admissions"]').checked = true;
  a.submit("#settings-form");
  assert.match(a.$("#toast").textContent, /нужны публикация/);
  assert.equal(a.state(), null);
  a.dom.window.close();
});
test("Дата в будущем блокирует приём", () => {
  const a = app();
  a.role("admin");
  a.tab("directions");
  for (const f of ["verified", "admissions"])
    a.$(`[name="higher-${f}"]`).checked = true;
  a.value('[name="higher-evidence"]', "Проверка");
  a.value('[name="higher-date"]', "2999-01-01");
  a.submit("#settings-form");
  assert.match(a.$("#toast").textContent, /корректная дата/);
  a.dom.window.close();
});
test("Полный сценарий: допуск → заявка → решение → сохранение после перезагрузки", () => {
  const a = app();
  a.enable();
  assert.equal(a.state().settings.intensive.admissions, true);
  a.role("applicant");
  a.tab("application");
  a.value('[name="goal"]', "Учебный расчёт запасов");
  a.submit("#application-form");
  assert.equal(a.state().applications.length, 1);
  a.role("admin");
  a.tab("applications");
  a.change("[data-application-status]", "Нужны документы");
  assert.equal(a.state().applications[0].status, "Нужны документы");
  const b = app(a.state());
  b.role("applicant");
  assert.match(b.$("#main").textContent, /Нужны документы/);
  b.dom.window.close();
  a.dom.window.close();
});
test("Скрытие направления убирает его с витрины и из набора", () => {
  const a = app();
  a.enable();
  a.$('[name="intensive-admissions"]').checked = false;
  a.$('[name="intensive-visible"]').checked = false;
  a.submit("#settings-form");
  a.click('[data-action="logout"]');
  assert.equal(a.$('[data-program="intensive"]'), null);
  a.role("applicant");
  a.tab("application");
  assert.match(a.$("#main").textContent, /Приём пока не открыт/);
  a.dom.window.close();
});
test("Преподаватель: оценка и создание задания", () => {
  const a = app();
  a.role("teacher");
  a.tab("grading");
  a.change('[data-grade="student-1"]', "Зачёт");
  assert.equal(a.state().grades["student-1"], "Зачёт");
  a.tab("assignments");
  a.value('[name="title"]', "Запасы");
  a.value('[name="body"]', "Рассчитать точку заказа");
  a.value('[name="deadline"]', "2027-02-01");
  a.submit("#assignment-form");
  assert.equal(a.state().assignments.length, 1);
  assert.match(a.$("#main").textContent, /Рассчитать точку заказа/);
  a.dom.window.close();
});
test("Записи документов для приёма: добавление и удаление", () => {
  const a = app();
  a.role("applicant");
  a.tab("intake-documents");
  a.submit("#document-form");
  assert.equal(a.state().documents.length, 1);
  a.click("[data-remove-doc]");
  assert.equal(a.state().documents.length, 0);
  a.dom.window.close();
});
test("Сообщения экранируются и видны другим демо-ролям", () => {
  const a = app();
  a.role("applicant");
  a.tab("messages");
  a.value('[name="body"]', "<img src=x onerror=alert(1)>");
  a.submit("#message-form");
  assert.equal(a.$("#main img"), null);
  assert.match(a.$("#main").textContent, /<img src=x/);
  a.role("teacher");
  a.tab("messages");
  assert.match(a.$("#main").textContent, /<img src=x/);
  a.dom.window.close();
});
test("Закрытый приём не позволяет создать заявку", () => {
  const a = app();
  a.role("applicant");
  a.tab("application");
  assert.equal(a.$("#application-form"), null);
  a.dom.window.close();
});
test("Сброс из админки удаляет локальные заявки", () => {
  const a = app();
  a.enable();
  a.role("applicant");
  a.tab("application");
  a.value('[name="goal"]', "Демо");
  a.submit("#application-form");
  a.role("admin");
  a.click('[data-action="reset"]');
  assert.equal(a.state().applications.length, 0);
  assert.equal(a.state().settings.intensive.admissions, false);
  a.dom.window.close();
});

test("Подвал остаётся внутри платформы и не содержит перехода на старый сайт", () => {
  const a = app();
  assert.doesNotMatch(a.$("footer").textContent, /Основной сайт/);
  for (const link of a.w.document.querySelectorAll("footer a")) {
    assert.ok(link.getAttribute("href").startsWith("#"));
    assert.ok(a.$(link.getAttribute("href")));
  }
  a.dom.window.close();
});
test("Карточки открывают единый вход без выбора прав", () => {
  const a = app();
  for (const role of ["applicant", "teacher", "admin"]) {
    a.click(`.role-card [data-role-entry="${role}"]`);
    assert.equal(a.$("#login-dialog").open, true);
    assert.equal(a.$("#login-form select"), null);
    a.$("#login-dialog").close();
  }
  a.click('footer [data-role-entry="teacher"]');
  a.value('#login-form [name=name]','teacher');
  a.submit("#login-form");
  assert.match(a.$("#main").textContent, /Рабочий стол преподавателя/);
  a.dom.window.close();
});
test("Возврат из кабинета по ссылке подвала открывает раздел вопросов", () => {
  const a = app();
  a.role("applicant");
  a.w.location.hash = "#questions";
  a.w.dispatchEvent(new a.w.Event("hashchange"));
  assert.ok(a.$("#questions"));
  assert.equal(a.w.document.querySelectorAll("#questions details").length, 4);
  a.dom.window.close();
});

function quiz(a, correct = true) {
  a.role('learner');
  a.tab('courses');
  a.click('[data-learn-module="inventory"]');
  a.click('[data-learning-action="start-test"]');
  a.$(`[name="q0"][value="${correct ? 1 : 0}"]`).checked = true;
  a.$(`[name="q1"][value="${correct ? 2 : 0}"]`).checked = true;
  a.value('[name="reason"]', 'Учитываю спрос за срок поставки, ожидаемые поступления и неудовлетворённый спрос.');
  a.$('[name="declaration"]').checked = true;
  a.submit('#learning-quiz');
}
test('Учебный кабинет: три модуля и поиск по навыку', () => {
  const a = app(); a.role('learner'); a.tab('courses');
  assert.equal(a.w.document.querySelectorAll('.learning-course').length, 3);
  a.value('[name="query"]', 'сервис'); a.submit('#course-search');
  assert.equal(a.w.document.querySelectorAll('.learning-course').length, 1);
  a.value('[name="query"]', '<img src=x>'); a.submit('#course-search');
  assert.equal(a.$('#main img'), null); assert.match(a.$('#main').textContent, /Ничего не найдено/);
  a.dom.window.close();
});
test('Прочтение не подтверждает навык и сохраняется отдельно', () => {
  const a=app(); a.role('learner'); a.tab('courses'); a.click('[data-learn-module="inventory"]'); a.click('[data-learning-action="mark-read"]');
  assert.deepEqual(a.state().learning.read, ['inventory']); assert.equal(a.state().learning.attempts.length, 0);
  a.tab('skills'); assert.match(a.$('#main').textContent, /Теория прочитана/); a.dom.window.close();
});
test('Лаборатория: правильная формула, округление, единицы и сохранение', () => {
  const a=app(); const calc=a.w.SCMLearning.calculateInventory;
  const r=calc({demand:80,lead:7,sigma:15,z:1.645});
  assert.equal(r.expected,560); assert.equal(r.reorder,626); assert.ok(Math.abs(r.safety-65.2789)<.01);
  assert.equal(calc({demand:20,lead:5,sigma:0,z:1}).reorder,100);
  a.role('learner'); a.tab('lab'); a.submit('#inventory-form');
  assert.equal(a.state().learning.lab.result.reorder,626); assert.match(a.$('#inventory-result').textContent,/626/); a.dom.window.close();
});
test('Лаборатория отвергает отрицательные, бесконечные и пустые параметры',()=>{
  const a=app();
  for(const bad of [{demand:-1},{lead:0},{sigma:-2},{z:5},{demand:Infinity},{lead:NaN}]){
    assert.throws(()=>a.w.SCMLearning.calculateInventory({demand:80,lead:7,sigma:15,z:1.645,...bad}));
  }
  a.role('learner');a.tab('lab');a.value('[name="sigma"]','');a.submit('#inventory-form');assert.match(a.$('#toast').textContent,/Заполните все/);assert.equal(a.state(),null);a.dom.window.close();
});
test('Корректная попытка ждёт преподавателя, а не выпускает credential',()=>{
  const a=app();quiz(a);const attempt=a.state().learning.attempts[0];assert.equal(attempt.score,2);assert.equal(attempt.status,'pending');assert.equal(attempt.recordCode,undefined);a.tab('skills');assert.match(a.$('#main').textContent,/Ожидает проверки/);a.dom.window.close();
});
test('Неполный тест и пустое обоснование не сохраняются',()=>{
  const a=app();a.role('learner');a.tab('courses');a.click('[data-learn-module="inventory"]');a.click('[data-learning-action="start-test"]');a.submit('#learning-quiz');assert.equal(a.state(),null);assert.match(a.$('#toast').textContent,/Ответьте на вопросы/);a.dom.window.close();
});
test('Неверная попытка требует повторения и не попадает в автоматическое подтверждение',()=>{
  const a=app();quiz(a,false);assert.equal(a.state().learning.attempts[0].score,0);assert.equal(a.state().learning.attempts[0].status,'revision');a.role('teacher');a.tab('reviews');assert.equal(a.$('.learning-review-form'),null);a.dom.window.close();
});
test('Учебный цикл: преподаватель рассматривает → навык → локальная проверка работодателем',()=>{
  const a=app();quiz(a);a.role('teacher');a.tab('reviews');
  a.value('[name="feedback"]','Коротко');a.submit('.learning-review-form');assert.equal(a.state().learning.attempts[0].status,'pending');
  a.value('[name="feedback"]','Обоснование соответствует учебным критериям. Допущения модели указаны корректно.');a.$('[name="reviewed"]').checked=true;a.submit('.learning-review-form');
  const result=a.state().learning.attempts[0];assert.equal(result.status,'approved');assert.match(result.recordCode,/^LOCAL-/);
  a.role('learner');a.tab('skills');assert.match(a.$('#main').textContent,/Проверено локально/);
  a.role('employer');a.value('[name="code"]',result.recordCode);a.submit('#learning-verify');assert.match(a.$('#verification-result').textContent,/ЛОКАЛЬНАЯ ЗАПИСЬ НАЙДЕНА/);assert.doesNotMatch(a.$('#verification-result').textContent,/Обоснование соответствует/);
  a.value('[name="code"]','DEMO-unknown');a.submit('#learning-verify');assert.match(a.$('#verification-result').textContent,/Запись не найдена/);a.dom.window.close();
});
test('Преподаватель может вернуть корректный тест на доработку',()=>{
  const a=app();quiz(a);a.role('teacher');a.tab('reviews');a.value('[name="decision"]','revision');a.value('[name="feedback"]','Уточните допущения о независимости спроса и постоянстве срока поставки.');a.$('[name="reviewed"]').checked=true;a.submit('.learning-review-form');assert.equal(a.state().learning.attempts[0].status,'revision');assert.equal(a.state().learning.attempts[0].recordCode,undefined);a.dom.window.close();
});
test('Задание преподавателя доступно слушателю, решение проверяется с обратной связью',()=>{
  const a=app();a.role('teacher');a.tab('assignments');a.value('[name="title"]','План запасов');a.value('[name="body"]','Обоснуйте точку заказа и ограничения модели.');a.value('[name="deadline"]','2027-02-01');a.submit('#assignment-form');
  a.role('learner');a.tab('work');a.value('[name="body"]','Позицию запаса сравниваю с точкой заказа. Для независимого спроса учитываю корень из срока поставки.');a.submit('.learning-work-form');assert.equal(a.state().learning.submissions.length,1);
  a.role('teacher');a.tab('reviews');a.value('[name="feedback"]','Пояснение принято в демо. Дополнительно укажите единицы измерения.');a.$('[name="reviewed"]').checked=true;a.submit('.learning-review-form');assert.equal(a.state().learning.submissions[0].status,'approved');a.dom.window.close();
});
test('Предметный помощник честно обозначен как правила, без вызова LLM',()=>{
  const a=app();a.role('learner');a.tab('assistant');a.value('[name="topic"]','service');a.submit('#learning-assistant');assert.match(a.$('#assistant-response').textContent,/CSL ≠ fill rate/);assert.match(a.$('#assistant-response').textContent,/НЕ LLM/);a.dom.window.close();
});
test('Учебные результаты переживают перезагрузку; админ видит локальные события',()=>{
  const a=app();quiz(a);const b=app(a.state());b.role('admin');b.tab('activity');assert.match(b.$('#main').textContent,/Сохранена учебная попытка/);b.role('learner');b.tab('skills');assert.match(b.$('#main').textContent,/Ожидает проверки/);b.dom.window.close();a.dom.window.close();
});
test('Офлайн-манифест включает все скрипты оболочки и только существующие публичные ресурсы',()=>{
  const a=app();const config=a.w.SCM_OFFLINE_CONFIG;
  assert.ok(config.files.includes('learning.js'));assert.ok(config.files.includes('app.js'));
  for(const file of config.files){assert.ok(!file.includes('..'));assert.ok(fs.existsSync(path.join(root,file==='./'?'index.html':file)));}
  a.role('learner');a.tab('offline');assert.match(a.$('#main').textContent,/Для входа и сохранения на сервере нужна сеть/);a.dom.window.close();
});
test('Без service worker офлайн-подготовка честно сообщает ограничение',async()=>{
  const a=app();await assert.rejects(a.w.SCMOffline.prepare(),/HTTPS/);a.dom.window.close();
});

async function route(a, hash) {
  a.w.location.hash = hash;
  await new Promise(resolve => a.w.setTimeout(resolve, 0));
}
test('Портал: каталог, поиск, пустой результат и сброс', async()=>{
 const a=app();await route(a,'/catalog');assert.equal(a.w.document.querySelectorAll('.portal-card').length,7);
 a.value('[name="query"]','MBA');a.submit('#portal-search');assert.equal(a.w.document.querySelectorAll('.portal-card').length,1);
 a.value('[name="query"]','<img src=x>');a.submit('#portal-search');assert.match(a.$('#main').textContent,/Ничего не найдено/);assert.equal(a.$('#main img'),null);
 a.click('[data-portal-reset]');assert.equal(a.w.document.querySelectorAll('.portal-card').length,7);a.dom.window.close();
});
test('Портал: подробные страницы всех семи направлений, закрытый приём и неверный адрес',async()=>{
 const a=app();for(const id of ['higher','mba','intensive','retraining','international','corporate','seminars']){
  await route(a,'/program/'+id);assert.ok(a.$('#portal-curriculum'));assert.equal(a.w.document.querySelectorAll('#portal-curriculum details').length,4);assert.equal(a.$('[data-portal-apply]').disabled,true);
 }
 await route(a,'/program/unknown');assert.match(a.$('#main').textContent,/не опубликовано/);a.dom.window.close();
});
test('Портал: сравнение ограничено тремя и удаление работает',async()=>{
 const a=app();await route(a,'/catalog');for(const id of ['higher','mba','intensive','retraining'])a.click(`[data-compare="${id}"]`);
 assert.match(a.$('#toast').textContent,/не больше трёх/);await route(a,'/compare');assert.equal(a.w.document.querySelectorAll('.portal-table thead th').length,4);
 a.click('[data-compare="mba"]');assert.equal(a.w.document.querySelectorAll('.portal-table thead th').length,3);a.dom.window.close();
});
test('Портал: подбор по цели и переход из кабинета обратно на главную',async()=>{
 const a=app();await route(a,'/advisor');a.value('[name="goal"]','business');a.submit('#portal-advisor');await new Promise(r=>a.w.setTimeout(r,0));assert.equal(a.w.document.querySelectorAll('.portal-card').length,1);assert.match(a.$('#main').textContent,/Внутренняя академия/);
 a.role('learner');await route(a,'/admission');assert.ok(a.$('.portal-page'));await route(a,'home');assert.ok(a.$('.hero'));a.dom.window.close();
});
test('Портал: скрытая программа недоступна по прямой ссылке, открытая ведёт в нужную заявку',async()=>{
 const a=app();a.enable();a.role('applicant');await route(a,'/program/intensive');a.click('[data-portal-apply]');assert.equal(a.$('[name="program"]').value,'intensive');
 a.role('admin');a.tab('directions');a.$('[name="higher-visible"]').checked=false;a.submit('#settings-form');await route(a,'/program/higher');assert.match(a.$('#main').textContent,/не опубликовано/);a.dom.window.close();
});

test('Мобильное меню раскрывается, закрывается по Escape и ссылке',()=>{
 const a=app();a.click('.mobile-menu-toggle');assert.equal(a.$('.mobile-menu-toggle').getAttribute('aria-expanded'),'true');
 a.w.document.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(a.$('.mobile-menu-toggle').getAttribute('aria-expanded'),'false');
 a.click('.mobile-menu-toggle');a.click('#primary-navigation a');assert.equal(a.$('.mobile-menu-toggle').getAttribute('aria-expanded'),'false');a.dom.window.close();
});
test('Старые локальные записи сохраняются при обновлении подписей и кодов',()=>{
 const a=app();quiz(a);const old=a.state();old.learning.attempts[0].status='approved';old.learning.attempts[0].recordCode='DEMO-EXISTING';old.documents=[{id:'old-doc',type:'Портфолио · демо'}];
 const b=app(old);b.role('learner');b.tab('skills');assert.match(b.$('#main').textContent,/LOCAL-EXISTING/);assert.doesNotMatch(b.$('#main').textContent,/демо|demo/i);
 b.role('employer');b.value('[name="code"]','DEMO-EXISTING');b.submit('#learning-verify');assert.match(b.$('#verification-result').textContent,/ЗАПИСЬ НАЙДЕНА/);
 b.role('applicant');b.tab('documents');assert.match(b.$('#main').textContent,/Портфолио/);assert.doesNotMatch(b.$('#main').textContent,/демо|demo/i);b.dom.window.close();a.dom.window.close();
});
test('Все кабинеты используют новые подписи и единый вход',()=>{
 const a=app();for(const r of ['applicant','learner','teacher','admin','employer']){
  a.role(r);const tabs=[...a.w.document.querySelectorAll('.sidebar [data-tab]')].map(t=>t.dataset.tab);
  for(const tab of tabs){a.tab(tab);assert.doesNotMatch(a.$('#main').textContent,/демо|demo/i,`${r}/${tab}`);}
 }
 a.tab('overview');assert.match(a.$('#main').textContent,/не доказывает личность/);a.click('#account-button');assert.match(a.$('#login-dialog').textContent,/вход по ФИО без пароля/);a.dom.window.close();
});

function curriculumStudent(a,name='Участник 01',cohort='SCM-01'){
 a.role('admin');a.tab('students');a.value('[name="name"]',name);a.value('[name="cohort"]',cohort);a.submit('#curriculum-student');
}
function curriculumAllocate(a,module='inventory',target){
 a.tab('allocations');a.value('[name="target"]',target||`student:${a.state().curriculum.students[0].id}`);a.value('[name="module"]',module);a.value('[name="due"]','2027-03-01');a.submit('#curriculum-allocate');
}
test('База: 12 модулей с теорией, кейсом, заданием и критериями',()=>{
 const a=app();a.role('admin');a.tab('library');const buttons=[...a.w.document.querySelectorAll('[data-curriculum-module]')].map(b=>b.dataset.curriculumModule);assert.equal(buttons.length,12);
 for(const id of buttons){a.click(`[data-curriculum-module="${id}"]`);assert.match(a.$('#main').textContent,/Практическое задание/);assert.match(a.$('#main').textContent,/Критерии рассмотрения/);assert.ok(a.w.document.querySelectorAll('.lesson-body section').length>=3);a.click('[data-curriculum-back]');}
 a.dom.window.close();
});
test('Реестр студентов: валидация, дубликаты, экранирование',()=>{
 const a=app();curriculumStudent(a,'<img src=x>');assert.equal(a.$('#main img'),null);assert.equal(a.state().curriculum.students.length,1);
 a.value('[name="name"]','<img src=x>');a.value('[name="cohort"]','SCM-01');a.submit('#curriculum-student');assert.equal(a.state().curriculum.students.length,1);a.dom.window.close();
});
test('Назначения: группа, целый маршрут, отсутствие дублей и снимок содержания',()=>{
 const a=app();curriculumStudent(a);curriculumStudent(a,'Участник 02');curriculumAllocate(a,'track:intensive','group:SCM-01');const saved=a.state();assert.equal(saved.curriculum.allocations.length,6);assert.equal(saved.curriculum.allocations[0].snapshot.version,1);assert.ok(saved.curriculum.allocations[0].snapshot.task);
 curriculumAllocate(a,'track:intensive','group:SCM-01');assert.equal(a.state().curriculum.allocations.length,6);a.dom.window.close();
});
test('Индивидуальное назначение не показывается другому локальному профилю',()=>{
 const a=app();curriculumStudent(a);curriculumStudent(a,'Участник 02');curriculumAllocate(a);
 a.role('learner');a.tab('studyplan');assert.equal(a.w.document.querySelectorAll('[data-curriculum-allocation]').length,1);
 a.value('[name="student"]',a.state().curriculum.students[1].id);a.submit('#curriculum-profile');assert.equal(a.$('[data-curriculum-allocation]'),null);a.dom.window.close();
});
test('Назначение → решение → доработка → повторная отправка → проверка человеком',()=>{
 const a=app();curriculumStudent(a);curriculumAllocate(a,'procurement');a.role('learner');a.tab('studyplan');a.click('[data-curriculum-allocation]');a.value('[name="answer"]','Коротко');a.submit('#curriculum-answer');assert.equal(a.state().curriculum.allocations[0].status,'assigned');
 const answer='Сравниваю полную стоимость заказа и стоимость пригодной единицы. Отдельно указываю потери от брака и допущения расчёта.';
 a.value('[name="answer"]',answer);a.submit('#curriculum-answer');assert.equal(a.state().curriculum.allocations[0].status,'submitted');
 a.role('teacher');a.tab('responses');a.value('[name="feedback"]','Нужно добавить численный расчёт стоимости пригодной единицы.');a.$('[name="reviewed"]').checked=true;a.submit('.curriculum-review');assert.equal(a.state().curriculum.allocations[0].status,'revision');
 a.role('learner');a.tab('studyplan');a.click('[data-curriculum-allocation]');assert.equal(a.$('[name="answer"]').value,answer);a.value('[name="answer"]',answer+' Стоимость пригодной единицы Б: 107000 / 980.');a.submit('#curriculum-answer');
 a.role('admin');a.tab('responses');a.value('[name="decision"]','approved');a.value('[name="feedback"]','Расчёт и ограничения рассмотрены. Учебное решение принято локально.');a.submit('.curriculum-review');assert.equal(a.state().curriculum.allocations[0].status,'submitted');a.$('[name="reviewed"]').checked=true;a.submit('.curriculum-review');assert.equal(a.state().curriculum.allocations[0].status,'approved');
 const b=app(a.state());b.role('learner');b.tab('studyplan');assert.match(b.$('#main').textContent,/Проверено локально/);b.dom.window.close();a.dom.window.close();
});

test('Сроки: просрочка только у несданных, дата сдачи сегодня не просрочена',()=>{
 const a=app(),tools=a.w.SCMStudyTools;
 const items=['assigned','revision','submitted','approved'].map((status,i)=>({id:String(i),status,due:'2026-11-18'}));
 const m=tools.metrics(items,'2026-11-19');assert.equal(m.overdue,2);assert.equal(m.submitted,1);assert.equal(m.approved,1);assert.equal(tools.overdue({status:'assigned',due:'2026-11-19'},'2026-11-19'),false);a.dom.window.close();
});
test('Календарь: события на весь день, CRLF, перенос по октетам, экранирование',()=>{
 const a=app(),tools=a.w.SCMStudyTools;
 const result=tools.calendar([{id:'a1',status:'assigned',due:'2026-12-31',snapshot:{title:'Русский заголовок '.repeat(12)+'; тест, строка\nEND:VEVENT'}},{id:'a2',status:'submitted',due:'2027-01-01'},{id:'a3',status:'assigned',due:'2026-02-31'}],new Date('2026-11-19T10:00:00Z'));
 assert.equal((result.match(/BEGIN:VEVENT/g)||[]).length,1);assert.match(result,/DTEND;VALUE=DATE:20270101/);assert.match(result,/DTSTAMP:20261119T100000Z/);assert.match(result,/\\;/);assert.match(result,/\\,/);assert.match(result.replace(/\r\n /g,''),/\\nEND:VEVENT/);
 for(const line of result.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);
 a.dom.window.close();
});
test('Черновик не отправляет работу, сохраняется после перезагрузки и не попадает в отзыв',()=>{
 const a=app();curriculumStudent(a);curriculumAllocate(a);a.role('learner');a.tab('studyplan');a.click('[data-curriculum-allocation]');a.value('[name="answer"]','Мой незаконченный черновик');
 a.$('[data-save-draft]').click();assert.equal(a.state().curriculum.allocations[0].status,'assigned');assert.equal(a.state().curriculum.allocations[0].answer,undefined);
 const b=app(a.state());b.role('learner');b.tab('studyplan');b.click('[data-curriculum-allocation]');assert.equal(b.$('[name="answer"]').value,'Мой незаконченный черновик');
 b.role('teacher');b.tab('responses');assert.doesNotMatch(b.$('#main').textContent,/Мой незаконченный черновик/);b.dom.window.close();a.dom.window.close();
});
test('Планировщик изолирует список профиля; мониторинг фильтрует группы',()=>{
 const a=app();curriculumStudent(a,'Первый','A');curriculumStudent(a,'Второй','B');curriculumAllocate(a,'inventory',`student:${a.state().curriculum.students[0].id}`);
 a.role('learner');a.tab('planner');assert.equal(a.w.document.querySelectorAll('[data-study-open]').length,1);a.value('[name="student"]',a.state().curriculum.students[1].id);a.submit('#study-profile');assert.equal(a.$('[data-study-open]'),null);
 a.role('admin');a.tab('monitoring');a.value('[name="cohort"]','B');a.submit('#study-filter');assert.match(a.$('#main').textContent,/Показано: 0/);a.dom.window.close();
});
test('История хранит отправку и решение без автоматического подтверждения',()=>{
 const a=app();curriculumStudent(a);curriculumAllocate(a);a.role('learner');a.tab('studyplan');a.click('[data-curriculum-allocation]');const answer='Собственное решение с формулой, единицами измерения, допущениями и проверкой ограничений модели.';a.value('[name="answer"]',answer);a.submit('#curriculum-answer');
 assert.equal(a.state().curriculum.allocations[0].history[0].type,'submission');assert.equal(a.state().curriculum.allocations[0].status,'submitted');
 a.role('teacher');a.tab('responses');a.value('[name="feedback"]','Нужно уточнить допущения и перепроверить исходные данные.');a.$('[name="reviewed"]').checked=true;a.submit('.curriculum-review');const history=a.state().curriculum.allocations[0].history;assert.equal(history.length,2);assert.equal(history[0].answer,answer);assert.equal(history[1].type,'review');assert.equal(history[1].status,'revision');a.dom.window.close();
});

test('История ограничена 10 записями при повторных доработках',()=>{
 const a=app();curriculumStudent(a);curriculumAllocate(a);
 for(let i=0;i<6;i++){
  a.role('learner');a.tab('studyplan');a.click('[data-curriculum-allocation]');a.value('[name="answer"]',`Версия ${i}: решение с расчётом, допущениями, единицами измерения и ограничениями учебной модели.`);a.submit('#curriculum-answer');
  a.role('teacher');a.tab('responses');a.value('[name="feedback"]',`Проверка ${i}: уточните ограничения и сопоставимость исходных данных.`);a.$('[name="reviewed"]').checked=true;a.submit('.curriculum-review');
 }
 const history=a.state().curriculum.allocations[0].history;assert.equal(history.length,10);assert.match(history[0].answer,/Версия 1/);assert.equal(history.at(-1).type,'review');a.dom.window.close();
});
test('Форма решения не показывается после переключения на профиль без назначения',()=>{
 const a=app();curriculumStudent(a);curriculumStudent(a,'Другой','B');curriculumAllocate(a);a.role('learner');a.tab('studyplan');a.click('[data-curriculum-allocation]');
 // The UI is not an authentication boundary; this checks accidental cross-profile writes.
 const old=a.state();old.curriculum.activeStudent=old.curriculum.students[1].id;const b=app(old);b.role('learner');b.tab('studyplan');assert.equal(b.$('#curriculum-answer'),null);b.dom.window.close();a.dom.window.close();
});

test('Тренажёр закупок: цена заказа, брак и чувствительность',()=>{
 const a=app();const r=a.w.SCMDecisionLab.procurement({quantity:1000,priceA:100,freightA:10000,defectA:0,priceB:105,freightB:2000,defectB:2});
 assert.equal(r.a.total,110000);assert.equal(r.a.unit,110);assert.equal(r.b.total,107000);assert.equal(r.b.usable,980);assert.ok(Math.abs(r.b.unit-109.183673)<.0001);assert.ok(r.stress.unit>110);a.dom.window.close();
});
test('Тренажёр доставки не скрывает непокрытый спрос',()=>{
 const a=app();const r=a.w.SCMDecisionLab.transport({demand:600,fixedA:30000,variableA:0,capacityA:600,fixedB:24000,variableB:0,capacityB:400});assert.equal(r.a.unit,50);assert.equal(r.b.unit,60);assert.equal(r.b.unserved,200);assert.equal(r.stress.unserved,80);a.dom.window.close();
});
test('Тренажёры отклоняют бесконечность, дробное количество и недопустимый брак',()=>{
 const a=app();const p={quantity:1000,priceA:100,freightA:10000,defectA:0,priceB:105,freightB:2000,defectB:2};
 for(const bad of [{quantity:0},{quantity:1.5},{defectB:100},{priceA:Infinity},{freightB:-1},{priceB:NaN}])assert.throws(()=>a.w.SCMDecisionLab.procurement({...p,...bad}));
 a.role('learner');a.tab('decisionlab');a.value('[name="priceA"]','');a.submit('#decision-calculate');assert.match(a.$('#toast').textContent,/Заполните все/);assert.equal(a.$('#decision-save'),null);a.dom.window.close();
});
test('Сценарий сохраняет снимок, экранирует обоснование и переживает перезагрузку',()=>{
 const a=app();a.role('learner');a.tab('decisionlab');a.submit('#decision-calculate');a.value('[name="reason"]','<img src=x> Выбираю вариант только после проверки качества, срока и чувствительности к доле брака.');a.submit('#decision-save');assert.equal(a.state().decisionCases.length,1);assert.equal(a.$('#main img'),null);assert.equal(a.state().decisionCases[0].version,1);
 a.click('[data-decision-model="transport"]');a.submit('#decision-calculate');assert.equal(a.state().decisionCases[0].inputs.quantity,1000);
 const b=app(a.state());b.role('admin');b.tab('decisionlab');assert.match(b.$('#main').textContent,/Выбираю вариант/);assert.ok(b.$('[data-decision-report]'));b.click('[data-decision-delete]');assert.equal(b.state().decisionCases.length,0);b.dom.window.close();a.dom.window.close();
});
test('Отчёт расчёта содержит формулы и ограничения, но не credential',()=>{
 const a=app();a.role('learner');a.tab('decisionlab');a.submit('#decision-calculate');a.value('[name="reason"]','Выбор зависит от требований к качеству, сроку и условий компенсации брака.');a.submit('#decision-save');const text=a.w.SCMDecisionLab.report(a.state().decisionCases[0]);assert.match(text,/Исходные данные/);assert.match(text,/Формула/);assert.match(text,/Без проверки преподавателем/);assert.equal(a.w.document.querySelectorAll('[data-decision-template]').length,3);a.dom.window.close();
});

test('Транспортная модель валидирует границы и не делит на ноль при нулевом тарифе',()=>{
 const a=app(),f=a.w.SCMDecisionLab.transport,v={demand:600,fixedA:30000,variableA:0,capacityA:600,fixedB:24000,variableB:0,capacityB:400};
 for(const bad of [{demand:0},{capacityA:0},{demand:1.5},{variableB:-1},{fixedA:Infinity},{capacityB:NaN}])assert.throws(()=>f({...v,...bad}));
 assert.equal(f({...v,fixedA:0,variableA:0}).a.unit,0);assert.equal(f({...v,demand:1}).stress.delivered,1);a.dom.window.close();
});
test('Лимит разборов не удаляет старые записи автоматически',()=>{
 const a=app();a.role('learner');a.tab('decisionlab');a.submit('#decision-calculate');a.value('[name="reason"]','Учебное решение основано на сравнении затрат и ограничениях качества поставки.');a.submit('#decision-save');const old=a.state();old.decisionCases=Array.from({length:20},(_,i)=>({...old.decisionCases[0],id:`case-${i}`}));
 const b=app(old);b.role('learner');b.tab('decisionlab');b.submit('#decision-calculate');b.value('[name="reason"]','Ещё одно учебное решение с допущениями и проверкой границ модели поставки.');b.submit('#decision-save');assert.equal(b.state().decisionCases.length,20);assert.equal(b.state().decisionCases[0].id,'case-0');assert.match(b.$('#toast').textContent,/Лимит 20/);b.dom.window.close();a.dom.window.close();
});

test('База знаний: 10 уникальных первоисточников с датами и ограничениями',()=>{
 const a=app();const sources=a.w.SCMKnowledge.sources;assert.equal(sources.length,10);assert.equal(new Set(sources.map(s=>s.id)).size,10);
 for(const s of sources){assert.equal(new URL(s.url).protocol,'https:');assert.equal(s.checked,'2026-11-19');assert.ok(s.limits.length>30);assert.ok(s.task.length>40);}
 a.role('learner');a.tab('knowledge');assert.equal(a.w.document.querySelectorAll('[data-knowledge-bookmark]').length,10);assert.match(a.$('#main').textContent,/внешние сайты требуют сети/);a.dom.window.close();
});
test('База знаний: поиск, закладки, пустая выборка и сохранение',()=>{
 const a=app();a.role('learner');a.tab('knowledge');a.value('[name="query"]','EPCIS');a.submit('#knowledge-search');assert.equal(a.w.document.querySelectorAll('[data-knowledge-bookmark]').length,1);a.click('[data-knowledge-bookmark="epcis"]');assert.deepEqual(a.state().knowledgeBookmarks,['epcis']);
 const b=app(a.state());b.role('teacher');b.tab('knowledge');b.$('[name="bookmarks"]').checked=true;b.submit('#knowledge-search');assert.equal(b.w.document.querySelectorAll('[data-knowledge-bookmark]').length,1);b.click('[data-knowledge-bookmark="epcis"]');assert.match(b.$('#main').textContent,/Ничего не найдено/);b.value('[name="query"]','<img src=x>');b.submit('#knowledge-search');assert.equal(b.$('#main img'),null);b.dom.window.close();a.dom.window.close();
});
test('Источник назначается группе как снимок, без повторных активных назначений',()=>{
 const a=app();curriculumStudent(a);curriculumStudent(a,'Участник 02');a.tab('knowledge');
 for(let i=0;i<2;i++){a.value('[name="source"]','epcis');a.value('[name="target"]','group:SCM-01');a.value('[name="due"]','2027-05-01');a.submit('#knowledge-assign');}
 assert.equal(a.state().curriculum.allocations.length,2);const snap=a.state().curriculum.allocations[0].snapshot;assert.equal(snap.id,'reading:epcis');assert.match(snap.sections[1][1],/2026-11-19/);assert.match(snap.task,/часовой пояс/);
 a.role('learner');a.tab('studyplan');a.click('[data-curriculum-allocation]');assert.equal(a.$('.knowledge-related a').href,'https://www.gs1.org/standards/epcis');a.value('[name="answer"]','В событии фиксирую объект, время с часовым поясом, место, операцию и источник. Для дубликатов определяю ключ события.');a.submit('#curriculum-answer');a.role('teacher');a.tab('responses');assert.ok(a.$('.curriculum-review'));assert.match(a.$('#main').textContent,/Работа с источником/);a.dom.window.close();
});
test('Существующий учебный модуль получил связанные источники без изменения теста',()=>{
 const a=app();a.role('admin');a.tab('library');a.click('[data-curriculum-module="digital"]');assert.match(a.$('.knowledge-related').textContent,/EPCIS/);assert.match(a.$('#main').textContent,/Практическое задание/);a.dom.window.close();
});
test('В базе явно различаются будущая редакция, старый курс и опасные грузы',()=>{
 const a=app(),sources=a.w.SCMKnowledge.sources;assert.match(sources.find(s=>s.id==='iata').limits,/ещё не наступила/);assert.match(sources.find(s=>s.id==='mitocw').edition,/2011/);assert.match(sources.find(s=>s.id==='imdg').limits,/недопустимы/);a.role('learner');a.tab('knowledge');assert.equal(a.$('#knowledge-assign'),null);a.dom.window.close();
});

test('Некорректная дата не создаёт назначение источника',()=>{
 const a=app();curriculumStudent(a);a.tab('knowledge');a.value('[name="target"]','group:SCM-01');a.value('[name="due"]','');a.submit('#knowledge-assign');assert.equal(a.state().curriculum.allocations.length,0);assert.match(a.$('#toast').textContent,/корректную дату/);a.dom.window.close();
});

test('Документы: поиск, локальный черновик, проверка подготовки и удаление без выдачи',()=>{
 const a=app();a.role('learner');a.tab('documents');a.click('[data-document-folder=all]');assert.equal(a.w.document.querySelectorAll('[data-document-draft]').length,54);assert.match(a.$('#main').textContent,/проект/);
 a.value('[name="query"]','переподготовке');a.submit('#document-search');assert.equal(a.w.document.querySelectorAll('[data-document-draft]').length,2);a.click('[data-document-draft="retraining"]');assert.equal(a.state().documentDrafts[0].status,'draft');assert.equal(a.$('[data-document-review]'),null);
 const b=app(a.state());b.role('admin');b.tab('documents');b.click('[data-document-review]');assert.equal(b.state().documentDrafts[0].status,'reviewed');assert.ok(!b.$('[data-document-issue]'));b.click('[data-document-remove]');assert.equal(b.state().documentDrafts.length,0);b.dom.window.close();a.dom.window.close();
});

test('Документы: заполнение, сохранение, повторное открытие и несохранённый предпросмотр',()=>{
 const a=app();a.role('learner');a.tab('documents');a.click('[data-document-folder=all]');a.click('[data-document-draft="contract"]');assert.ok(a.$('#document-editor'));
 a.value('[name="title"]','Проект договора обучения');a.value('[name="organization"]','Учебная организация');a.value('[name="recipient"]','Участник Первый');a.value('[name="date"]','2026-11-19');a.value('[name="field_0"]','Стороны проекта');a.value('[name="body"]','Первая строка\nВторая строка');a.submit('#document-editor');
 let r=a.state().documentDrafts[0];assert.equal(r.content.recipient,'Участник Первый');assert.equal(r.content.values[0],'Стороны проекта');assert.equal(r.revision,2);
 a.click('[data-document-back]');a.click('[data-document-edit]');assert.equal(a.$('[name="body"]').value,'Первая строка\nВторая строка');a.value('[name="body"]','Предпросмотр без сохранения');a.click('[data-document-preview]');assert.match(a.$('#document-print-frame').getAttribute('srcdoc'),/Предпросмотр без сохранения/);assert.equal(a.state().documentDrafts[0].content.body,'Первая строка\nВторая строка');
 a.w.confirm=()=>false;a.click('[data-document-back]');assert.ok(a.$('#document-editor'));a.w.confirm=()=>true;a.click('[data-document-back]');a.click('[data-document-edit]');assert.equal(a.$('[name="body"]').value,'Первая строка\nВторая строка');a.dom.window.close();
});
test('Документы: изменение проверенного проекта снимает отметку, старые записи открываются',()=>{
 const a=app();a.role('learner');a.tab('documents');a.click('[data-document-folder=all]');a.click('[data-document-draft="study-certificate"]');const stored=a.state();stored.documentDrafts[0].status='reviewed';stored.documentDrafts[0].reviewedAt='2026-11-19';delete stored.documentDrafts[0].content;delete stored.documentDrafts[0].revision;
 const b=app(stored);b.role('admin');b.tab('documents');b.click('[data-document-edit]');assert.match(b.$('#main').textContent,/снимет отметку/);b.value('[name="body"]','Изменённое содержание справки');b.submit('#document-editor');const r=b.state().documentDrafts[0];assert.equal(r.status,'draft');assert.equal(r.reviewedAt,undefined);assert.equal(r.revision,2);assert.equal(r.content.body,'Изменённое содержание справки');b.dom.window.close();a.dom.window.close();
});

test('Студенческий билет: ID-бейдж с QR и отдельным пунктом меню',()=>{
 const a=app();try{a.role('admin');a.tab('student-card');assert.ok(a.$('.scm-id'));assert.ok(a.$('.scm-id-code svg'));assert.ok(a.$('#student-card-form'));assert.ok(a.$('[data-student-card-action="issue"]'));assert.ok(a.$('[data-student-card-action="print"]'));
 a.role('learner');assert.ok(a.$('.student-card-corner'));assert.ok(a.$('.sidebar [data-tab="student-card"]'));
 }finally{a.dom.window.close();}
});

test('Ручное внесение доступно во всех шести кабинетах',()=>{
 const a=app();try{for(const role of ['admin','admissions','learner','teacher','applicant','employer']){a.role(role);assert.ok(a.$('.sidebar [data-tab="manual-records"]'));a.tab('manual-records');assert.ok(a.$('#manual-record-form'));a.value('#manual-record-form [name=title]','Запись '+role);a.value('#manual-record-form [name=person]','Ответственный Первый');a.submit('#manual-record-form');assert.ok(a.state().manualRecords.some(r=>r.title==='Запись '+role));}}finally{a.dom.window.close();}
});
test('Ручной журнал: комбинированные фильтры, редактирование, восстановление и удаление',()=>{
 const a=app();try{a.role('admin');a.tab('manual-records');
 for(const [title,type,status,date] of [['Склад','task','active','2026-11-01'],['Поставка','note','done','2026-11-15']]){a.value('#manual-record-form [name=title]',title);a.value('#manual-record-form [name=type]',type);a.value('#manual-record-form [name=status]',status);a.value('#manual-record-form [name=date]',date);a.submit('#manual-record-form');}
 a.value('#manual-record-search [name=q]','склад');a.value('#manual-record-search [name=type]','task');a.value('#manual-record-search [name=status]','active');a.value('#manual-record-search [name=from]','2026-11-01');a.value('#manual-record-search [name=until]','2026-11-10');a.submit('#manual-record-search');assert.equal(a.w.document.querySelectorAll('[data-manual-edit]').length,1);
 a.click('[data-manual-edit]');a.value('#manual-record-form [name=title]','Склад обновлён');a.submit('#manual-record-form');assert.equal(a.state().manualRecords[0].title,'Склад обновлён');a.click('[data-manual-reset]');assert.equal(a.w.document.querySelectorAll('[data-manual-edit]').length,2);
 const b=app(a.state());try{b.role('admin');b.tab('manual-records');assert.equal(b.w.document.querySelectorAll('[data-manual-edit]').length,2);b.click('[data-manual-delete]');assert.equal(b.state().manualRecords.length,1);}finally{b.dom.window.close();}
 }finally{a.dom.window.close();}
});
test('Поиск документов ищет во всех папках без удаления данных',()=>{
 const a=app();try{a.role('admin');a.tab('documents');a.click('[data-document-folder=all]');a.value('#document-search [name=query]','несуществующий-текст-123');a.submit('#document-search');assert.equal(a.w.document.querySelectorAll('[data-document-draft]').length,0);a.value('#document-search [name=query]','');a.submit('#document-search');assert.equal(a.w.document.querySelectorAll('[data-document-draft]').length,54);}finally{a.dom.window.close();}
});

test('Ручной журнал экранирует текст и отклоняет обратный диапазон дат',()=>{
 const a=app();try{a.role('teacher');a.tab('manual-records');a.value('#manual-record-form [name=title]','<img src=x onerror=alert(1)>');a.value('#manual-record-form [name=body]','<script>alert(1)</script>');a.submit('#manual-record-form');assert.equal(a.$('.manual-record-list img'),null);assert.equal(a.$('.manual-record-list script'),null);a.value('#manual-record-search [name=from]','2026-12-31');a.value('#manual-record-search [name=until]','2026-01-01');a.submit('#manual-record-search');assert.match(a.$('#toast').textContent,/Дата/);assert.equal(a.state().manualRecords.length,1);}finally{a.dom.window.close();}
});
