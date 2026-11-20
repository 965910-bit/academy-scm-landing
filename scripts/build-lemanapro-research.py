"""Build dated open-source research. Requires markdown and openpyxl."""
from pathlib import Path
import csv, json, shutil, zipfile
import markdown
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill
ROOT = Path(__file__).resolve().parents[1]
src = ROOT / 'docs/lemanapro-demand-2026'
out = ROOT / 'academy/guides/lemanapro-demand'
out.mkdir(parents=True, exist_ok=True)
wb = Workbook()
wb.remove(wb.active)
for name, filename in [('Источники','sources.csv'),('Показатели','metrics.csv'),('Матрица спроса','demand-inputs.csv')]:
    ws = wb.create_sheet(name)
    for row in csv.reader((src / filename).open()):
        ws.append(row)
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions
    for cell in ws[1]:
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='173B48')
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = min(70, max(18, max(len(str(c.value or '')) for c in col)+2))
ws = wb.create_sheet('Закупки')
records = json.loads((src / 'tenders.json').read_text())
ws.append(list(records[0]))
for record in records:
    ws.append([json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v for v in record.values()])
ws.freeze_panes = 'A2'
wb.save(out / 'lemanapro-research.xlsx')
assert len(load_workbook(out / 'lemanapro-research.xlsx').sheetnames) == 4
for p in src.iterdir():
    shutil.copyfile(p,out / p.name)
body = markdown.markdown((src/'README.md').read_text(),extensions=['tables'])
sources = json.loads((src/'sources.json').read_text())
from html import escape
links = '<h2>Реестр ссылок</h2>' + ''.join(f'<p id="{s["id"]}"><b>{s["id"]}</b> <a href="{escape(s["url"],quote=True)}">{escape(s["title"])}</a> — {escape(s["access"])}. {escape(s["limitation"])}</p>' for s in sources)
(out/'index.html').write_text('''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Лемана ПРО — спрос на обучение</title><style>body{max-width:1080px;margin:36px auto;padding:0 22px;font:17px/1.65 system-ui;color:#18353f;background:#f6f8fa}a{color:#006c87}h1,h2{line-height:1.2}h2{margin-top:2em}table{display:block;overflow:auto;border-collapse:collapse}td,th{border:1px solid #ccd6dc;padding:10px;text-align:left}code{overflow-wrap:anywhere}nav{padding:18px;background:#e3eef0}p,li{overflow-wrap:anywhere}</style><nav><a href="../project-dossier/">Досье проекта</a> · <a href="../../">Академия</a> · <a href="lemanapro-research.xlsx">Таблицы XLSX</a> · <a href="lemanapro-research.zip">Весь комплект ZIP</a></nav>''' + body + links + '</html>')
with zipfile.ZipFile(out/'lemanapro-research.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in out.iterdir():
        if p.suffix != '.zip': z.write(p,p.name)
assert len(records)==1 and records[0]['quantity'] is None
assert len(sources)==17
print('PASS: 17 sources, 1 unique procedure, XLSX 4 sheets, public HTML and ZIP')
