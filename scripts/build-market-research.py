"""Build the five-document research dossier using only the Python standard library."""
import html,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'docs/platform-research-2026';OUT=ROOT/'academy/guides/market-research'
def inline(s):
 s=html.escape(s)
 s=re.sub(r'\[([^\]]+)\]\((https?://[^ )]+)\)',r'<a href="\2" target="_blank" rel="noopener">\1 ↗</a>',s)
 s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
 return re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
def render(text):
 lines=text.splitlines();out=[];i=0
 while i<len(lines):
  l=lines[i].strip()
  if not l:i+=1;continue
  if l.startswith('|'):
   rows=[]
   while i<len(lines) and lines[i].strip().startswith('|'):
    cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
    if not all(re.fullmatch(r'[:\- ]+',c) for c in cells):rows.append(cells)
    i+=1
   out.append('<div class="research-table" tabindex="0" role="region" aria-label="Сравнительная таблица"><table><thead><tr>'+''.join('<th scope="col">'+inline(c)+'</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in rows[1:])+'</tbody></table></div>');continue
  if l.startswith('#'):
   n=min(len(l)-len(l.lstrip('#'))+1,6);out.append(f'<h{n}>'+inline(l.lstrip('# '))+f'</h{n}>')
  elif l.startswith('- '):out.append('<p class="research-bullet">• '+inline(l[2:])+'</p>')
  else:out.append('<p>'+inline(l)+'</p>')
  i+=1
 return '\n'.join(out)
OUT.mkdir(parents=True,exist_ok=True);(OUT/'files').mkdir(exist_ok=True)
sections=[];links=[]
for n,p in enumerate(sorted(SRC.glob('*.md')),1):
 text=p.read_text();title=text.splitlines()[0].lstrip('# ');filename=p.stem+'.txt';(OUT/'files'/filename).write_text(text)
 links.append(f'<li><a href="#part-{n}">{html.escape(title)}</a> · <a href="files/{filename}" download>Скачать документ TXT</a></li>')
 sections.append(f'<section id="part-{n}" class="research-part">'+render(text)+'</section>')
page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Конкуренты и платформы: что добавить Академии — исследование</title><meta name="description" content="16 организаций и продуктов, 5 аналитических документов, 14 предложений для развития Академии: функции, разрывы, стоимость, риски и план проверки."><link rel="canonical" href="https://scm-news.online/academy/guides/market-research/"><link rel="stylesheet" href="../guides.css"><script src="../../resource-entry.js"></script></head><body><a class="skip" href="#content">К содержанию</a><header><a class="brand" href="../../">АКАДЕМИЯ SCM ↗</a><nav><a href="../">База знаний</a><a href="../../documents/">Документы</a></nav></header><main id="content"><p class="eyebrow">СТРАТЕГИЯ ПРОДУКТА · 19.11.2026</p><h1>Конкуренты, платформы и развитие Академии</h1><p class="lead">16 организаций и продуктов · 5 документов · 14 предложений. Основной приоритет: диагностика → маршрут → практика → проверка → доказательство навыка.</p><aside>Исследование открытых предложений, не независимый тест закрытых кабинетов. Сметы — гипотезы. Новые функции здесь предложены, а не объявлены работающими. Тарифы и покупки не согласованы.</aside><nav aria-label="Документы исследования"><ol>'''+''.join(links)+'''</ol></nav>'''+''.join(sections)+'''</main><footer><a href="../">Вернуться в общую базу знаний</a><p>Дата среза 19.11.2026. Источники и ограничения указаны в каждом документе. Партнёрство с упомянутыми организациями не заявляется.</p></footer></body></html>'''
(OUT/'index.html').write_text(page)
print('Built 5 research documents and unified public report')
