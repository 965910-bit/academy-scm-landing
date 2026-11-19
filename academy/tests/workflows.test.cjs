const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");
const key = "scm-academy-demo-v1";
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
    click("#account-button");
    $("#login-form select").value = r;
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
test("Демо-документы: добавление и удаление", () => {
  const a = app();
  a.role("applicant");
  a.tab("documents");
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
test("Ролевые карточки и подвал открывают правильный демо-вход", () => {
  const a = app();
  for (const role of ["applicant", "teacher", "admin"]) {
    a.click(`.role-card [data-role-entry="${role}"]`);
    assert.equal(a.$("#login-dialog").open, true);
    assert.equal(a.$("#login-form select").value, role);
    a.$("#login-dialog").close();
  }
  a.click('footer [data-role-entry="teacher"]');
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
