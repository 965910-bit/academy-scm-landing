"""Validate content coverage, arithmetic, generated local links and scoring."""
import csv, json, unittest, subprocess, sys
import copy
from learning_library_packs import validate_packs, render_review_ledger
from pathlib import Path
from html.parser import HTMLParser
R=Path(__file__).resolve().parents[1]; D=R/'docs/learning-library'; O=R/'academy/guides/learning-library'
def all_packs():
 data=json.loads((D/'course-packs.json').read_text())
 for path in sorted(D.glob('*-packs.json')):
  if path.name!='course-packs.json':data['courses'].extend(json.loads(path.read_text())['courses'])
 return data
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':self.links.extend(v for k,v in attrs if k=='href')
class LibraryTests(unittest.TestCase):
 def test_coverage(self):
  data=json.loads((D/'catalog.json').read_text());self.assertEqual(len(data['directions']),34)
  courses=[c for d in data['directions'] for c in d['courses']]
  self.assertEqual(len(courses),116);self.assertEqual(len({c['id'] for c in courses}),116)
  self.assertEqual(sum(c['status']=='planned' for c in courses),67)
  self.assertEqual(sum(c['status']=='introductory_written_unreviewed' for c in courses),49)
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
    url=url.split('#',1)[0]
    target=R/url.lstrip('/') if url.startswith('/') else f.parent/url
    self.assertTrue(target.exists(),f'{f}: {url}')
 def test_scoring(self):
  c=json.loads((D/'foundation-data.json').read_text())
  self.assertEqual(len(c['lessons']),3);self.assertEqual(len(c['assessment']),8)
  self.assertEqual(sum(q['points'] for q in c['assessment'])+sum(q['points'] for q in c['practice']['rubric']),28)
  self.assertEqual(c['review']['subject_expert'],'pending')
 def test_pack_outcome_coverage(self):
  packs=all_packs()
  self.assertEqual(len(packs['courses']),49)
  for c in packs['courses']:
   self.assertEqual(len(c['lessons']),8 if c['id'] in {'D07-C01','D09-C02'} else 4)
   self.assertEqual(len(c['questions']),12 if c['id'] in {'D07-C01','D09-C02'} else 6)
   self.assertEqual(sum(x['points'] for x in c['practice']['criteria']),12)
   check_ids={q['id'] for q in c['questions']}|{x['id'] for x in c['practice']['criteria']}
   for outcome in c['outcomes']:
    self.assertTrue(set(outcome['checks'])<=check_ids)
    self.assertIn(outcome['lesson'],range(1,len(c['lessons'])+1))
   for q in c['questions']:
    self.assertTrue(q['answer']);self.assertTrue(q['reason'])
   for source in c['sources']:
    for key in ['author','url','published','version','checked','license','access','use']:self.assertTrue(source[key])
   with (O/c['template']['filename']).open(encoding='utf-8-sig') as f:
    rows=list(csv.reader(f))
   self.assertEqual(len(rows[0]),len(rows[1]))
 def test_delegation_capacity_and_acceptance(self):
  initial=20+40*3+20
  self.assertEqual((initial,180-initial),(160,20))
  self.assertEqual((initial+60,240-(initial+60)),(220,20))
  extra=8*5
  self.assertEqual((extra,initial+extra,initial+extra-180),(40,200,20))
  self.assertEqual(20+5*3,35)
  self.assertEqual(37+3,40);self.assertEqual(37/40*100,92.5)
 def test_delegation_rubrics_exports_and_review(self):
  import zipfile
  c=json.loads((D/'delegation-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D01-C02')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
    self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  for suffix in ['html','md']:
   text=(O/('delegation-practice.'+suffix)).read_text()
   self.assertIn('92,5%',text)
   self.assertIn('24',text);self.assertIn('18',text)
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in ['delegation-practice.html','delegation-practice.md','delegation-card.csv','D01-C02.json']:
    self.assertIn(name,archive.namelist())
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_change_case_arithmetic(self):
  import math
  baseline=100*12+15*8
  running=100*10+8*8+60
  gain=baseline-running
  self.assertEqual((baseline,running,gain),(1320,1124,196))
  self.assertEqual(baseline/100,13.2)
  self.assertEqual(round(gain/baseline*100,2),14.85)
  self.assertEqual((running+300,running+300-baseline),(1424,104))
  self.assertEqual(math.ceil(300/gain),2)
  self.assertEqual(round((15-8)/15*100,2),46.67)
  self.assertEqual(gain/60*600,1960)
 def test_change_case_adverse_scenarios(self):
  baseline=1320
  # More support reverses the time effect; meeting returns alone is insufficient.
  self.assertEqual(100*10+8*8+300,1364)
  self.assertGreater(1364,baseline)
  # Exactly reaching the baseline does not meet the strictly-less-than target.
  self.assertEqual(100*10+8*8+256,baseline)
  # First full volume does not recover preparation; two volumes do, conditionally.
  self.assertLess(196-300,0);self.assertGreater(2*196-300,0)
 def test_change_rubrics_exports_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'change-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D01-C03')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
    self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  for suffix in ['html','md']:
   text=(O/('change-management.'+suffix)).read_text()
   for value in ['1124','196','1424','104','46,67','Стоп','24','18']:
    self.assertIn(value,text)
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in ['change-management.html','change-management.md','change-pilot-card.csv','D01-C03.json']:
    self.assertIn(name,archive.namelist())
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_team_role_capacity_not_aggregate_capacity(self):
  self.assertEqual((24*5,24*4),(120,96))
  self.assertEqual(150+90-24*(5+4),24)
  self.assertEqual(24*4-90,6)
  self.assertEqual(min(150//5,90//4),22)
  self.assertEqual((22*5+2*4,2*5+22*4),(118,98))
  # Exhaust every cross-role allocation without self-review: none fits 24.
  feasible=[]
  for irina_prepares in range(25):
   pavel_prepares=24-irina_prepares
   irina_load=5*irina_prepares+4*pavel_prepares
   pavel_load=5*pavel_prepares+4*irina_prepares
   if irina_load<=150 and pavel_load<=90:
    feasible.append(irina_prepares)
  self.assertEqual(feasible,[])
 def test_team_handoff_calendar_and_quality(self):
  preparation=0;review_end=0
  for record in range(22):
   preparation+=5
   review_end=max(review_end,preparation)+4
  self.assertEqual((preparation,review_end),(110,114))
  self.assertEqual(22*5+22*4,198)
  self.assertEqual(review_end-5,109)
  self.assertEqual(round(18/22*100,2),81.82)
  self.assertEqual(round(4/22*100,2),18.18)
  self.assertEqual(18+4,22)
 def test_team_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'teamwork-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D01-C04')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
    self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  for suffix in ['html','md']:
   text=(O/('team-coordination.'+suffix)).read_text()
   for value in ['118','98','114','198','81,82','18,18','24','18']:
    self.assertIn(value,text)
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in ['team-coordination.html','team-coordination.md','team-coordination-card.csv','D01-C04.json']:
    self.assertIn(name,archive.namelist())
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_feedback_metrics_and_distinct_statuses(self):
  before=4/20*100;after=1/20*100
  self.assertEqual((before,after,before-after),(20,5,15))
  self.assertEqual((before-after)/before*100,75)
  self.assertEqual(2/20*100,10)
  # Explicit unknowns satisfy transparent status, not source confirmation.
  statuses=['source']*18+['unknown']*2
  self.assertEqual(sum(s in {'source','unknown'} for s in statuses),20)
  self.assertEqual(statuses.count('source'),18)
 def test_feedback_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'feedback-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D02-C03')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
    self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  for suffix in ['html','md']:
   text=(O/('constructive-feedback.'+suffix)).read_text()
   for value in ['F03','F08','F12','F19','20%','5%','75%','24','18','feedback-role-guide.md']:
    self.assertIn(value,text)
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in ['constructive-feedback.html','constructive-feedback.md','feedback-conversation-card.csv','D02-C03.json','feedback-role-guide.md']:
    self.assertIn(name,archive.namelist())
  guide=(D/'labs/feedback-role-guide.md').read_bytes()
  self.assertEqual(guide,(O/'feedback-role-guide.md').read_bytes())
  self.assertIn('не дополнительные баллы',guide.decode())
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def employee_team_rows(self):
  return list(csv.DictReader((D/'labs/employee-teamwork-cases.csv').read_text(encoding='utf-8-sig').splitlines()))
 def test_employee_team_dataset_and_unique_exceptions(self):
  rows=self.employee_team_rows();self.assertEqual(len(rows),14)
  latest={}
  for row in rows:
   if row['task_id'] not in latest or int(row['version'])>int(latest[row['task_id']]['version']):latest[row['task_id']]=row
  self.assertEqual(set(latest),{f'T{i:02}' for i in range(1,13)})
  self.assertEqual([latest[k]['version'] for k in ['T04','T09']],['2','2'])
  blocked={k for k,r in latest.items() if r['status']=='blocked'}
  no_source={k for k,r in latest.items() if not r['source']}
  no_receipt={k for k,r in latest.items() if r['receipt']=='no'}
  self.assertEqual(blocked,{'T03','T07','T11'});self.assertEqual(no_source,blocked)
  self.assertEqual(no_receipt,{'T02','T07'})
  self.assertEqual(blocked|no_source|no_receipt,{'T02','T03','T07','T11'})
  ready={k for k,r in latest.items() if r['status']=='ready' and r['source'] and r['receipt']=='yes'}
  self.assertEqual(len(ready),8);self.assertEqual(round(len(ready)/len(latest)*100,2),66.67)
  # A source alone or receipt alone does not remove both T07 blockers.
  t7=dict(latest['T07']);t7.update(source='fictional-T07',status='ready')
  self.assertEqual(t7['receipt'],'no')
 def test_employee_team_capacity_and_corrected_case(self):
  self.assertEqual((12*6,12*6-60,60//6),(72,12,10))
  self.assertEqual(round((12/12-8/12)*100,2),33.33)
  self.assertEqual((12-8)/8*100,50)
 def test_employee_team_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'employee-teamwork-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D02-C04')
  self.assertNotEqual(c['slug'],'team-coordination')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
    self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['employee-teamwork.html','employee-teamwork.md','employee-teamwork-card.csv','D02-C04.json','employee-teamwork-cases.csv','employee-teamwork-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in names:self.assertIn(name,archive.namelist())
  for name in names[-2:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  text=(O/'employee-teamwork.md').read_text()
  for value in ['T02','T03','T07','T11','66,67%','33,33','50%','24','18']:self.assertIn(value,text)
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_stress_workload_data_and_scenarios(self):
  rows=list(csv.DictReader((D/'labs/workload-stress-case.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual(len(rows),4)
  costs={r['activity']:int(r['quantity'])*int(r['minutes_per_unit']) for r in rows}
  self.assertEqual(costs,dict(cards=240,meeting=60,report=90,interruptions=60))
  before=sum(v for k,v in costs.items() if k!='interruptions');full=sum(costs.values())
  self.assertEqual((before,before-360,full,full-360),(390,30,450,90))
  self.assertEqual(full/360*100,125)
  agreed=16*10+60+60+60
  self.assertEqual((agreed,360-agreed,24-16),(340,20,8))
  # If report reduction is refused, the proposal is still over capacity.
  refused=16*10+60+90+60
  self.assertEqual((refused,refused-360),(370,10))
 def test_stress_process_metric_not_health_measure(self):
  before=8/10*100;after=2/10*100
  self.assertEqual((before,after,before-after),(80,20,60))
  self.assertEqual((before-after)/before*100,75)
  c=json.loads((D/'stress-packs.json').read_text())['courses'][0]
  self.assertIn('не уровень стресса',c['questions'][1]['answer'])
  self.assertIn('не здоровье',c['questions'][5]['answer'])
 def test_stress_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'stress-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D02-C02')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['workload-and-stress.html','workload-and-stress.md','workload-support-card.csv','D02-C02.json','workload-stress-case.csv','workload-stress-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in names:self.assertIn(name,archive.namelist())
  for name in names[-2:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  text=(O/'workload-and-stress.md').read_text()
  for value in ['450','360','340','125%','60 п.п.','75%','Не диагностика','24','18']:self.assertIn(value,text)
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_complaints_dataset_and_internal_metrics(self):
  from collections import Counter
  rows=list(csv.DictReader((D/'labs/complaints-register-case.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual(len(rows),8);self.assertEqual(len({r['case_id'] for r in rows}),8)
  self.assertEqual(sum(int(r['requested_rub']) for r in rows),10000)
  hours=[int(r['ack_hours']) for r in rows]
  self.assertEqual((sum(h<=4 for h in hours),sum(hours)/8),(6,3.125))
  late={r['case_id'] for r in rows if int(r['ack_hours'])>4}
  pending={r['case_id'] for r in rows if r['status']=='pending_review'}
  self.assertEqual(late,{'C03','C06'});self.assertEqual(pending,{'C02','C06','C08'})
  self.assertEqual(late|pending,{'C02','C03','C06','C08'})
  self.assertEqual(Counter(r['status'] for r in rows),dict(fulfilled=3,rejected_notified=1,resolution_sent=1,pending_review=3))
  self.assertTrue(all(r['legal_due_status']=='unverified' for r in rows))
  self.assertEqual(next(r for r in rows if r['case_id']=='C05')['ack_hours'],'4')
 def test_complaints_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'complaints-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D03-C03')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['complaints-handling.html','complaints-handling.md','complaint-action-card.csv','D03-C03.json','complaints-register-case.csv','complaints-practice-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in names:self.assertIn(name,archive.namelist())
  for name in names[-2:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  text=(O/'complaints-handling.md').read_text()
  for value in ['10000','75%','3,125','unverified','не универсальное','24','18']:self.assertIn(value,text)
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def contact_rows(self):
  return list(csv.DictReader((D/'labs/contact-centre-calls.csv').read_text(encoding='utf-8-sig').splitlines()))
 def test_contact_metrics_from_dataset(self):
  rows=self.contact_rows();self.assertEqual(len(rows),10);self.assertEqual(len({r['call_id'] for r in rows}),10)
  answered=[r for r in rows if r['status']=='answered'];abandoned=[r for r in rows if r['status']=='abandoned']
  self.assertEqual((len(answered),len(abandoned)),(8,2))
  self.assertEqual(len(abandoned)/len(rows)*100,20)
  self.assertEqual(sum(int(r['wait_s']) for r in answered)/len(answered),30)
  self.assertEqual(sum(int(r['wait_s']) for r in rows)/len(rows),26)
  quick={r['call_id'] for r in answered if int(r['wait_s'])<=20}
  self.assertEqual(quick,{'K01','K02','K05','K06'})
  self.assertEqual((len(quick)/len(rows)*100,len(quick)/len(answered)*100),(40,50))
  sums=[sum(int(r[k]) for r in answered) for k in ['talk_s','hold_s','acw_s']]
  self.assertEqual(sums,[1170,120,240]);self.assertEqual(sum(sums)/len(answered),191.25)
  self.assertEqual(sums[0]/len(answered),146.25)
 def test_contact_outcomes_and_nonapplicable_fields(self):
  rows=self.contact_rows();answered=[r for r in rows if r['status']=='answered']
  for r in rows:
   if r['status']=='abandoned':
    self.assertEqual([r[k] for k in ['talk_s','hold_s','acw_s']],['','',''])
    self.assertEqual(r['outcome'],'not_connected')
  self.assertEqual({r['call_id'] for r in answered if r['outcome']=='escalated'},{'K04','K07','K08'})
  self.assertEqual(sum(r['outcome']=='resolved' for r in answered)/len(answered)*100,62.5)
  guide=(D/'labs/contact-centre-guide.md').read_text()
  self.assertIn('При нулевом знаменателе показатель не определен',guide)
 def test_contact_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'contact-centre-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D03-C04')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['contact-centre-basics.html','contact-centre-basics.md','contact-centre-action-card.csv','D03-C04.json','contact-centre-calls.csv','contact-centre-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in names:self.assertIn(name,archive.namelist())
  for name in names[-2:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  text=(O/'contact-centre-basics.md').read_text()
  for value in ['191,25','62,5%','40%','30 секунд','1530','24','18']:self.assertIn(value,text)
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_recruitment_scores_minima_and_missing(self):
  rows=list(csv.DictReader((D/'labs/recruitment-case.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual(len(rows),5);self.assertEqual(len({r['candidate_id'] for r in rows}),5)
  totals={};eligible=[];missing=[]
  for r in rows:
   cells=[r[k] for k in ['data_score','communication_score','planning_score']]
   if '' in cells:
    missing.append(r['candidate_id']);continue
   scores=list(map(int,cells));self.assertTrue(all(x in {0,1,2} for x in scores))
   total=sum(x/2*w for x,w in zip(scores,[50,30,20]));totals[r['candidate_id']]=total
   if total>=70 and min(scores)>=1:eligible.append(r['candidate_id'])
  self.assertEqual(totals,dict(R01=85,R02=75,R03=80,R05=50))
  self.assertEqual(eligible,['R01','R02']);self.assertEqual(missing,['R04'])
  r4=next(r for r in rows if r['candidate_id']=='R04')
  known=int(r4['data_score'])/2*50+int(r4['planning_score'])/2*20
  self.assertEqual((known,known+30),(60,90))
  self.assertEqual((len(eligible)/5*100,len(missing)/5*100),(40,20))
 def test_recruitment_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'recruitment-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D04-C01')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['structured-recruitment.html','structured-recruitment.md','recruitment-decision-card.csv','D04-C01.json','recruitment-case.csv','recruitment-practice-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in names:self.assertIn(name,archive.namelist())
  for name in names[-2:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  guide=(O/'recruitment-practice-guide.md').read_text()
  for row in csv.DictReader((O/'recruitment-case.csv').read_text(encoding='utf-8-sig').splitlines()):self.assertIn(row['evidence_ref'],guide)
  text=(O/'structured-recruitment.md').read_text()
  for value in ['60–90','R03','R04','семи рабочих дней','24','18']:self.assertIn(value,text)
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_hr_records_dataset_and_distinct_evidence(self):
  rows=list(csv.DictReader((D/'labs/hr-records-case.csv').read_text(encoding='utf-8-sig').splitlines()))
  by_id={r['case_id']:r for r in rows};self.assertEqual(len(rows),6);self.assertEqual(len(by_id),6)
  unsigned={k for k,r in by_id.items() if r['contract_signed']!='yes'}
  no_receipt={k for k,r in by_id.items() if r['copy_receipt']!='yes'}
  lna_open={k for k,r in by_id.items() if r['lna_timing']!='before'}
  mismatch={k for k,r in by_id.items() if r['order_issued']=='yes' and r['order_matches']!='yes'}
  self.assertEqual(unsigned,{'H02'});self.assertEqual(no_receipt,{'H02','H03'})
  self.assertEqual(lna_open,{'H04','H05'});self.assertEqual(mismatch,{'H06'})
  self.assertEqual(unsigned|no_receipt|lna_open|mismatch,{'H02','H03','H04','H05','H06'})
  ready={k for k,r in by_id.items() if r['contract_signed']=='yes' and r['copy_receipt']=='yes' and r['lna_timing']=='before' and (r['order_issued']=='no' or r['order_matches']=='yes')}
  self.assertEqual(ready,{'H01'});self.assertEqual(round(len(ready)/len(rows)*100,2),16.67)
  self.assertEqual((by_id['H04']['lna_timing'],by_id['H05']['lna_timing']),('after','unknown'))
  self.assertEqual((by_id['H01']['order_issued'],by_id['H01']['order_matches']),('no','na'))
 def test_hr_records_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'hr-records-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D04-C02')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['hr-records-basics.html','hr-records-basics.md','hr-records-action-card.csv','D04-C02.json','hr-records-case.csv','hr-records-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in names:self.assertIn(name,archive.namelist())
  for name in names[-2:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  text=(O/'hr-records-basics.md').read_text()
  for value in ['16,67%','вправе издать','трех рабочих дней','не полный','24','18']:self.assertIn(value,text)
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def succession_rows(self):
  return list(csv.DictReader((D/'labs/succession-reserve-case.csv').read_text(encoding='utf-8-sig').splitlines()))
 def max_succession_coverage(self,rows):
  from itertools import product
  roles=sorted({r['role_id'] for r in rows})
  choices=[[None]+[r['candidate_id'] for r in rows if r['role_id']==role and r['practice']=='verified' and r['available']=='yes'] for role in roles]
  feasible=[]
  for assignment in product(*choices):
   selected=[p for p in assignment if p is not None]
   if len(set(selected))==len(selected):feasible.append(len(selected))
  return max(feasible)
 def test_succession_individual_vs_simultaneous_coverage(self):
  rows=self.succession_rows();roles={r['role_id'] for r in rows};people={r['candidate_id'] for r in rows}
  self.assertEqual((len(rows),len(roles),len(people)),(6,5,5))
  ready={r['role_id'] for r in rows if r['practice']=='verified' and r['available']=='yes'}
  self.assertEqual(ready,{'ROLE-A','ROLE-B','ROLE-E'})
  self.assertEqual(self.max_succession_coverage(rows),2)
  trained={r['candidate_id'] for r in rows if r['training_completed']=='yes'}
  self.assertEqual(len(trained)/len(people)*100,80)
  trained_only=copy.deepcopy(rows)
  for r in trained_only:r['training_completed']='yes'
  self.assertEqual(self.max_succession_coverage(trained_only),2)
  absent=copy.deepcopy(rows)
  for r in absent:
   if r['candidate_id']=='P01':r['available']='no'
  self.assertEqual(self.max_succession_coverage(absent),1)
  changed=copy.deepcopy(rows)
  for r in changed:
   if r['candidate_id']=='P05':r.update(practice='verified',available='yes')
  self.assertEqual(self.max_succession_coverage(changed),3)
 def test_succession_resources_and_change_metrics(self):
  self.assertEqual((180+60,60+60),(240,120))
  self.assertEqual((240-210,120-90),(30,30))
  self.assertEqual((3/5*100-2/5*100,(3-2)/2*100),(20,50))
 def test_succession_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'succession-packs.json').read_text())['courses'][0]
  self.assertEqual(c['id'],'D04-C04')
  self.assertEqual([r['checks'][0] for r in c['outcomes']],['P1','P2','P3','P4'])
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['succession-reserve.html','succession-reserve.md','succession-development-card.csv','D04-C04.json','succession-reserve-case.csv','succession-reserve-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in names:self.assertIn(name,archive.namelist())
  for name in names[-2:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  text=(O/'succession-reserve.md').read_text()
  for value in ['100%','60%','40%','80%','20 п.п.','50%','24','18']:self.assertIn(value,text)
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
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
  self.assertEqual(progress['lessons'],207)
  self.assertEqual(progress['open_answers'],314)
  self.assertEqual(progress['materials'],50)
  self.assertEqual(progress['planned'],67)
  self.assertEqual(progress['expert_approved'],0)
  self.assertEqual((O/'progress.json').read_bytes(),(D/'progress.json').read_bytes())
  hub=(O/'index.html').read_text()
  for text in ['207 уроков','314 ответов на контрольные вопросы','67 курсов','207 разборов заданий']:self.assertIn(text,hub)
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
 def test_budget_case(self):
  plan=100*10000-100*4000-300000
  actual=80*9500-80*4500-320000
  flexible=80*10000-80*4000-300000
  self.assertEqual((plan,actual,flexible),(300000,80000,180000))
  self.assertEqual(sum([-120000,-40000,-40000,-20000]),actual-plan)
  self.assertEqual(100000+1000000*.6-700000,0)
  self.assertEqual(100000+1000000*.5-700000,-100000)
  self.assertEqual((300000/(10000-4000),320000/(9500-4500)),(50,64))
 def test_procurement_case(self):
  offers=[('A',1000,8000,7),('B',1050,0,5),('C',900,3000,15)]
  eligible=[(100*p+d,name) for name,p,d,days in offers if days<=10]
  self.assertEqual(min(eligible),(105000,'B'))
  self.assertEqual(100*1050+5000,110000)
  self.assertEqual((100-98,98-3),(2,95))
 def test_onboarding_and_lesson_cases(self):
  self.assertEqual(4*2,8)
  self.assertEqual((8/10,10/10,9/10),(.8,1,.9))
  self.assertEqual((20+8-5,20+8-5-4),(23,19))
  self.assertEqual((30+10-7,30+10-7-5),(33,28))
  self.assertEqual(sum([5,10,10,15,5]),45)
  self.assertEqual(9/12,.75)
 def test_portable_markdown(self):
  for c in all_packs()['courses']:
   text=(O/(c['slug']+'.md')).read_text()
   for q in c['questions']:
    self.assertIn(q['answer'],text)
    self.assertIn(q['reason'],text)
   self.assertIn(c['practice']['model'],text)
   for lesson in c['lessons']:
    for paragraph in lesson['paragraphs']:self.assertIn(paragraph,text)
 def test_learning_sources_export(self):
  rows=list(csv.DictReader((O/'learning-sources.csv').read_text(encoding='utf-8-sig').splitlines()))
  expected=[dict(course_id=c['id'],**source) for c in all_packs()['courses'] for source in c['sources']]
  self.assertEqual(rows,expected)
 def test_validation_rejects_broken_material(self):
  data=all_packs();ids={c['id'] for c in data['courses']}
  validate_packs(data,ids)
  for mutation in ['orphan','answer','coverage','source','filename']:
   bad=copy.deepcopy(data);c=bad['courses'][0]
   if mutation=='orphan':c['id']='NOT-IN-CATALOG'
   elif mutation=='answer':c['questions'][0]['answer']=''
   elif mutation=='coverage':c['outcomes'][0]['checks']=['NOT-THERE']
   elif mutation=='source':c['sources'][0]['license']=''
   elif mutation=='filename':c['template']['filename']='../unsafe.csv'
   with self.subTest(mutation=mutation):
    with self.assertRaises(ValueError):validate_packs(bad,ids)
 def test_inventory_policy(self):
  import math
  physical,inbound,commitments,daily,lead,safety,target,pack=40,20,10,10,4,15,100,12
  position=physical+inbound-commitments
  point=daily*lead+safety
  quantity=math.ceil((target-position)/pack)*pack
  self.assertEqual((physical,physical-commitments,position),(40,30,50))
  self.assertEqual((point,quantity,position+quantity),(55,60,110))
  self.assertLessEqual(position,point)
  self.assertEqual(daily*6+safety,75)
 def test_service_and_security_metrics(self):
  self.assertEqual((15/20,12/20,8/10),(.75,.6,.8))
  self.assertEqual((15/20,10/20),(.75,.5))
  self.assertAlmostEqual(10/15*100,66.6666666667)
  self.assertEqual((10*100+5*200,9/10),(2000,.9))
 def test_editorial_ledger(self):
  ledger=json.loads((D/'review-ledger.json').read_text())
  expected={'FOUNDATION-DATA-01'}|{c['id'] for c in all_packs()['courses']}
  self.assertEqual({m['id'] for m in ledger['materials']},expected)
  self.assertEqual(len(ledger['materials']),50)
  self.assertEqual((O/'review-checklist.md').read_bytes(),(D/'review-checklist.md').read_bytes())
  for m in ledger['materials']:
   for stage in ['subject_review','legal_review','answer_review','pilot']:
    self.assertEqual(m[stage]['status'],'pending')
    self.assertIsNone(m[stage]['reviewer'])
  rows=list(csv.DictReader((O/'review-ledger.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual(len(rows),200)
  self.assertEqual(json.loads((O/'review-ledger.json').read_text()),ledger)
 def test_false_review_rejected(self):
  import tempfile
  ledger=json.loads((D/'review-ledger.json').read_text())
  expected={m['id'] for m in ledger['materials']}
  ledger['materials'][0]['answer_review']['status']='passed'
  with tempfile.TemporaryDirectory() as folder:
   with self.assertRaises(ValueError):render_review_ledger(ledger,expected,Path(folder),lambda t,b:b)
 def test_new_files_in_archive(self):
  import zipfile
  with zipfile.ZipFile(O/'learning-library.zip') as z:
   for name in ['cyber-hygiene.html','office-migration.html','customer-service.html','inventory-planning.html','review-ledger.html','review-ledger.json','review-checklist.md','review-ledger.csv']:
    self.assertIn(name,z.namelist())
 def test_all_lesson_solutions(self):
  count=0
  for c in all_packs()['courses']:
   for l in c['lessons']:
    self.assertTrue(l['exercise_answer'])
    self.assertIn(l['exercise_answer'],(O/(c['slug']+'.md')).read_text())
    count+=1
  foundation=json.loads((D/'foundation-data.json').read_text())
  self.assertTrue(all(l['exercise_answer'] for l in foundation['lessons']))
  count+=len(foundation['lessons'])
  self.assertEqual(count,207)
  self.assertEqual(json.loads((O/'progress.json').read_text())['lesson_solutions'],count)
 def test_answer_bank(self):
  data=json.loads((O/'answer-bank.json').read_text())
  self.assertEqual(data['counts'],dict(question=314,exercise=207,practice=50))
  self.assertEqual(len({r['id'] for r in data['entries']}),571)
  for row in data['entries']:
   self.assertTrue(row['answer']);self.assertTrue(row['explanation'])
   self.assertTrue((O/row['material_url'].split('#')[0]).exists())
  import zipfile
  with zipfile.ZipFile(O/'learning-library.zip') as z:
   for name in ['answer-bank.html','answer-bank.js','answer-bank.json','answer-bank.csv']:
    self.assertIn(name,z.namelist())
 def test_technical_arithmetic(self):
  self.assertEqual((10*12,2400/12,10*2400),(120,200,24000))
  self.assertEqual((100*60*5/1000,120*60*5/1000),(30,36))
  self.assertEqual((100+40-90,54-(100+40-90)),(50,4))
  self.assertAlmostEqual(1-(40/100)/(50/100),.2)
  self.assertEqual(19/20,.95)
 def test_professional_cases(self):
  self.assertEqual(108000+15000,123000)
  self.assertEqual((118000-117000,123000-120000),(1000,3000))
  values=[49.7,49.9,50,50.2,50.3]
  self.assertEqual(sum(not 49.8<=v<=50.2 for v in values),2)
  self.assertAlmostEqual(sum(values)/len(values),50.02)
  self.assertEqual((100*2000,90*2000),(200000,180000))
  self.assertEqual((200000*.3,180000*.3),(60000,54000))
  self.assertEqual((18/20,500-300-180),(.9,20))
 def test_professional_limits_and_exports(self):
  data=json.loads((D/'professional-packs.json').read_text())
  self.assertEqual({c['id'] for c in data['courses']},{'D02-C01','D18-C05','D33-C01','D32-C03'})
  import zipfile
  with zipfile.ZipFile(O/'learning-library.zip') as z:
   for c in data['courses']:
    for name in [c['slug']+'.html',c['slug']+'.md',c['id']+'.json',c['template']['filename']]:
     self.assertIn(name,z.namelist())
    self.assertTrue(c['scope']);self.assertTrue(c['legal_basis'])
    self.assertGreaterEqual(len(c['practice']['critical_errors']),3)
    for lesson in c['lessons']:
     self.assertGreaterEqual(len(lesson['paragraphs']),2)
     self.assertTrue(lesson['exercise_answer'])
 def test_question_specific_rubrics(self):
  data=json.loads((D/'professional-packs.json').read_text())
  bank=json.loads((O/'answer-bank.json').read_text())
  lookup={e['id']:e for e in bank['entries']}
  for c in data['courses']:
   md=(O/(c['slug']+'.md')).read_text()
   for q in c['questions']:
    self.assertEqual(set(q['scoring']),{'0','1','2'})
    for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
     self.assertIn(text,md)
     self.assertIn(text,lookup[c['id']+'-'+q['id']]['explanation'])
  data['courses'][0]['questions'][0]['scoring'].pop('1')
  with self.assertRaises(ValueError):validate_packs(data,{c['id'] for c in data['courses']})
 def organization_lab(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('organization_labs',D/'labs/run-organization-labs.py')
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  return module,json.loads((D/'labs/organization-cases.json').read_text())
 def test_organization_labs(self):
  module,fixture=self.organization_lab()
  result=module.calculate(fixture);module.check_fixture(result)
  self.assertEqual(result['transport']['last_unload_end_minute'],735)
  self.assertEqual(result['healthcare']['deficit_minutes'],60)
  self.assertEqual(result['psychology']['change_percentage_points'],-10)
  self.assertEqual(result['maintenance']['labor_person_hours'],8)
  self.assertEqual(result['maintenance']['sequential_window_hours'],6)
  for name in ['organization-cases.json','run-organization-labs.py']:
   self.assertEqual((O/name).read_bytes(),(D/'labs'/name).read_bytes())
  run=subprocess.run([sys.executable,str(O/'run-organization-labs.py')],capture_output=True,text=True,timeout=10)
  self.assertEqual(run.returncode,0,run.stderr);self.assertIn('PASS',run.stdout)
 def test_organization_labs_reject_invalid_data(self):
  module,fixture=self.organization_lab()
  for section,key,value in [('transport','places_per_vehicle',0),('transport','open',2),('healthcare','slot_minutes',0),('healthcare','closed',-1),('psychology','responded',41),('psychology','reported_role_issue',25),('psychology','pilot_returns',61),('maintenance','confirmed',11),('maintenance','workers',True)]:
   bad=copy.deepcopy(fixture);bad[section][key]=value
   with self.subTest(section=section,key=key):
    with self.assertRaises(ValueError):module.calculate(bad)
  changed=copy.deepcopy(fixture);changed['transport']['outbound_minutes']=50
  with self.assertRaises(ValueError):module.check_fixture(module.calculate(changed))
 def test_organization_labs_edge_cases(self):
  module,fixture=self.organization_lab()
  fixture['transport']['pallets']=8
  fixture['psychology']['baseline_returns']=0
  result=module.calculate(fixture)
  self.assertEqual(result['transport']['minimum_trips_by_places'],1)
  self.assertEqual(result['transport']['last_unload_end_minute'],585)
  self.assertEqual(result['transport']['lateness_minutes'],0)
  self.assertIsNone(result['psychology']['relative_reduction_percent'])
 def test_organization_pack_exports_and_rubrics(self):
  import zipfile
  data=json.loads((D/'organization-packs.json').read_text())
  self.assertEqual({c['id'] for c in data['courses']},{'D20-C02','D26-C02','D27-C01','D23-C02'})
  bank={e['id']:e for e in json.loads((O/'answer-bank.json').read_text())['entries']}
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for c in data['courses']:
    for name in [c['slug']+'.html',c['slug']+'.md',c['template']['filename'],c['id']+'.json',*c['case_files']]:self.assertIn(name,archive.namelist())
    for q in c['questions']:
     self.assertEqual(set(q['scoring']),{'0','1','2'})
     for text in [*q['scoring'].values(),*q['acceptable_alternatives']]:
      self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  data['courses'][0]['case_files']=['../secret.json']
  with self.assertRaises(ValueError):validate_packs(data,{c['id'] for c in data['courses']})
 def test_all_directions_have_intro_not_full_programs(self):
  catalog=json.loads((D/'catalog.json').read_text())
  progress=json.loads((O/'progress.json').read_text())
  self.assertEqual(progress['directions_with_intro'],34)
  self.assertEqual(progress['directions_without_intro'],0)
  for direction in catalog['directions']:
   self.assertTrue(any(c['status']=='introductory_written_unreviewed' for c in direction['courses']))
   self.assertNotIn('approved',{c['status'] for c in direction['courses']})
  self.assertEqual(progress['expert_approved'],0)
  self.assertEqual(progress['regulated_ready'],0)
 def test_safety_pack_rubrics_and_archive(self):
  import zipfile
  data=json.loads((D/'safety-packs.json').read_text())
  self.assertIn('№ 220н',data['courses'][0]['legal_basis'])
  self.assertEqual({c['id'] for c in data['courses']},{'D12-C02','D13-C02','D14-C02','D15-C02','D16-C03','D17-C02'})
  bank={e['id']:e for e in json.loads((O/'answer-bank.json').read_text())['entries']}
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for c in data['courses']:
    self.assertTrue(c['scope']);self.assertTrue(c['legal_basis'])
    self.assertGreaterEqual(len(c['practice']['critical_errors']),3)
    for name in [c['slug']+'.html',c['slug']+'.md',c['template']['filename'],c['id']+'.json']:
     self.assertIn(name,archive.namelist())
    for q in c['questions']:
     self.assertEqual(set(q['scoring']),{'0','1','2'})
     for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
      self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
 def test_safety_arithmetic(self):
  self.assertEqual((12//4,3*15,9/12),(3,45,.75))
  self.assertEqual((16/20,3/4),(.8,.75))
  self.assertEqual((6/8,4/5),(.75,.8))
  self.assertAlmostEqual(4/6*100,66.6666666667)
  self.assertEqual((8/10,20/25,3/5),(.8,.8,.6))
  from decimal import Decimal
  energy=Decimal('112')-Decimal('100')
  self.assertEqual(energy*Decimal('1.163'),Decimal('13.956'))
  self.assertEqual((energy-Decimal('10.5'))/energy*100,Decimal('12.5'))
  self.assertEqual(12/16,.75)
 def excel_lab(self):
  import runpy
  module=runpy.run_path(str(D/'labs/check-excel-results.py'))
  rows=list(csv.DictReader((D/'labs/excel-orders.csv').read_text().splitlines()))
  return module,rows
 def test_excel_reference(self):
  module,rows=self.excel_lab()
  clean,issues,duplicates,metrics=module['analyze'](rows)
  self.assertEqual([r['record_id'] for r in clean],['O001','O002','O003','O004','O007','O008','O009'])
  self.assertEqual({r['record_id'] for r in issues},{'O005','O006'})
  self.assertEqual(len(duplicates),1)
  self.assertEqual((metrics['paid_records'],metrics['paid_units'],metrics['paid_amount']),(5,24,3500))
  self.assertEqual((metrics['north_paid'],metrics['south_paid']),(1600,1900))
  self.assertAlmostEqual(float(metrics['weighted_price']),145.8333333333)
  self.assertEqual((metrics['reserve'],metrics['total_with_reserve'],metrics['report_delta']),(175,3675,-600))
 def test_excel_answer_check(self):
  module,rows=self.excel_lab();metrics=module['analyze'](rows)[3]
  text='metric;value\n'+'\n'.join(k+';'+str(round(v,2)).replace('.',',') for k,v in metrics.items())
  answers=module['read_answers'](text);module['check_answers'](answers,metrics)
  for bad in [text.replace('paid_records;5','paid_records;4'),text+'\npaid_records;5',text.replace('paid_amount;3500','paid_amount;NaN')]:
   with self.assertRaises(ValueError):module['check_answers'](module['read_answers'](bad),metrics)
  answers.pop('reserve')
  with self.assertRaises(ValueError):module['check_answers'](answers,metrics)
 def test_excel_conflict_and_zero(self):
  module,rows=self.excel_lab()
  conflicting=copy.deepcopy(rows);conflicting[3]['units']='9'
  with self.assertRaises(ValueError):module['analyze'](conflicting)
  for row in rows:row['status']='pending'
  result=module['analyze'](rows)[3]
  self.assertIsNone(result['weighted_price']);self.assertIsNone(result['defect_units_percent'])
 def test_excel_template_and_cli(self):
  rows=list(csv.DictReader((O/'excel-answers-template.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual(len(rows),15)
  module,source=self.excel_lab();metrics=module['analyze'](source)[3]
  import tempfile
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp)/'answers.csv';p.write_text('metric,value\n'+'\n'.join(k+','+str(v) for k,v in metrics.items()))
   result=subprocess.run([sys.executable,str(O/'check-excel-results.py'),'--answers',str(p)],capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('PASS',result.stdout)
 def test_excel_workbook_structure_and_archive(self):
  import zipfile,xml.etree.ElementTree as ET
  ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  with zipfile.ZipFile(O/'excel-practice.xlsx') as book:
   for name in book.namelist():ET.fromstring(book.read(name))
   self.assertFalse(any('vba' in n.lower() or 'externallinks' in n.lower() for n in book.namelist()))
   root=ET.fromstring(book.read('xl/workbook.xml'))
   self.assertEqual([e.attrib['name'] for e in root.findall('s:sheets/s:sheet',ns)],['Readme','Raw','Work','Clean','Settings','Learner','Answer','Summary','Issues'])
   raw=ET.fromstring(book.read('xl/worksheets/sheet2.xml'))
   self.assertEqual(len(raw.findall('s:sheetData/s:row',ns)),11)
   clean=ET.fromstring(book.read('xl/worksheets/sheet4.xml'))
   self.assertEqual(len(clean.findall('.//s:f',ns)),14)
   self.assertIn('Settings!$B$2',book.read('xl/worksheets/sheet7.xml').decode())
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in ['excel-practice.xlsx','excel-orders.csv','check-excel-results.py','excel-lab-readme.md','excel-answers-template.csv']:
    self.assertIn(name,archive.namelist())
 def test_variable_course_scoring_and_resources(self):
  excel=json.loads((D/'spreadsheet-packs.json').read_text())
  course=excel['courses'][0]
  self.assertEqual(sum(len(l['paragraphs']) for l in course['lessons']),24)
  self.assertEqual([o['checks'][0] for o in course['outcomes']],['P1','P1','P1','P2','P2','P3','P4','P4'])
  self.assertIn('Максимум: 36 балла (24 вопросы + 12 практика)',(O/'excel-data-practice.html').read_text())
  self.assertIn('Всего 36; учебный ориентир 27',(O/'excel-data-practice.md').read_text())
  self.assertIn('8 уроков, практика, 12 ответов',(O/'index.html').read_text())
  course['resources'][0]['filename']='../escape.xlsx'
  with self.assertRaises(ValueError):validate_packs(excel,{'D07-C01'})
 def linux_lab(self):
  import runpy
  return runpy.run_path(str(D/'labs/linux-lab.py'))
 def linux_reference(self,root):
  result=subprocess.run(['bash','--noprofile','--norc',str(D/'labs/linux-reference.sh')],cwd=root,capture_output=True,text=True,timeout=10)
  self.assertEqual(result.returncode,0,result.stderr)
 def test_linux_commands_and_artifacts(self):
  import tempfile
  lab=self.linux_lab()
  with tempfile.TemporaryDirectory() as folder:
   root=lab['initialize'](Path(folder)/'lab with spaces')
   self.linux_reference(root)
   result=lab['check'](root)
   self.linux_reference(root)
   self.assertEqual(lab['check'](root),result)
   self.assertEqual((result['input_lines'],result['error_lines']),(8,3))
   self.assertEqual(result['error_types'],{'duplicate_id':1,'missing_price':2})
   self.assertTrue(result['permission_checked'])
   run=subprocess.run([sys.executable,str(O/'linux-lab.py'),'--check',str(root)],capture_output=True,text=True)
   self.assertEqual(run.returncode,0,run.stderr);self.assertIn('PASS',run.stdout)
 def test_linux_init_no_overwrite_and_wrong_directory(self):
  import tempfile
  lab=self.linux_lab()
  with tempfile.TemporaryDirectory() as folder:
   root=lab['initialize'](Path(folder)/'lab')
   original=(root/'input/events.log').read_bytes()
   with self.assertRaises(ValueError):lab['initialize'](root)
   self.assertEqual((root/'input/events.log').read_bytes(),original)
   run=subprocess.run(['bash',str(D/'labs/linux-reference.sh')],cwd=folder,capture_output=True,text=True)
   self.assertEqual(run.returncode,2)
   self.assertFalse((Path(folder)/'reports').exists())
 def test_linux_reject_changed_outputs(self):
  import tempfile
  lab=self.linux_lab()
  changes={'input/events.log':'changed\n','work/events-copy.log':'changed\n','reports/errors.log':'ERROR wrong\n','reports/error-counts.txt':'3 missing_price\n','reports/error-total.txt':'4\n','reports/fatal.log':'FATAL invented\n','reports/fatal-status.txt':'2\n','reports/note.txt':''}
  with tempfile.TemporaryDirectory() as folder:
   root=lab['initialize'](Path(folder)/'lab');self.linux_reference(root)
   for relative,value in changes.items():
    path=root/relative;original=path.read_text();path.write_text(value)
    with self.subTest(relative=relative):
     with self.assertRaises(ValueError):lab['check'](root)
    path.write_text(original)
   input_path=root/'input/events.log';original_bytes=input_path.read_bytes();input_path.write_bytes(original_bytes.replace(b'\n',b'\r\n'))
   with self.assertRaises(ValueError):lab['check'](root)
   input_path.write_bytes(original_bytes)
   (root/'reports/note.txt').chmod(0o644)
   with self.assertRaises(ValueError):lab['check'](root)
 def test_linux_reject_symlinks_special_and_large_files(self):
  import tempfile,os
  lab=self.linux_lab()
  with tempfile.TemporaryDirectory() as folder:
   root=lab['initialize'](Path(folder)/'lab');self.linux_reference(root)
   note=root/'reports/note.txt';original=note.read_text();note.unlink()
   outside=Path(folder)/'outside';outside.write_text(original);note.symlink_to(outside)
   with self.assertRaises(ValueError):lab['check'](root)
   note.unlink();os.mkfifo(note)
   with self.assertRaises(ValueError):lab['check'](root)
   note.unlink();note.write_text('x'*(1024*1024+1));note.chmod(0o600)
   with self.assertRaises(ValueError):lab['check'](root)
 def test_linux_status_semantics(self):
  import tempfile
  lab=self.linux_lab()
  with tempfile.TemporaryDirectory() as folder:
   root=lab['initialize'](Path(folder)/'lab')
   for command,code in [("grep '^FATAL ' input/events.log",1),("grep '^ERROR ' missing.log | wc -l",0),("set -o pipefail; grep '^ERROR ' missing.log | wc -l",2)]:
    run=subprocess.run(['bash','--noprofile','--norc','-c',command],cwd=root,capture_output=True,text=True)
    self.assertEqual(run.returncode,code,run.stderr)
 def test_linux_exports_and_specific_rubrics(self):
  import zipfile
  c=json.loads((D/'linux-packs.json').read_text())['courses'][0]
  bank={e['id']:e for e in json.loads((O/'answer-bank.json').read_text())['entries']}
  self.assertEqual(len(c['lessons']),8);self.assertEqual(len(c['questions']),12)
  self.assertEqual(len({r['text'] for r in c['outcomes']}),8)
  for q in c['questions']:
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:
    self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  self.assertIn('Всего 36; учебный ориентир 27',(O/'linux-files-practice.md').read_text())
  with zipfile.ZipFile(O/'learning-library.zip') as archive:
   for name in ['linux-lab.py','linux-reference.sh','linux-lab-guide.md','linux-command-journal.csv','linux-files-practice.html']:
    self.assertIn(name,archive.namelist())
  for name in ['linux-lab.py','linux-reference.sh','linux-lab-guide.md']:
   self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
 def test_missing_lesson_solution_rejected(self):
  data=all_packs(); ids={c['id'] for c in data['courses']}
  data['courses'][0]['lessons'][0]['exercise_answer']=''
  with self.assertRaises(ValueError):validate_packs(data,ids)
 def test_accounting_chain(self):
  cash=100000;materials=0;liabilities=0;capital=100000
  cash-=30000;materials+=30000
  materials+=20000;liabilities+=20000
  self.assertEqual(cash+materials,liabilities+capital)
  cash+=40000;materials-=10000;capital+=30000
  cash-=15000;liabilities-=15000
  cash+=12000;liabilities+=12000
  self.assertEqual((cash,materials,liabilities,capital),(107000,40000,17000,130000))
  self.assertEqual(cash+materials,147000)
  self.assertEqual(cash+materials,liabilities+capital)
  self.assertEqual(106500-cash,-500)
 def test_marketplace_model(self):
  initial=2000-900-2000*.15-150-50-200
  discounted=1800-900-1800*.15-150-50-200
  self.assertEqual((initial,discounted),(400,230))
  self.assertEqual((initial-discounted)/initial,.425)
  self.assertEqual(18-3,15)
  self.assertAlmostEqual(3/18*100,16.6666666667)
 def test_food_case_is_arithmetic_not_safety(self):
  net=10*.8;output=net*.75;portions=output/.15
  self.assertEqual((net,output,portions),(8,6,40))
  self.assertAlmostEqual(50*.15/(.8*.75),12.5)
  self.assertEqual((10*300/portions,75/250,250-75),(75,.3,175))
  self.assertEqual(18/20,.9)
 def test_design_pilot(self):
  self.assertEqual(4/5,.8)
  design=next(c for c in all_packs()['courses'] if c['id']=='D30-C02')
  self.assertIn('не полный аудит WCAG',design['sources'][0]['use'])
 def test_history_is_visible(self):
  text=(O/'review-ledger.html').read_text()
  self.assertIn('Добавлены отдельные разборы заданий',text)
if __name__=='__main__':unittest.main()
