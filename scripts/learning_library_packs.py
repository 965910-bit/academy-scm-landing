"""Render original course packs from versioned source JSON; no external fetching."""
import html
import csv
import io
import json
import zipfile

def render_packs(data, output, page):
    e = html.escape
    for course in data['courses']:
        cid = course['id']
        body = '<p>Вводный комплект написан. Профильная экспертиза, правовая проверка и апробация не пройдены. Версия ' + e(data['version']) + '.</p>'
        body += '<p><a href="' + course['id'] + '.json" download>Скачать исходный комплект JSON</a> · <a href="' + course['template']['filename'] + '" download>Рабочий шаблон CSV</a></p>'
        if course.get('downloads'):
            body += '<section><h2>Лабораторные файлы</h2><p>Скачайте все три файла в одну папку. Прочитайте исходники и запустите python3 run-digital-labs.py. Работа локальная, без сети и производственных данных.</p><ul>'
            for name, label in [('sql-lab.json','Вымышленная схема SQL, запросы и эталоны'),('python-lab.py','Открытая реализация Python'),('run-digital-labs.py','Проверка обеих лабораторий')]:
                body += '<li><a href="' + name + '" download>' + label + '</a></li>'
            body += '</ul></section>'
        body += '<nav aria-label="Разделы курса"><a href="#passport">Паспорт</a><a href="#lessons">Уроки</a><a href="#practice">Практика</a><a href="#answers">Ответы</a><a href="#sources">Источники</a></nav>'
        body += '<section id="passport"><h2>Паспорт и границы</h2>'
        for key, title in [('audience','Аудитория'),('prerequisites','Входные знания'),('duration','Маршрут'),('equipment','Оснащение'),('scope','Что не закрыто'),('legal_basis','Нормативная область')]:
            body += '<p><strong>' + title + '.</strong> ' + e(course[key]) + '</p>'
        body += '<p><strong>Автор.</strong> ' + e(data['author']) + '.</p><p>' + e(data['rights']) + '</p></section>'
        body += '<section><h2>Результаты обучения и программа</h2><ol>'
        for result in course['outcomes']:
            body += '<li>' + e(result['id'] + ': ' + result['text']) + '. Урок ' + str(result['lesson']) + '; проверка: ' + e(', '.join(result['checks'])) + '.</li>'
        body += '</ol><p>Для каждого урока: чтение, обсуждение примера, самостоятельное задание. Затем единая практика и самопроверка.</p></section><div id="lessons">'
        for n, lesson in enumerate(course['lessons'], 1):
            body += '<section id="lesson-' + str(n) + '"><h2>' + str(n) + '. ' + e(lesson['title']) + '</h2>'
            body += ''.join('<p>' + e(p) + '</p>' for p in lesson['paragraphs'])
            body += '<h3>Самостоятельное задание</h3><p>' + e(lesson['exercise']) + '</p><p>Разбор: вопросы ниже и эталон практической работы; возможны другие обоснованные формулировки.</p></section>'
        body += '</div><section><h2>Словарь</h2><dl>'
        body += ''.join('<dt><strong>' + e(k) + '</strong></dt><dd>' + e(v) + '</dd>' for k, v in course['glossary'].items())
        p = course['practice']
        body += '</dl></section><section id="practice"><h2>Практическая работа</h2><p>' + e(p['scenario']) + '</p><h3>Что представить</h3><p>' + e(p['deliverables']) + '</p><h3>Критерии (до 12 баллов)</h3><ul>'
        body += ''.join('<li>' + e(x['id'] + ': ' + x['text']) + ' — до ' + str(x['points']) + ' баллов.</li>' for x in p['criteria'])
        body += '</ul><details><summary>Эталонный разбор</summary><p>' + e(p['model']) + '</p></details><h3>Критические ошибки</h3><ul>' + ''.join('<li>' + e(x) + '</li>' for x in p['critical_errors']) + '</ul></section>'
        body += '<section id="answers"><h2>Открытая база ответов для самопроверки</h2><p>Это не закрытый экзамен. Каждый ответ: 2 балла за верное решение с обоснованием; 1 — частично верное без существенного противоречия; 0 — неверное. Расчетный ответ допустим в эквивалентной форме, проценты округляются до 0,01 процентного пункта.</p>'
        for q in course['questions']:
            body += '<h3>' + e(q['id'] + '. ' + q['question']) + '</h3><details><summary>Ответ, основание и объяснение</summary><p>' + e(q['answer']) + '</p><p>' + e(q['reason']) + '</p><p>Основание: собственный учебный кейс и <a href="#lesson-' + str(q['lesson']) + '">урок ' + str(q['lesson']) + '</a>, версия ' + e(data['version']) + '.</p></details>'
        body += '<p>Максимум: 24 балла (12 вопросы + 12 практика). Учебный ориентир: от 18 баллов без критических ошибок. Это внутреннее правило самопроверки, не квалификационная аттестация. Исправления после обратной связи фиксируются отдельно.</p></section>'
        body += '<section><h2>Преподавателю</h2><ul>' + ''.join('<li>' + e(x) + '</li>' for x in course['teacher_notes']) + '</ul><p>Одна допустимая структура занятия: 5 минут — входной вопрос; 15 — объяснение; 10 — разбор примера; 10 — самостоятельное задание; 5 — обратная связь. При затруднениях повторить пример на меньшем объеме; не считать чтение доказательством освоения.</p></section>'
        body += '<section id="sources"><h2>Реестр источников</h2><p>Арифметика, примеры и ответы получены из вымышленных условий данного комплекта. Внешние ссылки — дополнительное чтение с указанным объемом проверки, не подтверждение всего содержания.</p>'
        for source in course['sources']:
            body += '<article><h3><a href="' + e(source['url'], quote=True) + '">' + e(source['id'] + ': ' + source['title']) + '</a></h3>'
            for key, title in [('author','Автор'),('published','Дата публикации'),('version','Версия'),('checked','Дата обращения'),('access','Что прочитано'),('license','Условия использования'),('use','Назначение')]:
                body += '<p><strong>' + title + ':</strong> ' + e(source[key]) + '</p>'
            body += '</article>'
        body += '</section><section><h2>Обновление и оставшиеся работы</h2><p>Дата выпуска: ' + e(data['date']) + '. Следующая проверка — до применения в организованном обучении, а также после изменения условий кейса, законодательства или процесса. Проверяющий специалист пока не назначен; апробация не выполнена. Для полноценного курса по профессии нужны дополнительные модули, предметные источники и необходимые практические компоненты.</p></section>'
        (output/(course['slug']+'.html')).write_text(page(course['title'], body))
        (output/(cid+'.json')).write_text(json.dumps({**{k: v for k,v in data.items() if k!='courses'}, 'course': course}, ensure_ascii=False, indent=2)+'\n')
        s=io.StringIO(); writer=csv.writer(s,lineterminator='\n'); writer.writerow(course['template']['columns']);writer.writerow(course['template']['example'])
        (output/course['template']['filename']).write_text('\ufeff'+s.getvalue())
    # Portable package of the generated library. Exam secrecy is explicitly not promised.
    with zipfile.ZipFile(output/'learning-library.zip','w',zipfile.ZIP_DEFLATED) as z:
        for path in sorted(output.iterdir()):
            if path.is_file() and path.suffix in {'.html','.json','.csv','.py'}:z.write(path,path.name)
