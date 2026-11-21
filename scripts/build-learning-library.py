"""Build transparent curriculum coverage and original introductory learning material."""
from pathlib import Path
import json, html, csv, io
R=Path(__file__).resolve().parents[1]
D=R/'docs/learning-library'; O=R/'academy/guides/learning-library'
D.mkdir(exist_ok=True,parents=True); O.mkdir(exist_ok=True,parents=True)
author='Герасимов Дмитрий Сергеевич'; date='2026-11-19'
packs=json.loads((D/'course-packs.json').read_text())
for extra in sorted(D.glob('*-packs.json')):
 if extra.name != 'course-packs.json':
  packs['courses'].extend(json.loads(extra.read_text())['courses'])
packs['version']='0.39.0'
assert len({c['id'] for c in packs['courses']})==len(packs['courses']), 'Duplicate course IDs'
for lab_file in (D/'labs').iterdir():
 if lab_file.is_file(): (O/lab_file.name).write_bytes(lab_file.read_bytes())
from learning_excel_lab import build_excel_lab
build_excel_lab(D,O)
pack_by_id={c['id']:c for c in packs['courses']}
directions=json.loads((R/'docs/education-demand-2021-2025/directions.json').read_text())
# These are proposed course titles, not approved regulated programs or filled courses.
catalog=[]
for d in directions:
 courses=[]
 for i,title in enumerate(d['programs'].split(';'),1):
  title=title.strip(); cid=f"{d['id']}-C{i:02}"
  courses.append({'id':cid,'title':title,'status':'planned','audience':d['buyers'],
   'sections':{k:'missing' for k in ['passport','syllabus','legal_basis','lessons','practice','assessment','answer_key','teacher_notes','sources','review']},
   'note':'Рабочее название. Содержание, трудоемкость и требования допуска не утверждены.'})
 catalog.append({'id':d['id'],'title':d['direction'],'courses':courses})
# Link introductory packs without pretending the whole role is covered.
for direction in catalog:
 for entry in direction['courses']:
  if entry['id'] in pack_by_id:
   pack=pack_by_id[entry['id']]
   entry['status']='introductory_written_unreviewed'
   entry['url']=pack['slug']+'.html'
   entry['sections']={k:('pending' if k=='review' else 'draft') for k in entry['sections']}
   entry['note']='Написан вводный комплект; полный курс по роли не закрыт. Экспертиза и апробация не пройдены.'
from learning_library_packs import validate_packs
validate_packs(packs,{c['id'] for d in catalog for c in d['courses']})
# One actual course, distinct from the planned placeholders.
course={
 'id':'FOUNDATION-DATA-01','title':'Проверка качества таблицы и расчет показателей',
 'author':author,'date':date,'version':'0.1.0','status':'written_unreviewed',
 'audience':'Начинающие специалисты учета, HR, продаж, закупок и логистики.',
 'prerequisites':'Умение открывать CSV/электронную таблицу и выполнять простые арифметические действия.',
 'scope':'Авторский вводный учебный материал. Не утвержденная программа ДПО и не основание выдачи квалификационного документа.',
 'duration':'Рекомендуемый самостоятельный маршрут: 3 занятия по 45 минут и 45 минут практики. Фактическое время зависит от подготовки; не нормативная трудоемкость.',
 'equipment':'Электронная таблица или калькулятор; обезличенный учебный CSV. Доступ в интернет не обязателен после скачивания материалов.',
 'outcomes':['Различать строку операции и уникальный объект учета','Находить дубли, пропуски и неоднозначные единицы','Рассчитывать взвешенную цену и долю дефектов','Документировать исправления и ограничения вывода'],
 'rights':'Оригинальное изложение подготовлено для проекта с указанием автора. Лицензия на повторное распространение не установлена; применение лицензии должен утвердить правообладатель. Права внешних источников сохраняются.',
 'regulations':'Курс использует вымышленные записи без персональных данных. Не содержит нормативных требований к отраслевому учету. При работе с реальными данными требуется отдельно проверить полномочия доступа и применимые требования защиты данных.',
 'lessons':[
 {'title':'1. Что именно считает таблица','text':[
 'До вычислений задайте единицу наблюдения: одна строка — заказ, позиция заказа, отгрузка или возврат? Число строк равно числу заказов только тогда, когда каждому заказу соответствует ровно одна строка. Если один заказ содержит несколько позиций, нужен отдельный идентификатор позиции.',
 'Словарь данных описывает каждое поле: смысл, тип, единицу, допустимые значения и правила пустых ячеек. Для суммы нужны валюта и условие включения налогов. Для даты — формат и смысл события. Для количества — штуки, килограммы или упаковки. Складывать килограммы и штуки без перевода нельзя.',
 'Ключ записи — поле или набор полей, по которому различают операции. Совпадение суммы и даты не доказывает дубль: это могут быть разные операции. В учебном файле ключом служит record_id, поэтому полностью повторенная запись A003 отмечена как кандидат на техническое дублирование.',
 'Сохраните исходный файл неизменным. Исправления делайте в копии, а каждое действие внесите в журнал: номер записи, проблема, решение, основание, исполнитель и дата. Не заменяйте неизвестное значение нулем: ноль является числом с собственным смыслом.'
 ],'exercise':'Запишите ключ и единицы для record_id, units, unit_price_rub, defective_units. Объясните, почему два разных record_id с одинаковой ценой не являются дублями.'},
 {'title':'2. Очистка без потери смысла','text':[
 'Начните с проверок структуры: одинаковое число полей в строках, обязательные заголовки, читаемая кодировка. Затем проверьте уникальность ключа, числовые типы и диапазоны. В учебном случае units — положительное целое, unit_price_rub — неотрицательное число, defective_units — целое от нуля до units.',
 'Учебная A003 повторена полностью: при заданном ключе и подтверждении технического повтора оставляем одну запись. A004 не содержит цены: количество можно учитывать в показателях физического объема, но выручку всей совокупности определить нельзя. A005 содержит отрицательный объем: без отдельного типа операции невозможно решить, ошибка это или возврат.',
 'Для задачи сравнения цен используем только A001–A003 после удаления повтора; A004 и A005 помещаем в карантин. Это правило относится к конкретной задаче, а не означает, что эти строки можно удалить из учета. Отчет должен показывать и исключенные записи.',
 'Порядок действий: сохранить исходник → зафиксировать правила → найти аномалии → запросить уточнения → выделить допустимую выборку → посчитать показатели → раскрыть исключения. Автоматическая очистка без журнала может скрыть системную проблему источника.'
 ],'exercise':'Для каждой из шести строк определите статус: включить, технический повтор или уточнить. Для A004 предложите показатель, который можно вычислять без знания цены.'},
 {'title':'3. Показатели, знаменатели и вывод','text':[
 'Стоимость строки равна количеству, умноженному на цену единицы. Для A001: 10 × 100 = 1000 ₽; A002: 20 × 130 = 2600 ₽; A003: 5 × 80 = 400 ₽. Итого на допустимой выборке 35 единиц и 4000 ₽. Здесь нет скидок, доставки и налоговых корректировок — они не заданы.',
 'Средняя цена единицы — общая стоимость, деленная на общее количество: 4000 / 35 ≈ 114,29 ₽. Простое среднее трех цен дает (100 + 130 + 80) / 3 ≈ 103,33 ₽. Оно отвечает другому вопросу: какова средняя цена строки при одинаковом весе строк. Эти показатели нельзя подменять друг другом.',
 'Дефектных единиц в выборке 1 + 0 + 1 = 2. Доля дефектных единиц: 2 / 35 × 100 ≈ 5,71%. Доля строк с хотя бы одним дефектом: 2 / 3 × 100 ≈ 66,67%. У них разные знаменатели и разный смысл. Не называйте второй показатель долей брака в штуках.',
 'Округляйте представление результата, а не промежуточные вычисления. В заключении укажите выборку, исключения, период, единицу и ограничения. По трем вымышленным операциям нельзя сделать вывод о качестве поставщика за год или о причинной связи цены и дефектов.'
 ],'exercise':'Рассчитайте взвешенную цену, обе доли и сформулируйте вывод из двух предложений, явно ограниченный допустимой выборкой.'}
 ],
 'assessment':[
 {'id':'Q01','question':'Сколько исходных строк данных, сколько различных record_id и сколько строк допустимо для расчета стоимости по заданным правилам?','answer':'6 исходных строк, 5 разных идентификаторов, 3 допустимые строки A001–A003.','rationale':'A003 повторен; A004 без цены, A005 с отрицательным объемом без типа операции.','points':2},
 {'id':'Q02','question':'Почему нельзя заменить пропущенную цену A004 нулем?','answer':'Пропуск означает неизвестную цену, а ноль — подтвержденную нулевую цену. Подмена исказит стоимость и среднюю цену.','rationale':'Различие отсутствующих данных и числового значения.','points':2},
 {'id':'Q03','question':'Чему равна стоимость допустимой выборки?','answer':'4000 ₽: 1000 + 2600 + 400.','rationale':'Стоимость = сумма произведений количества и цены.','points':2},
 {'id':'Q04','question':'Какова средняя цена одной единицы?','answer':'4000 / 35 = 114,285714… ₽; отображение 114,29 ₽.','rationale':'Вес цены — количество, а не число строк. Допуск округления 0,01 ₽.','points':2},
 {'id':'Q05','question':'Рассчитайте долю дефектных единиц и долю строк с дефектом.','answer':'2 / 35 ≈ 5,71%; 2 / 3 ≈ 66,67%.','rationale':'В первом случае знаменатель — единицы, во втором — строки. Допуск 0,01 процентного пункта.','points':2},
 {'id':'Q06','question':'Можно ли утверждать, что годовая доля дефектов поставщика равна 5,71%?','answer':'Нет. Нет годовой полной или репрезентативной выборки и данных о конкретном поставщике.','rationale':'Вывод не должен выходить за границы данных.','points':2},
 {'id':'Q07','question':'Что требуется для интерпретации отрицательного количества A005?','answer':'Уточнить тип операции и правило знаков, проверить первичный документ. Не удалять и не превращать количество в положительное автоматически.','rationale':'Это может быть возврат или ошибка; данных недостаточно.','points':2},
 {'id':'Q08','question':'Два заказа имеют одинаковую сумму и дату, но разные корректные ключи. Это дубли?','answer':'Само по себе совпадение суммы и даты недостаточно; нужно проверить идентичность операции по установленному ключу и первичным данным.','rationale':'Дедупликация должна опираться на смысл записи.','points':2}
 ],
 'practice':{'task':'Создайте словарь четырех полей, журнал проблем, очищенную копию A001–A003 и отчет с количеством, стоимостью, взвешенной ценой, двумя долями и ограничениями. Исходник не изменяйте.',
 'rubric':[{'criterion':'Словарь полей и ключ','points':2},{'criterion':'Журнал: дубль, пропуск и отрицательное количество с обоснованиями','points':3},{'criterion':'Верные 35 единиц, 4000 ₽ и 114,29 ₽','points':3},{'criterion':'Обе доли с правильными знаменателями','points':2},{'criterion':'Воспроизводимый расчет и ограничения выводов','points':2}],
 'pass':'Учебный ориентир: 21 из 28 баллов за вопросы и практику, без подмены пропуска нулем, скрытого удаления аномалий или вывода о всей популяции. Не квалификационная аттестация.'},
 'teacher_notes':['До занятия проверьте, что CSV открывается с разделителем-запятой; предложите бумажную таблицу при отсутствии ПО.','Попросите сначала назвать единицу наблюдения и только затем считать.','Не наказывайте за иной корректный способ вычисления; оценивайте знаменатель, доказательства и воспроизводимость.','При ошибке среднего предложите сравнить покупку одной и ста единиц по разным ценам.','Практику проверяет преподаватель по рубрике. Факт чтения не означает освоения.'],
 'sources':[{'title':'Python: csv — CSV File Reading and Writing','url':'https://docs.python.org/3/library/csv.html','author':'Python Software Foundation / участники документации Python','use':'Дополнительное чтение о CSV; внешняя ссылка, текст не скопирован','verification':'Проверен вводный раздел 19.11.2026: документация Python 3.15.2; не основание числовых ответов','license':'Условия документации нужно проверить в конкретной версии перед заимствованием'}],
 'answer_provenance':'Ответы получены арифметически из вымышленного набора. Открыты для самопроверки; не использовать как закрытый экзамен.',
 'review':{'subject_expert':'pending','legal':'pending','pilot':'pending','next_review':'Перед использованием в организованном обучении и после любого изменения набора данных или правил'}
}
# Specific self-check solutions for all three foundational lesson exercises.
foundation_solutions=[
 'record_id — ключ строки/операции, текст; units — количество штук; unit_price_rub — рублей за штуку; defective_units — дефектные штуки от 0 до units. Разные корректные ключи могут иметь одну цену: это не доказательство дубля.',
 'Первые A001/A002/A003 включить; вторую A003 отметить техническим повтором по условию; A004 уточнить цену, A005 уточнить тип операции. Без цены A004 можно анализировать физическое количество 8 штук, если допустимость других полей подтверждена; стоимость всей совокупности неизвестна.',
 'Допустимая выборка: 35 штук, 4000 ₽, средняя 114,29 ₽, дефектных единиц 2/35≈5,71%, строк с дефектом 2/3≈66,67%. Вывод относится только к A001–A003 после удаления повтора; исключения и отсутствие основания для годового вывода раскрыть.'
]
for lesson,solution in zip(course['lessons'],foundation_solutions):lesson['exercise_answer']=solution
(D/'catalog.json').write_text(json.dumps({'author':author,'date':date,'version':packs['version'],'directions':catalog},ensure_ascii=False,indent=2)+'\n')
(D/'foundation-data.json').write_text(json.dumps(course,ensure_ascii=False,indent=2)+'\n')
sample='record_id,units,unit_price_rub,defective_units\nA001,10,100,1\nA002,20,130,0\nA003,5,80,1\nA003,5,80,1\nA004,8,,0\nA005,-2,100,0\n'
(O/'practice.csv').write_text(sample)
(D/'practice.csv').write_text(sample)
esc=html.escape
style='<style>body{font:17px/1.65 system-ui;color:#17283a;background:#f6f8fa;margin:0}header,main,footer{max-width:1050px;margin:auto;padding:24px}a{color:#075c9e}article,section{background:white;padding:24px;margin:20px 0;border:1px solid #d8e0e6;border-radius:12px}h1,h2,h3{line-height:1.25}p,li{overflow-wrap:anywhere}.tag{color:#765000}summary{cursor:pointer;font-weight:600}nav{display:flex;flex-wrap:wrap;gap:16px}a:focus-visible,summary:focus-visible{outline:3px solid #d48806}pre{overflow:auto}</style>'
def page(title,body):return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+' — Академия SCM</title>'+style+'<body><header><nav><a href="/academy/">Академия SCM</a><a href="/academy/guides/">База знаний</a><a href="/academy/guides/learning-library/">Учебная библиотека</a></nav></header><main><h1>'+esc(title)+'</h1>'+body+'</main><footer>Автор собственных материалов: '+author+' · 19.11.2026 · версия библиотеки '+packs['version']+' · версия материала указана в тексте</footer></body></html>'
body='<p class="tag">Написан вводный материал · профильная проверка и апробация не пройдены</p>'
for k,label in [('audience','Аудитория'),('prerequisites','Входные знания'),('scope','Границы'),('duration','Маршрут'),('equipment','Оснащение'),('rights','Условия использования'),('regulations','Нормативная область')]:body+=f'<p><strong>{label}.</strong> {esc(course[k])}</p>'
body+='<h2>Результаты обучения</h2><ul>'+''.join('<li>'+esc(t)+'</li>' for t in course['outcomes'])+'</ul>'
for lesson in course['lessons']:body+='<section><h2>'+esc(lesson['title'])+'</h2>'+''.join('<p>'+esc(t)+'</p>' for t in lesson['text'])+'<h3>Задание</h3><p>'+esc(lesson['exercise'])+'</p><details><summary>Разбор задания</summary><p>'+esc(lesson['exercise_answer'])+'</p></details></section>'
body+='<section><h2>Практическая работа</h2><a href="practice.csv" download>Скачать вымышленный набор CSV</a><pre>'+esc(sample)+'</pre><p>'+esc(course['practice']['task'])+'</p><h3>Критерии</h3><ul>'+''.join(f"<li>{esc(x['criterion'])}: {x['points']} балла</li>" for x in course['practice']['rubric'])+'</ul><p>'+esc(course['practice']['pass'])+'</p></section><h2>Вопросы и открытые ответы для самопроверки</h2><p>'+esc(course['answer_provenance'])+'</p>'
for q in course['assessment']:body+=f"<section><h3>{q['id']}. {esc(q['question'])}</h3><p>До {q['points']} баллов: полный обоснованный ответ — 2, верное направление без обоснования — 1, неверно — 0.</p><details><summary>Ответ и объяснение</summary><p>{esc(q['answer'])}</p><p>{esc(q['rationale'])}</p><p>Основание: учебный набор и уроки 1–3, версия 0.1.0.</p></details></section>"
body+='<h2>Преподавателю</h2><ul>'+''.join('<li>'+esc(x)+'</li>' for x in course['teacher_notes'])+'</ul><h2>Источники и обновление</h2><p>Изложение и вымышленные данные — собственная разработка. Внешние учебники не воспроизводятся. Нормативные акты не цитируются.</p>'
for s in course['sources']:body+='<p><a href="'+s['url']+'">'+esc(s['title'])+'</a> · '+esc(s['author'])+'. '+esc(s['use'])+'. '+esc(s['verification'])+'. '+esc(s['license'])+'. Дата включения: '+date+'.</p>'
body+='<p>Проверяющий специалист: не назначен. Апробация: не выполнена. Следующая проверка: '+esc(course['review']['next_review'])+'.</p>'
(O/'foundation-data.html').write_text(page(course['title'],body))
stats={'directions':len(catalog),
 'directions_with_intro':sum(any(c['id'] in pack_by_id for c in d['courses']) for d in catalog),
 'directions_without_intro':sum(not any(c['id'] in pack_by_id for c in d['courses']) for d in catalog),'catalog_courses':sum(len(d['courses']) for d in catalog),
 'introductory_packs':len(packs['courses']), 'materials':len(packs['courses'])+1,
 'lessons':sum(len(c['lessons']) for c in packs['courses'])+len(course['lessons']),
 'open_answers':sum(len(c['questions']) for c in packs['courses'])+len(course['assessment']),
 'lesson_solutions':sum(sum(bool(l.get('exercise_answer')) for l in c['lessons']) for c in packs['courses'])+sum(bool(l.get('exercise_answer')) for l in course['lessons']),
 'planned':sum(c['status']=='planned' for d in catalog for c in d['courses']),
 'practice_solutions':len(packs['courses'])+1,
 'expert_approved':0, 'regulated_ready':0}
for folder in (D,O): (folder/'progress.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')
coverage_text=(f"{stats['directions']} направления; {stats['catalog_courses']} предварительных курсов. "
 f"Направлений хотя бы с одним вводным комплектом: {stats['directions_with_intro']} из {stats['directions']}; это не полные программы направлений. "
 f"Количество курсов с написанными вводными комплектами: {stats['introductory_packs']}; {stats['planned']} курсов пока запланированы. "
 f"Отдельно написан межотраслевой материал. Общее количество материалов: {stats['materials']}; {stats['lessons']} уроков, "
 f"{stats['open_answers']} ответов на контрольные вопросы и {stats['lesson_solutions']} разборов заданий уроков. Полное покрытие профессий не достигнуто. "
 "Одобрено специалистом: 0. Готовых регулируемых программ: 0.")
pack_links=''.join('<li><a href="'+c['slug']+'.html">'+esc(c['title'])+'</a>: '+str(len(c['lessons']))+' уроков, практика, '+str(len(c['questions']))+' ответов, рабочий шаблон.</li>' for c in packs['courses'])
index='<p>Все 34 направления включены в реестр. Это начало разработки, а не готовая полная база. Автор собственных материалов: '+author+'.</p><section><h2>Уже написано</h2><ul>'+pack_links+'</ul><p><a href="foundation-data.html">Проверка качества таблицы и расчет показателей</a>: 3 урока, набор данных, практика, 8 вопросов с обоснованными ответами, критерии и заметки преподавателя. Требуется профильная проверка.</p></section><section><h2>Точное покрытие</h2><p>'+coverage_text+'</p><p><a href="answer-bank.html">Поиск по ответам и разборам</a> · <a href="review-ledger.html">Проверка и незакрытые этапы</a> · <a href="review-checklist.md" download>Чек-лист эксперта</a> · <a href="learning-library.zip" download>Скачать библиотеку ZIP</a> · <a href="catalog.json" download>Реестр курсов и статусов JSON</a> · <a href="coverage.csv" download>Матрица покрытия CSV</a> · <a href="learning-sources.csv" download>Источники предметных комплектов CSV</a></p></section>'
for d in catalog:
 name=d['id'].lower()+'.html'
 index+='<article><h2><a href="'+name+'">'+esc(d['title'])+'</a></h2><p>'+str(len(d['courses']))+' предварительных курсов · вводных комплектов: '+str(sum(c['id'] in pack_by_id for c in d['courses']))+'</p></article>'
 b='<p>Рабочая декомпозиция. Перечень не является исчерпывающим перечнем профессий или утвержденной образовательной программой.</p>'
 for c in d['courses']:
  b+='<section><h2>'+esc(c['id']+' · '+c['title'])+'</h2><p>Аудитория: '+esc(c['audience'])+'</p>'
  if c['id'] in pack_by_id:b+='<p><a href="'+c['url']+'">Читать вводный комплект: уроки, практика и ответы</a></p><p>'+esc(c['note'])+'</p>'
  else:b+='<p>Статус: запланировано. Паспорт, программа, уроки, практика, банк заданий и ответов, источники и проверка специалистом — не выполнены.</p>'
  b+='</section>'
 b+='<h2>Условие готовности</h2><p>Для каждого результата обучения: объяснение → пример → самостоятельная практика → проверка → обоснованный ответ или рубрика. Источники проверяются по дате, редакции и правам использования. Требования к практике, преподавателям и допуску определяются отдельно для каждой программы. Пробелы нельзя закрывать копированием одного общего текста.</p>'
 (O/name).write_text(page(d['title'],b))
index+='<section><h2>Исходные 65 незаполненных курсов</h2><p><a href="remaining-65-plan.html">Поименный план разработки, практика и условия завершения</a>. План не является готовыми курсами; вводные комплекты и полное завершение учитываются раздельно.</p></section>'
(O/'index.html').write_text(page('Учебная база по 34 направлениям',index))
(O/'catalog.json').write_bytes((D/'catalog.json').read_bytes())
buf=io.StringIO();w=csv.writer(buf,lineterminator='\n');w.writerow(['direction_id','direction','course_id','course','status',*catalog[0]['courses'][0]['sections']])
for d in catalog:
 for c in d['courses']:w.writerow([d['id'],d['title'],c['id'],c['title'],c['status'],*c['sections'].values()])
for folder in [D,O]:(folder/'coverage.csv').write_text('\ufeff'+buf.getvalue())
(D/'README.md').write_text('# Учебная база\n\nАвтор собственных материалов: '+author+'. Версия библиотеки '+packs['version']+' от '+date+'.\n\n'+coverage_text+'\n\nИсходники: course-packs.json, digital-packs.json, business-packs.json, operations-packs.json, sector-packs.json, technical-packs.json, professional-packs.json, organization-packs.json, safety-packs.json, spreadsheet-packs.json, linux-packs.json, foundation-data.json; лаборатории — labs/. Матрица — coverage.csv; точные счетчики — progress.json. Для каждого предметного комплекта доступен полный текст Markdown с открытыми ответами. Общий реестр дополнительных источников — learning-sources.csv (объем проверки указан отдельно). review-ledger.json сохраняет редакционные этапы и историю изменений; все экспертизы пока pending. answer-bank.html/json/csv — сводная публичная самопроверка с локальным поиском без отправки данных; не секретный экзамен.\n\nСборка: python3 scripts/build-learning-library.py\nПроверки: python3 scripts/test-learning-library.py и python3 docs/learning-library/labs/run-digital-labs.py; python3 docs/learning-library/labs/run-organization-labs.py\n\nПубликуемые ответы предназначены для самопроверки, не секретного экзамена. Закрытая аттестация требует серверного хранения и отдельного набора заданий; не реализована. Все материалы требуют предметной экспертизы и апробации. Внешние источники сохраняют авторство и ограничения. В цифровом блоке проверены только указанные фрагменты страниц, не полные документы.\n')
print(coverage_text)

from learning_library_packs import render_packs, render_review_ledger
render_review_ledger(json.loads((D/'review-ledger.json').read_text()), {'FOUNDATION-DATA-01'}|set(pack_by_id), O, page)
(O/'review-checklist.md').write_bytes((D/'review-checklist.md').read_bytes())
from learning_answer_bank import build_answer_bank
build_answer_bank(packs,course,O,page)
from learning_completion_plan import render_completion_plan
render_completion_plan(json.loads((D/'remaining-65-plan.json').read_text()), catalog, O, page)
render_packs(packs,O,page)
print("All course packs rendered; no expert approvals.")
