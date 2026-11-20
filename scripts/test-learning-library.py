"""Validate content coverage, arithmetic, generated local links and scoring."""
import csv, json, unittest, subprocess, sys
from urllib.parse import urlsplit, unquote
from pathlib import Path
from html.parser import HTMLParser
R=Path(__file__).resolve().parents[1]; D=R/'docs/learning-library'; O=R/'academy/guides/learning-library'
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':self.links.extend(v for k,v in attrs if k=='href')
class LibraryTests(unittest.TestCase):
 def test_coverage(self):
  data=json.loads((D/'catalog.json').read_text());self.assertEqual(len(data['directions']),34)
  courses=[c for d in data['directions'] for c in d['courses']]
  self.assertEqual(len(courses),116);self.assertEqual(len({c['id'] for c in courses}),116)
  self.assertEqual(sum(c['status']=='planned' for c in courses),110)
  self.assertEqual(sum(c['status']=='introductory_written_unreviewed' for c in courses),6)
  for c in courses:
   if c['status']=='planned':self.assertEqual(set(c['sections'].values()),{'missing'})
   else:self.assertEqual(c['sections']['review'],'pending');self.assertTrue((O/c['url']).exists())
 def test_arithmetic_and_anomalies(self):
  rows=list(csv.DictReader((O/'practice.csv').read_text().splitlines()));self.assertEqual(len(rows),6)
  self.assertEqual(len({r['record_id'] for r in rows}),5)
  selected=rows[:3];units=sum(int(r['units']) for r in selected);cost=sum(int(r['units'])*int(r['unit_price_rub']) for r in selected)
  self.assertEqual(units,35);self.assertEqual(cost,4000);self.assertEqual(round(cost/units,2),114.29)
  self.assertEqual(round(sum(int(r['defective_units']) for r in selected)/units*100,2),5.71)
 def test_links(self):
  for f in O.glob('*.html'):
   parser=Links();parser.feed(f.read_text())
   for url in parser.links:
    if url.startswith(('https:','http:','#')):continue
    target=R/url.lstrip('/') if url.startswith('/') else f.parent/url
    self.assertTrue(target.exists(),f'{f}: {url}')
 def test_scoring(self):
  c=json.loads((D/'foundation-data.json').read_text())
  self.assertEqual(len(c['lessons']),3);self.assertEqual(len(c['assessment']),8)
  self.assertEqual(sum(q['points'] for q in c['assessment'])+sum(q['points'] for q in c['practice']['rubric']),28)
  self.assertEqual(c['review']['subject_expert'],'pending')
 def test_pack_outcome_coverage(self):
  packs=json.loads((D/'course-packs.json').read_text())
  packs['courses'].extend(json.loads((D/'digital-packs.json').read_text())['courses'])
  self.assertEqual(len(packs['courses']),6)
  for c in packs['courses']:
   self.assertEqual(len(c['lessons']),4)
   self.assertEqual(len(c['questions']),6)
   self.assertEqual(sum(x['points'] for x in c['practice']['criteria']),12)
   check_ids={q['id'] for q in c['questions']}|{x['id'] for x in c['practice']['criteria']}
   for outcome in c['outcomes']:
    self.assertTrue(set(outcome['checks'])<=check_ids)
    self.assertIn(outcome['lesson'],range(1,5))
   for q in c['questions']:
    self.assertTrue(q['answer']);self.assertTrue(q['reason'])
   for source in c['sources']:
    for key in ['author','url','published','version','checked','license','access','use']:self.assertTrue(source[key])
   with (O/c['template']['filename']).open(encoding='utf-8-sig') as f:
    rows=list(csv.reader(f))
   self.assertEqual(len(rows[0]),len(rows[1]))
 def test_management_case(self):
  available=3*6*60;needed=90*12+10*30
  self.assertEqual((available,needed,needed-available),(1080,1380,300))
  self.assertEqual((available-10*30)//12,65)
 def test_sales_case(self):
  import math
  initial=10*12000-10*6000-20000
  discounted=10*10800-10*6000-20000
  self.assertEqual((initial,discounted),(40000,28000))
  self.assertAlmostEqual((initial-discounted)/initial,0.3)
  self.assertEqual(math.ceil(20000/(10800-6000)),5)
  self.assertEqual(4*(10800-6000)-20000,-800)
 def test_warehouse_case(self):
  physical=40+96-70;blocked=4;reserved=10
  self.assertEqual((physical,physical-blocked,physical-blocked-reserved),(66,62,52))
  self.assertEqual(65-physical,-1)
  self.assertEqual(18/20,0.9)
 def test_download_archive(self):
  import zipfile
  with zipfile.ZipFile(O/'learning-library.zip') as z:
   self.assertIsNone(z.testzip())
   for name in ['index.html','catalog.json','coverage.csv','team-management.html','b2b-sales.html','warehouse-operations.html','sql-basics.html','python-basics.html','ai-for-hr.html','python-lab.py','sql-lab.json','run-digital-labs.py']:
    self.assertIn(name,z.namelist())
 def test_progress(self):
  progress=json.loads((O/'progress.json').read_text())
  self.assertEqual(progress['lessons'],27)
  self.assertEqual(progress['open_answers'],44)
  self.assertEqual(progress['materials'],7)
  self.assertEqual(progress['planned'],110)
  self.assertEqual(progress['expert_approved'],0)
  self.assertEqual((O/'progress.json').read_bytes(),(D/'progress.json').read_bytes())
  hub=(O/'index.html').read_text()
  for text in ['27 уроков','44 открытых ответов','110 курсов']:self.assertIn(text,hub)
 def test_published_lab_matches_source_and_runs(self):
  for name in ['python-lab.py','sql-lab.json','run-digital-labs.py']:
   self.assertEqual((O/name).read_bytes(),(D/'labs'/name).read_bytes())
  result=subprocess.run([sys.executable,str(O/'run-digital-labs.py')],capture_output=True,text=True,timeout=10)
  self.assertEqual(result.returncode,0,result.stderr)
 def test_ai_pilot_arithmetic(self):
  cycle=4+1+12+5
  self.assertEqual(cycle,22)
  equivalent=(25-cycle)*100/60*600
  self.assertEqual(equivalent-2500,500)
  self.assertEqual(4+1+16+5,26)
 def test_anchor_links(self):
  class Anchors(HTMLParser):
   def __init__(self):super().__init__();self.ids=set();self.hrefs=[]
   def handle_starttag(self,tag,attrs):
    for k,v in attrs:
     if k=='id':self.ids.add(v)
     if tag=='a' and k=='href':self.hrefs.append(v)
  for f in O.glob('*.html'):
   parser=Anchors();parser.feed(f.read_text())
   for link in parser.hrefs:
    if link.startswith('#'):self.assertIn(link[1:],parser.ids,str(f))
if __name__=='__main__':unittest.main()
