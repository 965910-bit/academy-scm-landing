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
  self.assertEqual(sum(c['status']=='planned' for c in courses),49)
  self.assertEqual(sum(c['status']=='introductory_written_unreviewed' for c in courses),67)
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
  self.assertEqual(len(packs['courses']),67)
  for c in packs['courses']:
   self.assertEqual(len(c['lessons']),8 if c['id'] in {'D07-C01','D09-C02','D28-C04','D09-C04','D10-C04'} else 4)
   self.assertEqual(len(c['questions']),12 if c['id'] in {'D07-C01','D09-C02'} else 10 if c['id'] in {'D28-C04','D09-C04','D10-C04'} else 6)
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
 def visualization_rows(self):
  return list(csv.DictReader((D/'labs/visualization-case.csv').read_text(encoding='utf-8-sig').splitlines()))
 def visualization_aggregate(self,rows):
  received=sum(int(r['received']) for r in rows)
  if not received or any(r['closed']=='' for r in rows):return None
  if any(not 0<=int(r['closed'])<=int(r['received']) for r in rows):raise ValueError('Invalid cohort count')
  return sum(int(r['closed']) for r in rows)/received*100
 def test_visualization_denominators_and_missing(self):
  rows=self.visualization_rows()
  self.assertEqual(len({(r['month'],r['site']) for r in rows}),len(rows))
  jan=[r for r in rows if r['month']=='2026-01'];feb=[r for r in rows if r['month']=='2026-02'];march=[r for r in rows if r['month']=='2026-03']
  self.assertEqual([self.visualization_aggregate(x) for x in [jan,feb,jan+feb]],[90,90,90])
  self.assertEqual((sum(int(r['closed']) for r in jan),sum(int(r['closed']) for r in feb)),(108,126))
  self.assertAlmostEqual((126-108)/108*100,16.6666666667)
  self.assertIsNone(self.visualization_aggregate(march))
  self.assertEqual(sum(int(r['received']) for r in march),150)
  self.assertEqual(99/150*100,66);self.assertAlmostEqual(139/150*100,92.6666666667)
  self.assertEqual(len([r for r in rows if r['closed']=='']),1)
  completed=copy.deepcopy(march)
  next(r for r in completed if r['site']=='B')['closed']='36'
  self.assertEqual(self.visualization_aggregate(completed),90)
  next(r for r in completed if r['site']=='B')['closed']='0'
  self.assertEqual(self.visualization_aggregate(completed),66)
  next(r for r in completed if r['site']=='B')['closed']='41'
  with self.assertRaises(ValueError):self.visualization_aggregate(completed)
  self.assertIsNone(self.visualization_aggregate([{'received':'0','closed':'0'}]))
  self.assertIsNone(self.visualization_aggregate(march))
  counter=[{'received':'10','closed':'9'},{'received':'100','closed':'10'}]
  self.assertAlmostEqual(self.visualization_aggregate(counter),17.2727272727)
  self.assertEqual((90+10)/2,50)
 def test_visualization_example_structure_and_geometry(self):
  from xml.etree import ElementTree as ET
  text=(O/'visualization-example.html').read_text();svg=text[text.index('<svg '):text.index('</svg>')+6];root=ET.fromstring(svg)
  self.assertEqual(root.attrib['role'],'img')
  self.assertTrue(root.find('title').text);self.assertTrue(root.find('desc').text)
  ids={node.attrib['id'] for node in root.iter() if 'id' in node.attrib}
  self.assertTrue(set(root.attrib['aria-labelledby'].split())<=ids)
  bars=list(root.iter('rect'));self.assertEqual(len(bars),2)
  for bar in bars:
   self.assertEqual(int(bar.attrib['x']),80);self.assertEqual(int(bar.attrib['width'])/500,.9)
  for phrase in ['0–100%','72 / 80','54 / 60','scope="col"','scope="row"','<caption>','id="data"','aria-labelledby','полный аудит']:self.assertIn(phrase,text)
  for forbidden in ['<script','<iframe','<form','https://','http://','@import']:self.assertNotIn(forbidden,text)
 def test_visualization_resource_filenames(self):
  pack=json.loads((D/'visualization-packs.json').read_text())
  validate_packs(pack,{'D07-C03'})
  for name in ['../escape.html','folder/escape.html','folder\\escape.html','example.html.js','example.svg','']:
   changed=copy.deepcopy(pack);changed['courses'][0]['resources'][2]['filename']=name
   with self.assertRaises(ValueError,msg=name):validate_packs(changed,{'D07-C03'})
 def test_visualization_exports_and_reviews(self):
  import zipfile
  c=json.loads((D/'visualization-packs.json').read_text())['courses'][0]
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['data-visualisation.html','data-visualisation.md','visualization-publication-card.csv','D07-C03.json','visualization-case.csv','visualization-guide.md','visualization-example.html']
  with zipfile.ZipFile(O/'learning-library.zip') as z:
   for name in names:self.assertIn(name,z.namelist())
  for name in names[-3:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  for value in ['16,67%','0 п.п.','234/260','92,67%','17,27%','24','18']:self.assertIn(value,(O/'data-visualisation.md').read_text())
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def bi_lab(self):
  import runpy
  lab=runpy.run_path(str(D/'labs/bi-lab.py'))
  data=[lab['read_csv'](D/'labs',n) for n in ['bi-products.csv','bi-sales.csv','bi-returns.csv']]
  return lab,data
 def test_bi_grain_join_fanout_and_filter_context(self):
  lab,data=self.bi_lab();report=lab['calculate'](*data)
  self.assertEqual(report['source_counts'],dict(sales_lines=6,products=2,return_events=3))
  self.assertEqual(report['naive_join'],dict(rows=7,gross_rub=11500,returns_rub=2000,incorrect_net_rub=9500))
  self.assertEqual(report['all'],dict(rows=6,gross_rub=9500,returns_rub=2000,net_rub=7500,orders=4,average_net_per_order_rub=1875))
  self.assertEqual([r['net_rub'] for r in report['by_sale_month'].values()],[2500,5000])
  self.assertEqual([r['net_rub'] for r in report['by_site'].values()],[3500,4000])
  cats=report['by_category'];self.assertEqual([r['net_rub'] for r in cats.values()],[4000,3500])
  self.assertEqual([r['orders'] for r in cats.values()],[3,3])
  self.assertEqual(report['feb_A']['net_rub'],2000);self.assertEqual(report['feb_A']['orders'],1)
  empty=report['feb_A_equipment'];self.assertEqual((empty['rows'],empty['net_rub'],empty['orders']),(0,0,0));self.assertIsNone(empty['average_net_per_order_rub'])
  self.assertEqual(report['alternative_event_month_net_rub'],{'2026-01':3000,'2026-02':4500})
  self.assertEqual(sum(report['alternative_event_month_net_rub'].values()),report['all']['net_rub'])
  self.assertEqual(report['all']['net_rub']/report['all']['rows'],1250)
 def test_bi_mutations_and_integrity_contract(self):
  lab,data=self.bi_lab();calculate=lab['calculate']
  no_returns=copy.deepcopy(data);no_returns[2]=[];r=calculate(*no_returns)
  self.assertEqual(r['all']['net_rub'],9500);self.assertEqual(r['naive_join']['rows'],6)
  added=copy.deepcopy(data);added[2].append(dict(return_id='R04',line_id='L02',return_month='2026-02',amount_rub='100'));r=calculate(*added)
  self.assertEqual((r['all']['returns_rub'],r['all']['net_rub'],r['all']['average_net_per_order_rub']),(2100,7400,1850))
  self.assertEqual([v['net_rub'] for v in r['by_sale_month'].values()],[2400,5000])
  for table,index,key,value in [(0,1,'product_id','P1'),(1,1,'line_id','L01'),(2,1,'return_id','R01'),(1,0,'product_id','UNKNOWN'),(2,0,'line_id','UNKNOWN'),(1,1,'site','B'),(1,0,'amount_rub',''),(1,0,'qty','0'),(2,0,'amount_rub','2500'),(2,0,'amount_rub','-1'),(1,0,'amount_rub','1.5'),(2,2,'return_month','2026-01'),(1,0,'sale_month','2026-03')]:
   changed=copy.deepcopy(data);changed[table][index][key]=value
   with self.assertRaises(ValueError,msg=(table,index,key,value)):calculate(*changed)
  changed=copy.deepcopy(data);changed[1][0]['unexpected']='x'
  with self.assertRaises(ValueError):calculate(*changed)
  self.assertEqual(calculate(*data)['all']['net_rub'],7500)
 def test_bi_cli_reproducible_readonly_with_space_path(self):
  import tempfile
  names=['bi-products.csv','bi-sales.csv','bi-returns.csv','bi-lab.py']
  with tempfile.TemporaryDirectory(prefix='BI lab ') as folder:
   root=Path(folder)
   for name in names:(root/name).write_bytes((D/'labs'/name).read_bytes())
   before={p.name:p.read_bytes() for p in root.iterdir()}
   command=[sys.executable,str(root/'bi-lab.py'),'--directory',str(root)]
   first=subprocess.run(command,capture_output=True,text=True,timeout=10)
   second=subprocess.run(command,capture_output=True,text=True,timeout=10)
   self.assertEqual(first.returncode,0,first.stderr);self.assertEqual(second.returncode,0,second.stderr);self.assertEqual(first.stdout,second.stdout)
   self.assertIn('"net_rub": 7500',first.stdout)
   self.assertEqual({p.name:p.read_bytes() for p in root.iterdir()},before)
   (root/'bi-products.csv').write_text('product_id,category,unexpected\nP1,x,y\n')
   bad=subprocess.run(command,capture_output=True,text=True,timeout=10)
   self.assertNotEqual(bad.returncode,0);self.assertIn('Validation failed',bad.stderr)
 def test_bi_exports_rubrics_and_pending_reviews(self):
  import zipfile
  c=json.loads((D/'bi-packs.json').read_text())['courses'][0]
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  for q in c['questions']:
   self.assertEqual(set(q['scoring']),{'0','1','2'})
   for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
  names=['bi-model-validation.html','bi-model-validation.md','bi-validation-card.csv','D07-C04.json','bi-products.csv','bi-sales.csv','bi-returns.csv','bi-lab.py','bi-guide.md']
  with zipfile.ZipFile(O/'learning-library.zip') as z:
   for name in names:self.assertIn(name,z.namelist())
  for name in names[4:]:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  for text in ['11500','7500','1875','2500/5000','3000/4500','24','18']:self.assertIn(text,(O/'bi-model-validation.md').read_text())
  entry=next(r for r in json.loads((D/'review-ledger.json').read_text())['materials'] if r['id']==c['id'])
  for stage in ['subject_review','legal_review','answer_review','pilot']:
   self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def router_lab(self):
  import runpy
  lab=runpy.run_path(str(D/'labs/testing-router.py'))
  return lab,lab['load_cases'](D/'labs/testing-cases.csv')
 def test_testing_reference_buggy_and_independent_mutations(self):
  import io
  self.assertIn('type(value) is int',(O/'software-testing-boundaries.md').read_text())
  self.assertNotIn('type(value)isint',(O/'software-testing-boundaries.md').read_text())
  lab,cases=self.router_lab();self.assertEqual(len(cases),12)
  def run(fn):return unittest.TextTestRunner(stream=io.StringIO()).run(lab['make_suite'](fn,cases))
  ref=run(lab['route_reference']);self.assertTrue(ref.wasSuccessful());self.assertEqual(ref.testsRun,12)
  buggy=run(lab['route_buggy']);self.assertEqual({t._testMethodName for t,_ in buggy.failures},{'test_T03','test_T11','test_T12'});self.assertFalse(buggy.errors)
  def threshold_only(value):
   if type(value) is not int:raise TypeError()
   if not 0<=value<=1000000:raise ValueError()
   return 'manager' if value>100000 else 'operator'
  def bool_only(value):
   if not isinstance(value,int):raise TypeError()
   if not 0<=value<=1000000:raise ValueError()
   return 'manager' if value>=100000 else 'operator'
  self.assertEqual({t._testMethodName for t,_ in run(threshold_only).failures},{'test_T03'})
  self.assertEqual({t._testMethodName for t,_ in run(bool_only).failures},{'test_T11','test_T12'})
  self.assertEqual((12-len(buggy.failures))/12*100,75)
 def test_testing_cli_codes_readonly_and_invalid_cases(self):
  import tempfile
  with tempfile.TemporaryDirectory(prefix='Testing lab ') as folder:
   root=Path(folder)
   for name in ['testing-router.py','testing-cases.csv']:(root/name).write_bytes((D/'labs'/name).read_bytes())
   before={p.name:p.read_bytes() for p in root.iterdir()}
   for implementation,code,expected in [('reference',0,'OK'),('buggy',1,'FAILED (failures=3)')]:
    result=subprocess.run([sys.executable,str(root/'testing-router.py'),'--implementation',implementation],capture_output=True,text=True,timeout=10)
    self.assertEqual(result.returncode,code,result.stderr);self.assertIn(expected,result.stderr);self.assertIn('Ran 12 tests',result.stderr)
   self.assertEqual({p.name:p.read_bytes() for p in root.iterdir()},before)
   (root/'testing-cases.csv').write_text('case_id,input_json,expected_value,expected_error\n')
   result=subprocess.run([sys.executable,str(root/'testing-router.py')],capture_output=True,text=True,timeout=10)
   self.assertEqual(result.returncode,2);self.assertIn('No cases',result.stderr)
 def test_business_analysis_boundaries_resource_and_change(self):
  lab,_=self.router_lab();rows=list(csv.DictReader((D/'labs/business-analysis-cases.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual(len(rows),6)
  results=[]
  for r in rows:
   try:actual=lab['route_reference'](int(r['amount_rub']))
   except (TypeError,ValueError):actual='reject'
   self.assertEqual(actual,r['expected_route']);results.append(actual)
  self.assertEqual(results,['operator','manager','manager','operator','reject','reject'])
  base=120*6;current=120*2+30*4;gain=base-current
  self.assertEqual((base,current,gain,600+current-base),(720,360,360,240))
  from math import ceil
  self.assertEqual(ceil(600/gain),2)
  changed=120*2+30*8;self.assertEqual((changed,base-changed,ceil(600/(base-changed))),(480,240,3))
  self.assertEqual(['manager' if x>=120000 else 'operator' for x in [99999,100000,100001,119999,120000,120001]],['operator','operator','operator','operator','manager','manager'])
 def test_ai_claim_statuses_calculations_and_limits(self):
  claims=list(csv.DictReader((D/'labs/ai-claims.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual([r['claim_id'] for r in claims],['C01','C02','C03','C04','C05','C06'])
  evidence=(D/'labs/ai-evidence.md').read_text()
  statuses={line.split('|')[1].strip():line.split('|')[2].strip() for line in evidence.splitlines() if line.startswith('| C')}
  self.assertEqual(statuses,dict(C01='supported',C02='contradicted',C03='insufficient',C04='insufficient',C05='contradicted',C06='insufficient'))
  self.assertEqual([list(statuses.values()).count(x) for x in ['supported','contradicted','insufficient']],[1,2,3])
  self.assertAlmostEqual((126-108)/108*100,16.6666666667);self.assertEqual(126/140*100-108/120*100,0)
  self.assertEqual((99+36)/150*100,90);self.assertEqual((99+0)/150*100,66)
  manual=30/60*600;checked=20+(5+15+10)/60*600;optimistic=20+(5+5+10)/60*600
  self.assertEqual((manual,checked,optimistic,checked-manual,manual-optimistic),(300,320,220,20,80))
  for phrase in ['не вывод реального сервиса','не оценка','не правовая экспертиза','Недостаточно']:
   self.assertIn(phrase.lower(),(evidence+(D/'labs/ai-verification-guide.md').read_text()).lower())
 def test_three_new_course_exports_rubrics_and_pending_reviews(self):
  import zipfile
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']}
  ledger=json.loads((D/'review-ledger.json').read_text())
  for name in ['business-analysis-packs.json','ai-verification-packs.json','testing-packs.json']:
   c=json.loads((D/name).read_text())['courses'][0]
   for q in c['questions']:
    self.assertEqual(set(q['scoring']),{'0','1','2'})
    for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
   names=[c['slug']+'.html',c['slug']+'.md',c['id']+'.json',c['template']['filename'],*[r['filename'] for r in c['resources']]]
   with zipfile.ZipFile(O/'learning-library.zip') as z:
    for file in names:self.assertIn(file,z.namelist())
   for r in c['resources']:self.assertEqual((D/'labs'/r['filename']).read_bytes(),(O/r['filename']).read_bytes())
   entry=next(r for r in ledger['materials'] if r['id']==c['id'])
   for stage in ['subject_review','legal_review','answer_review','pilot']:
    self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
 def test_remaining_65_plan_never_grants_completion(self):
  import tempfile
  from learning_completion_plan import render_completion_plan
  source=json.loads((D/'remaining-65-plan.json').read_text());current=json.loads((D/'catalog.json').read_text())['directions']
  result=json.loads((O/'remaining-65-plan.json').read_text())
  self.assertEqual(result['progress'],dict(baseline_titles=65,still_planned=49,introductions_written_unreviewed=16,full_completion_demonstrated=0))
  self.assertEqual(len({r['id'] for r in result['courses']}),65)
  self.assertEqual({r['full_completion'] for r in result['courses']},{'not_demonstrated'})
  self.assertEqual({r['id'] for r in result['courses'] if r['introduction_url']},{'D07-C05','D08-C02','D08-C03','D08-C04','D08-C05','D10-C02','D10-C03','D10-C04','D21-C03','D28-C03','D29-C01','D29-C03','D19-C02','D19-C04','D09-C04','D28-C04'})
  for r in result['courses']:
   for key in ['content_to_develop','practice_evidence_to_obtain','blocking_limits']:self.assertGreater(len(r[key]),20)
  with tempfile.TemporaryDirectory() as folder:
   broken=copy.deepcopy(source);broken['courses'][1]['id']=broken['courses'][0]['id']
   with self.assertRaises(ValueError):render_completion_plan(broken,current,Path(folder),lambda title,body:body)
   broken=copy.deepcopy(source);broken['courses'][0]['practice_evidence_to_obtain']=''
   with self.assertRaises(ValueError):render_completion_plan(broken,current,Path(folder),lambda title,body:body)
  import zipfile
  with zipfile.ZipFile(O/'learning-library.zip') as z:
   for suffix in ['html','md','json','csv']:self.assertIn('remaining-65-plan.'+suffix,z.namelist())
  self.assertIn('remaining-65-plan.html',(O/'index.html').read_text())
 def application_lab(self):
  import runpy
  lab=runpy.run_path(str(D/'labs/application-lab.py'))
  return lab,lab['load_request'](D/'labs/application-request.json')
 def test_application_contract_arithmetic_and_mutations(self):
  lab,request=self.application_lab();before=copy.deepcopy(request);result=lab['calculate'](request)
  self.assertEqual(result,dict(currency='RUB',line_count=3,lines=[dict(line_id='L01',amount_kopecks=25100),dict(line_id='L02',amount_kopecks=29970),dict(line_id='L03',amount_kopecks=0)],total_kopecks=55070))
  self.assertEqual(request,before)
  for key,value in [('qty',True),('qty',0),('qty',1001),('qty',1.5),('unit_price_kopecks',-1),('unit_price_kopecks',True),('unit_price_kopecks',1.5),('unit_price_kopecks',100000001),('line_id','L01')]:
   changed=copy.deepcopy(request);changed['lines'][1][key]=value
   with self.assertRaises(ValueError,msg=(key,value)):lab['calculate'](changed)
  for changed in [[],{},dict(currency='USD',lines=request['lines']),dict(currency='RUB',lines=[]),dict(request,extra=1),dict(request,lines=[dict(request['lines'][0],discount=1)])]:
   with self.assertRaises(ValueError):lab['calculate'](changed)
  maximum=dict(currency='RUB',lines=[dict(line_id=f'L{i:02}',qty=1000,unit_price_kopecks=100000000) for i in range(100)])
  self.assertEqual(lab['calculate'](maximum)['total_kopecks'],10000000000000)
  maximum['lines'].append(dict(line_id='L00',qty=1,unit_price_kopecks=0))
  with self.assertRaises(ValueError):lab['calculate'](maximum)
 def test_application_cli_json_limits_codes_and_readonly(self):
  import tempfile
  lab,request=self.application_lab();payload=json.dumps(request)
  with tempfile.TemporaryDirectory(prefix='Application lab ') as folder:
   root=Path(folder)
   for n in ['application-lab.py','application-request.json']:(root/n).write_bytes((D/'labs'/n).read_bytes())
   before={p.name:p.read_bytes() for p in root.iterdir()}
   command=[sys.executable,str(root/'application-lab.py')]
   a=subprocess.run(command,capture_output=True,text=True,timeout=10);b=subprocess.run(command,capture_output=True,text=True,timeout=10)
   self.assertEqual((a.returncode,b.returncode),(0,0));self.assertEqual(a.stdout,b.stdout);self.assertEqual(json.loads(a.stdout)['total_kopecks'],55070)
   self.assertEqual({p.name:p.read_bytes() for p in root.iterdir()},before)
   bad=root/'bad request.json'
   for text in ['{','{"currency":"RUB","currency":"USD","lines":[]}','{"currency":"RUB","lines":[NaN]}',json.dumps(dict(request,lines=[dict(request['lines'][0]),dict(request['lines'][1],qty=True)])),payload+' '*65536]:
    bad.write_text(text)
    p=subprocess.run(command+['--input',str(bad)],capture_output=True,text=True,timeout=10)
    self.assertEqual(p.returncode,2,p.stderr);self.assertEqual(p.stdout,'');self.assertIn('Request rejected',p.stderr)
   bad.write_text(payload+' '*(65536-len(payload.encode())))
   self.assertEqual(lab['calculate'](lab['load_request'](bad))['total_kopecks'],55070)
   bad.write_text(payload+' '*(65537-len(payload.encode())))
   with self.assertRaises(ValueError):lab['load_request'](bad)
 def database_lab(self):
  import runpy
  return runpy.run_path(str(D/'labs/database-transactions-lab.py'))
 def test_database_atomic_state_and_full_rollback(self):
  import sqlite3
  lab=self.database_lab();db=lab['connect']()
  try:
   lab['initialize'](db);self.assertEqual(lab['state'](db),dict(stock=[['B1','SKU1',10],['B2','SKU1',3]],movements=[]))
   lab['transfer'](db,'M01','B1','B2','SKU1',4);expected=dict(stock=[['B1','SKU1',6],['B2','SKU1',7]],movements=[['M01','B1','B2','SKU1',4]])
   self.assertEqual(lab['state'](db),expected)
   with self.assertRaises(RuntimeError):lab['transfer'](db,'M02','B1','B2','SKU1',2,True)
   self.assertEqual(lab['state'](db),expected);self.assertFalse(db.in_transaction)
   for args in [('M03','B1','B2','SKU1',7),('M01','B1','B2','SKU1',1),('M04','B1','UNKNOWN','SKU1',1),('M05','B1','B2','BAD',1),('M06','B1','B2','SKU1',True),('M07','B1','B1','SKU1',1)]:
    with self.assertRaises((ValueError,sqlite3.IntegrityError)):lab['transfer'](db,*args)
    self.assertEqual(lab['state'](db),expected);self.assertFalse(db.in_transaction)
   lab['transfer'](db,'M08','B1','B2','SKU1',6)
   self.assertEqual(lab['state'](db)['stock'],[['B1','SKU1',0],['B2','SKU1',13]])
  finally:db.close()
 def test_database_constraints_and_connection_fk(self):
  import sqlite3
  lab=self.database_lab();db=lab['connect']()
  try:
   lab['initialize'](db);self.assertEqual(db.execute('PRAGMA foreign_keys').fetchone(),(1,))
   before=lab['state'](db)
   for sql,params in [('INSERT INTO stock VALUES (?,?,?)',('BAD','SKU1',1)),('INSERT INTO stock VALUES (?,?,?)',('B1','BAD',1)),('UPDATE stock SET quantity=? WHERE bin_id=?',(-1,'B1')),('UPDATE stock SET quantity=? WHERE bin_id=?',(1.5,'B1')),('UPDATE stock SET quantity=? WHERE bin_id=?',(None,'B1')),('INSERT INTO bins VALUES (?)',('B1',)),('INSERT INTO bins VALUES (?)',(None,)),('DELETE FROM products WHERE sku=?',('SKU1',))]:
    with self.assertRaises(sqlite3.IntegrityError,msg=(sql,params)):db.execute(sql,params)
    self.assertEqual(lab['state'](db),before)
   self.assertEqual(list(db.execute('PRAGMA foreign_key_check')),[])
   self.assertEqual(db.execute('PRAGMA integrity_check').fetchone(),('ok',))
   self.assertEqual(lab['writer_lock_demo'](db),dict(second_writer_busy=True,writer_allowed_after_rollback=True,source_unchanged=True))
   self.assertEqual(lab['state'](db),before)
  finally:db.close()
 def test_database_cli_reproducibility_and_report(self):
  import tempfile
  with tempfile.TemporaryDirectory(prefix='Database lab ') as folder:
   root=Path(folder);script=root/'database-transactions-lab.py';script.write_bytes((D/'labs'/script.name).read_bytes());before=script.read_bytes()
   command=[sys.executable,str(script)]
   a=subprocess.run(command,capture_output=True,text=True,timeout=10);b=subprocess.run(command,capture_output=True,text=True,timeout=10)
   self.assertEqual((a.returncode,b.returncode),(0,0),a.stderr+b.stderr);self.assertEqual(a.stdout,b.stdout)
   report=json.loads(a.stdout)
   self.assertEqual(report['after_success']['stock'],[['B1','SKU1',6],['B2','SKU1',7]])
   self.assertEqual(report['after_success'],report['after_injected_failure'])
   self.assertEqual(report['rejected_without_changes'],['overdraw','duplicate_id','unknown_destination'])
   self.assertTrue(report['logical_backup_matches']);self.assertEqual(report['foreign_key_check'],[]);self.assertEqual(report['integrity_check'],'ok');self.assertEqual(report['schema_version'],1)
   self.assertEqual(script.read_bytes(),before);self.assertEqual([p.name for p in root.iterdir()],[script.name])
 def test_application_database_exports_reviews_and_roadmap(self):
  import zipfile
  bank={r['id']:r for r in json.loads((O/'answer-bank.json').read_text())['entries']};ledger=json.loads((D/'review-ledger.json').read_text())
  for filename in ['application-development-packs.json','database-packs.json']:
   c=json.loads((D/filename).read_text())['courses'][0]
   for q in c['questions']:
    self.assertEqual(set(q['scoring']),{'0','1','2'})
    for text in [*q['acceptable_alternatives'],*q['scoring'].values()]:self.assertIn(text,bank[c['id']+'-'+q['id']]['explanation'])
   names=[c['slug']+'.html',c['slug']+'.md',c['id']+'.json',c['template']['filename'],*[r['filename'] for r in c['resources']]]
   with zipfile.ZipFile(O/'learning-library.zip') as z:
    for name in names:self.assertIn(name,z.namelist())
   for r in c['resources']:self.assertEqual((D/'labs'/r['filename']).read_bytes(),(O/r['filename']).read_bytes())
   entry=next(r for r in ledger['materials'] if r['id']==c['id'])
   for stage in ['subject_review','legal_review','answer_review','pilot']:
    self.assertEqual(entry[stage]['status'],'pending');self.assertIsNone(entry[stage]['reviewer'])
   roadmap=json.loads((O/'remaining-65-plan.json').read_text());r=next(r for r in roadmap['courses'] if r['id']==c['id']);self.assertEqual(r['full_completion'],'not_demonstrated');self.assertEqual(r['introduction_url'],c['slug']+'.html')
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
  self.assertEqual(progress['lessons'],291)
  self.assertEqual(progress['open_answers'],434)
  self.assertEqual(progress['materials'],68)
  self.assertEqual(progress['planned'],49)
  self.assertEqual(progress['expert_approved'],0)
  self.assertEqual((O/'progress.json').read_bytes(),(D/'progress.json').read_bytes())
  hub=(O/'index.html').read_text()
  for text in ['291 уроков','434 ответов на контрольные вопросы','49 курсов','291 разборов заданий']:self.assertIn(text,hub)
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
  self.assertEqual(len(ledger['materials']),68)
  self.assertEqual((O/'review-checklist.md').read_bytes(),(D/'review-checklist.md').read_bytes())
  for m in ledger['materials']:
   for stage in ['subject_review','legal_review','answer_review','pilot']:
    self.assertEqual(m[stage]['status'],'pending')
    self.assertIsNone(m[stage]['reviewer'])
  rows=list(csv.DictReader((O/'review-ledger.csv').read_text(encoding='utf-8-sig').splitlines()))
  self.assertEqual(len(rows),272)
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
  self.assertEqual(count,291)
  self.assertEqual(json.loads((O/'progress.json').read_text())['lesson_solutions'],count)
 def test_answer_bank(self):
  data=json.loads((O/'answer-bank.json').read_text())
  self.assertEqual(data['counts'],dict(question=434,exercise=291,practice=68))
  self.assertEqual(len({r['id'] for r in data['entries']}),793)
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
 def test_ai_role_independent_oracles(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('ai_roles',D/'labs/ai-role-labs.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  f=m.read_rows(D/'labs','finance');r=m.finance(f)
  self.assertEqual((r['plan_profit_rub'],r['actual_profit_rub'],r['profit_delta_rub']),(200000,240000,40000))
  self.assertEqual([x['favorable_effect_rub'] for x in r['variances']],[100000,-70000,0,10000])
  self.assertAlmostEqual(r['margin_delta_pp'],20/11)
  f[0]['plan_rub']='0';r=m.finance(f);self.assertIsNone(r['plan_margin_percent']);self.assertIsNone(r['profit_growth_percent'])
  p=m.read_rows(D/'labs','procurement');self.assertEqual(m.procurement(p)['minimum_eligible_ids'],['A'])
  self.assertEqual(m.procurement(p,3)['minimum_eligible_ids'],['B'])
  p[2]['evidence']='verified';self.assertEqual(m.procurement(p)['minimum_eligible_ids'],['C'])
  for row in p:row['evidence']='unknown'
  self.assertIsNone(m.procurement(p)['minimum_eligible_total_rub'])
  p=m.read_rows(D/'labs','procurement');p[1].update(unit_rub='1000',delivery_rub='5000',inspection_rub='0')
  self.assertEqual(m.procurement(p)['minimum_eligible_ids'],['A','B'])
  rows=m.read_rows(D/'labs','manager');r=m.manager(rows)
  self.assertEqual(r['loads_with_review_minutes'],{'A':270,'B':180});self.assertFalse(r['feasible'])
  r=m.manager(rows,True);self.assertTrue(r['feasible']);self.assertEqual(r['loads_with_review_minutes'],{'A':240,'B':180})
  rows[1]['proposed_owner']='B';self.assertEqual(m.manager(rows)['deficit_minutes'],{'A':0,'B':120})
  rows[2]['proposed_owner']='A'
  with self.assertRaises(ValueError):m.manager(rows)
  for case,fn in [('finance',m.finance),('procurement',m.procurement),('manager',m.manager)]:
   rows=m.read_rows(D/'labs',case)
   with self.assertRaises(ValueError):fn(rows+[rows[0]])
   for bad in ['-1','NaN','1.2','10000001','']:
    changed=copy.deepcopy(rows);changed[0][m.FILES[case][1][1 if case=='manager' else 2]]=bad
    with self.assertRaises(ValueError):fn(changed)
 def test_ai_role_cli_readonly_and_atomic_errors(self):
  import tempfile,hashlib
  lab=D/'labs/ai-role-labs.py'
  for name in ['ai-role-labs.py']+[f'ai-{case}-{suffix}' for case in ['finance','procurement','manager'] for suffix in ['case.csv','guide.md']]:
   self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  with tempfile.TemporaryDirectory(prefix='ai roles ') as folder:
   folder=Path(folder)
   for name in ['finance','procurement','manager']:(folder/f'ai-{name}-case.csv').write_bytes((D/f'labs/ai-{name}-case.csv').read_bytes())
   before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()}
   run=subprocess.run([sys.executable,str(lab),'--case','all','--directory',str(folder)],capture_output=True,text=True)
   self.assertEqual(run.returncode,0,run.stderr);self.assertEqual(set(json.loads(run.stdout)),{'finance','procurement','manager'})
   self.assertEqual(before,{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()})
   (folder/'ai-manager-case.csv').write_text('invalid\n')
   run=subprocess.run([sys.executable,str(lab),'--case','all','--directory',str(folder)],capture_output=True,text=True)
   self.assertEqual(run.returncode,2);self.assertEqual(run.stdout,'');self.assertIn('rejected',run.stderr)
   for case in ['finance','procurement']:
    run=subprocess.run([sys.executable,str(lab),'--case',case,'--directory',str(folder)],capture_output=True,text=True)
    self.assertEqual(run.returncode,0,run.stderr)

 def load_supplier_sales_lab(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('supplier_sales',D/'labs/supplier-sales-labs.py')
  m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  return m
 def test_supplier_independent_oracles_and_unknown(self):
  m=self.load_supplier_sales_lab();rows=m.rows(D/'labs','supplier-deliveries.csv')
  r=m.suppliers(rows)['suppliers'];a=r['A'];b=r['B']
  self.assertEqual((a['obligations'],a['on_time'],a['otif'],a['accepted']),(3,2,1,298))
  self.assertEqual((b['obligations'],b['on_time'],b['otif'],b['received'],b['accepted']),(3,3,2,190,190))
  self.assertAlmostEqual(a['otif_lower_percent'],100/3);self.assertAlmostEqual(b['otif_lower_percent'],200/3)
  self.assertEqual((a['ordered_value_share_percent'],b['ordered_value_share_percent']),(60,40))
  self.assertEqual((a['recorded_fill_percent'],b['recorded_fill_percent']),(100,95))
  rows[2].update(received_date='unknown',received_units='0',accepted_units='0')
  a=m.suppliers(rows)['suppliers']['A']
  self.assertEqual((a['known'],a['unknown'],a['otif_lower_percent'],a['recorded_fill_percent']),(2,1,0,50))
  self.assertAlmostEqual(a['otif_upper_percent'],100/3);self.assertAlmostEqual(a['on_time_upper_percent'],200/3)
  self.assertAlmostEqual(a['accepted_of_recorded_receipts_percent'],14800/150)
  for row in rows:
   row.update(received_date='unknown',received_units='0',accepted_units='0',unit_rub='0')
  for a in m.suppliers(rows)['suppliers'].values():
   self.assertEqual((a['otif_lower_percent'],a['otif_upper_percent']),(0,100))
   self.assertIsNone(a['accepted_of_recorded_receipts_percent']);self.assertIsNone(a['ordered_value_share_percent'])
 def test_supplier_rejects_invalid_evidence_without_mutation(self):
  m=self.load_supplier_sales_lab();rows=m.rows(D/'labs','supplier-deliveries.csv');before=copy.deepcopy(rows)
  for patch in [dict(received_date='2026-11-31'),dict(due_date='2026-11-11'),dict(received_date='2026-11-11'),dict(accepted_units='101'),dict(received_units='101'),dict(ordered_units='0'),dict(received_date='unknown'),dict(unit_rub='-1'),dict(unit_rub='NaN'),dict(unit_rub='10000001')]:
   bad=copy.deepcopy(rows);bad[0].update(patch)
   with self.assertRaises(ValueError,msg=str(patch)):m.suppliers(bad)
  with self.assertRaises(ValueError):m.suppliers(rows+[rows[0]])
  m.suppliers(rows);self.assertEqual(rows,before)
 def test_sales_independent_oracles_and_window(self):
  m=self.load_supplier_sales_lab();lines=m.rows(D/'labs','sales-lines.csv');returns=m.rows(D/'labs','sales-returns.csv');costs=m.rows(D/'labs','sales-channel-costs.csv')
  r=m.sales(lines,returns,costs);t=r['total'];a=r['channels']['direct'];b=r['channels']['market']
  self.assertEqual((t['gross_rub'],t['discount_rub'],t['refund_rub'],t['net_rub'],t['net_cost_rub']),(13000,1000,2900,9100,5500))
  self.assertEqual((t['contribution_before_channel_rub'],t['contribution_after_channel_rub'],t['orders'],t['average_order_rub']),(3600,1400,4,2275))
  self.assertEqual((a['net_rub'],a['net_cost_rub'],a['contribution_after_channel_rub'],a['average_order_rub']),(4600,2800,1100,2300))
  self.assertEqual((b['net_rub'],b['net_cost_rub'],b['contribution_after_channel_rub'],b['average_order_rub']),(4500,2700,300,2250))
  self.assertEqual((a['net_revenue_per_ad_ruble'],b['net_revenue_per_ad_ruble']),(9.2,15))
  self.assertAlmostEqual(t['refund_of_billed_percent'],2900/12000*100)
  t=m.sales(lines,returns[:1],costs)['total']
  self.assertEqual((t['net_rub'],t['net_cost_rub'],t['contribution_after_channel_rub'],t['average_order_rub']),(11100,6700,2200,2775))
  costs[0]['advertising_rub']='0';a=m.sales(lines,returns,costs)['channels']['direct']
  self.assertIsNone(a['net_revenue_per_ad_ruble']);self.assertEqual(a['contribution_after_channel_rub'],1600)
  for row in lines:row['unit_discount_rub']=row['unit_price_rub']
  t=m.sales(lines,[],costs)['total'];self.assertEqual(t['orders'],4);self.assertEqual(t['net_rub'],0);self.assertIsNone(t['refund_of_billed_percent'])
 def test_sales_integrity_rejections_multiple_returns_and_readonly(self):
  m=self.load_supplier_sales_lab();base=[m.rows(D/'labs',name) for name in ['sales-lines.csv','sales-returns.csv','sales-channel-costs.csv']];before=copy.deepcopy(base)
  m.sales(*base);self.assertEqual(base,before)
  for index,record,patch in [(0,0,dict(unit_discount_rub='1001')),(0,1,dict(channel='market')),(1,0,dict(line_id='missing')),(1,0,dict(units='4',refund_rub='3600')),(1,0,dict(refund_rub='901')),(1,0,dict(units='0',refund_rub='0')),(2,0,dict(advertising_rub='1.5'))]:
   bad=copy.deepcopy(base);bad[index][record].update(patch)
   with self.assertRaises(ValueError,msg=str(patch)):m.sales(*bad)
  for index in [0,1,2]:
   bad=copy.deepcopy(base);bad[index].append(copy.deepcopy(bad[index][0]))
   with self.assertRaises(ValueError):m.sales(*bad)
  bad=copy.deepcopy(base);bad[2].pop()
  with self.assertRaises(ValueError):m.sales(*bad)
  # Multiple uniquely keyed partial returns are legitimate, not duplicates.
  data=copy.deepcopy(base);data[1].append(dict(return_id='R03',line_id='L03',units='2',refund_rub='1800'))
  r=m.sales(*data);self.assertEqual(r['channels']['direct']['refund_rub'],2700);self.assertEqual(r['total']['orders'],4)
  data[1].append(dict(return_id='R04',line_id='L03',units='1',refund_rub='900'))
  with self.assertRaises(ValueError):m.sales(*data)
 def test_supplier_sales_published_files_cli_and_atomic_errors(self):
  import tempfile,hashlib
  names=['supplier-sales-labs.py','supplier-deliveries.csv','sales-lines.csv','sales-returns.csv','sales-channel-costs.csv','supplier-performance-guide.md','sales-channel-analytics-guide.md']
  for name in names:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  for slug in ['supplier-performance','sales-channel-analytics','ai-finance','ai-procurement','ai-manager']:
   self.assertIn('/'+slug+'.html',(R/'sitemap.xml').read_text())
  lab=D/'labs/supplier-sales-labs.py'
  with tempfile.TemporaryDirectory(prefix='supplier sales ') as folder:
   folder=Path(folder)
   for name in names[1:5]:(folder/name).write_bytes((D/'labs'/name).read_bytes())
   before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()}
   def run(case):return subprocess.run([sys.executable,str(lab),'--case',case,'--directory',str(folder)],capture_output=True,text=True)
   r=run('all');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(set(json.loads(r.stdout)),{'suppliers','sales'})
   self.assertEqual(before,{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()})
   (folder/'sales-returns.csv').write_text('wrong\n')
   r=run('all');self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'');self.assertIn('rejected',r.stderr)
   self.assertEqual(run('suppliers').returncode,0)
   (folder/'sales-returns.csv').write_text('return_id,line_id,units,refund_rub\n')
   self.assertEqual(run('sales').returncode,0)
   (folder/'supplier-deliveries.csv').unlink();self.assertEqual(run('sales').returncode,0)
   r=run('suppliers');self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'')

 def load_business_economics_lab(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('business_economics',D/'labs/business-economics-labs.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def test_startup_independent_oracles_and_cash_stresses(self):
  m=self.load_business_economics_lab();data=m.read_rows(D/'labs','startup-case.csv');before=copy.deepcopy(data);r=m.startup(data)
  self.assertEqual((r['unit_contribution_rub'],r['breakeven_units'],r['cash_after_setup_rub']),(3000,30,130000))
  self.assertEqual([x['operating_result_rub'] for x in r['months']],[-30000,0,30000])
  self.assertEqual([x['closing_cash_rub'] for x in r['months']],[50000,25000,30000])
  self.assertEqual([x['receivable_rub'] for x in r['months']],[50000,75000,100000])
  self.assertEqual(r['minimum_checkpoint_cash_rub'],25000);self.assertEqual(r['cumulative_operating_result_rub'],0);self.assertEqual(data,before)
  data[0]['collected_now_percent']='0';r=m.startup(data)
  self.assertEqual([x['closing_cash_rub'] for x in r['months']],[0,-50000,-70000]);self.assertEqual(r['extra_opening_cash_to_nonnegative_checkpoints_rub'],70000);self.assertEqual(r['cumulative_operating_result_rub'],0)
  data=copy.deepcopy(before);data[0]['unit_price_rub']='4500';r=m.startup(data)
  self.assertEqual((r['breakeven_units'],r['cumulative_operating_result_rub']),(36,-45000))
  self.assertEqual([x['closing_cash_rub'] for x in r['months']],[45000,7500,-5000]);self.assertEqual(r['extra_opening_cash_to_nonnegative_checkpoints_rub'],5000)
 def test_startup_zero_bases_capacity_and_initial_checkpoint(self):
  m=self.load_business_economics_lab();base=m.read_rows(D/'labs','startup-case.csv')
  for price in ['2000','1000']:
   data=copy.deepcopy(base);data[0]['unit_price_rub']=price;r=m.startup(data);self.assertIsNone(r['breakeven_units']);self.assertFalse(r['breakeven_within_capacity'])
  data=copy.deepcopy(base);data[0]['monthly_capacity']='25';r=m.startup(data);self.assertFalse(r['breakeven_within_capacity']);self.assertFalse(r['capacity_feasible']);self.assertEqual([x['capacity_feasible'] for x in r['months']],[True,False,False])
  data=copy.deepcopy(base);data[0].update(opening_cash_rub='0',monthly_fixed_rub='0',month1_units='0',month2_units='0',month3_units='0');r=m.startup(data)
  self.assertEqual(r['minimum_checkpoint_cash_rub'],-120000);self.assertEqual(r['extra_opening_cash_to_nonnegative_checkpoints_rub'],120000);self.assertEqual(r['breakeven_units'],0)
  data=copy.deepcopy(base);data[0].update(unit_price_rub='1',unit_variable_rub='0',monthly_fixed_rub='0',setup_cash_rub='0',opening_cash_rub='0',month1_units='1',month2_units='0',month3_units='0',collected_now_percent='33')
  r=m.startup(data);self.assertEqual([x['closing_cash_rub'] for x in r['months']],[.33,1,1]);self.assertEqual(r['months'][0]['receivable_rub'],.67)
 def test_department_independent_oracles_allocation_and_closure(self):
  m=self.load_business_economics_lab();data=m.read_rows(D/'labs','department-case.csv');before=copy.deepcopy(data);r=m.department(data)
  self.assertEqual([x['segment_result_rub'] for x in r['products']],[42000,50000]);self.assertEqual([x['allocated_result_rub'] for x in r['products']],[42000,-10000])
  self.assertEqual([x['contribution_per_minute_rub'] for x in r['products']],[60,50])
  t=r['totals'];self.assertEqual((t['revenue_rub'],t['variable_rub'],t['contribution_rub'],t['operating_result_rub'],t['minutes'],t['spare_minutes']),(220000,88000,132000,32000,2400,0));self.assertEqual(data,before)
  for row in data:row['allocated_common_rub']='30000'
  r=m.department(data);self.assertEqual([x['allocated_result_rub'] for x in r['products']],[12000,20000]);self.assertEqual(r['totals']['operating_result_rub'],32000)
  data=copy.deepcopy(before);data[1].update(units='0',allocated_common_rub='0');data[0]['allocated_common_rub']='60000'
  self.assertEqual(m.department(data)['totals']['operating_result_rub'],-28000)
  data[1]['direct_fixed_rub']='0';self.assertEqual(m.department(data)['totals']['operating_result_rub'],-18000)
  data[0]['units']='80';r=m.department(data);self.assertEqual(r['totals']['operating_result_rub'],54000);self.assertTrue(r['totals']['capacity_feasible'])
 def test_department_opportunity_cost_and_validation(self):
  m=self.load_business_economics_lab();base=m.read_rows(D/'labs','department-case.csv');data=copy.deepcopy(base);data[0]['units']='50'
  r=m.department(data);self.assertFalse(r['totals']['capacity_feasible']);self.assertEqual(r['totals']['deficit_minutes'],300);self.assertEqual(r['totals']['operating_result_rub'],50000)
  data[1]['units']='15';r=m.department(data);self.assertTrue(r['totals']['capacity_feasible']);self.assertEqual(r['totals']['operating_result_rub'],35000)
  for key,value in [('allocated_common_rub','1'),('minutes_per_unit','0'),('unit_variable_rub','NaN'),('units','-1'),('units','1.5'),('unit_price_rub','10000001')]:
   data=copy.deepcopy(base);data[0][key]=value
   with self.assertRaises(ValueError,msg=key+'='+value):m.department(data)
  with self.assertRaises(ValueError):m.department(base+[base[0]])
  data=copy.deepcopy(base);data[0]['unit_variable_rub']='4000';self.assertLess(m.department(data)['products'][0]['contribution_rub'],0)
  startup=m.read_rows(D/'labs','startup-case.csv')
  for key,value in [('collected_now_percent','101'),('monthly_capacity','0'),('month1_units',''),('unit_price_rub','True')]:
   data=copy.deepcopy(startup);data[0][key]=value
   with self.assertRaises(ValueError):m.startup(data)
  other=copy.deepcopy(startup[0]);other['scenario_id']='OTHER'
  with self.assertRaises(ValueError):m.startup(startup+[other])
 def test_business_economics_published_cli_readonly_and_atomic_error(self):
  import tempfile,hashlib
  names=['business-economics-labs.py','startup-case.csv','department-case.csv','business-launch-guide.md','department-economics-guide.md']
  for name in names:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  for slug in ['business-launch-validation','department-economics']:self.assertIn('/'+slug+'.html',(R/'sitemap.xml').read_text())
  lab=D/'labs/business-economics-labs.py'
  with tempfile.TemporaryDirectory(prefix='business economics ') as folder:
   folder=Path(folder)
   for name in names[1:3]:(folder/name).write_bytes((D/'labs'/name).read_bytes())
   before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()}
   def run(case):return subprocess.run([sys.executable,str(lab),'--case',case,'--directory',str(folder)],capture_output=True,text=True)
   r=run('all');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(set(json.loads(r.stdout)),{'startup','department'})
   self.assertEqual(before,{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()})
   (folder/'department-case.csv').write_text('invalid\n');r=run('all');self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'');self.assertIn('rejected',r.stderr)
   self.assertEqual(run('startup').returncode,0)
   (folder/'department-case.csv').write_bytes((D/'labs/department-case.csv').read_bytes());(folder/'startup-case.csv').unlink();self.assertEqual(run('department').returncode,0)
   r=run('startup');self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'')

 def load_warehouse_lab(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('warehouse_flow',D/'labs/warehouse-flow-lab.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  stock,orders=m.load(m.read_csv(D/'labs','warehouse-stock.csv'),m.read_csv(D/'labs','warehouse-orders.csv'))
  return m,stock,orders
 def test_picking_independent_oracles_fefo_and_boundary(self):
  m,stock,orders=self.load_warehouse_lab();before=copy.deepcopy((stock,orders));p=m.plan(stock,orders,'O01')
  self.assertTrue(p['complete']);self.assertEqual([(x['bin_id'],x['sku'],x['lot'],x['units']) for x in p['allocations']],[('A01','SKU-A','L01',6),('A02','SKU-A','L02',4),('B01','SKU-B','L03',4)])
  self.assertEqual((stock,orders),before)
  orders['O01']['SKU-A']=16;p=m.plan(stock,orders,'O01');self.assertEqual(p['shortages'],{'SKU-A':2});self.assertEqual(p['allocations'],[])
  orders['O01']['SKU-A']=10;stock['A01']['expiry']='2026-11-21';p=m.plan(stock,orders,'O01');self.assertFalse(p['complete']);self.assertEqual(p['shortages'],{'SKU-A':2})
  stock['A01']['expiry']='2026-11-22';self.assertTrue(m.plan(stock,orders,'O01')['complete'])
  stock['A02']['expiry']='2026-11-22';self.assertEqual(m.plan(stock,orders,'O01')['allocations'][0]['bin_id'],'A01')
  stock['B01']['on_hand']=3;p=m.plan(stock,orders,'O01');self.assertEqual(p['shortages'],{'SKU-B':1});self.assertEqual(p['allocations'],[])
  orders['O01']['MISSING']=1;self.assertIn('MISSING',m.plan(stock,orders,'O01')['shortages'])
 def test_wms_independent_event_results_balance_and_rejections(self):
  m,stock,orders=self.load_warehouse_lab();events=json.loads((D/'labs/warehouse-events.json').read_text());w=m.Warehouse(stock,orders);accepted=[]
  for index,event in enumerate(events):
   before=w.snapshot();r=w.apply(event);w.check()
   if r['accepted']:accepted.append(index)
   else:self.assertEqual(w.snapshot(),before);self.assertTrue(r['inventory_unchanged'])
  self.assertEqual(accepted,[0,4,6,7,8])
  self.assertEqual({b:x['on_hand'] for b,x in w.stock.items()},{'A01':0,'A02':4,'Q01':3,'B01':1,'B02':4})
  self.assertEqual(sum(x['on_hand'] for x in w.stock.values()),12);self.assertEqual(w.holds,{});self.assertEqual(w.terminal,{'O01':'shipped'})
  self.assertEqual(sum(x['on_hand'] for x in stock.values()),26)
  self.assertTrue(m.plan(stock,orders,'O02')['complete'])
  w=m.Warehouse(stock,orders);self.assertTrue(w.apply(dict(event_id='R1',action='reserve',order_id='O01'))['accepted'])
  p=m.plan(w.stock,w.orders,'O02',w.holds);self.assertEqual(p['shortages'],{'SKU-A':1})
 def test_wms_cancel_retry_and_quantity_guards(self):
  m,stock,orders=self.load_warehouse_lab();w=m.Warehouse(stock,orders)
  def event(i,action='reserve',oid='O01',**kw):return dict(event_id=i,action=action,order_id=oid,**kw)
  self.assertTrue(w.apply(event('R1'))['accepted']);self.assertTrue(w.apply(event('C1','cancel'))['accepted'])
  self.assertEqual(w.holds,{});self.assertEqual(w.terminal,{'O01':'cancelled'});self.assertEqual(w.stock,stock)
  self.assertFalse(w.apply(event('R2'))['accepted'])
  w=m.Warehouse(stock,orders);w.apply(event('R1'));before=w.snapshot()
  for i,patch in enumerate([dict(sku='SKU-B'),dict(lot='wrong'),dict(bin_id='missing'),dict(units='7'),dict(units='0'),dict(units=6),dict(units='NaN')]):
   scan=dict(bin_id='A01',sku='SKU-A',lot='L01',units='6');scan.update(patch)
   self.assertFalse(w.apply(event('P'+str(i),'pick',**scan))['accepted']);self.assertEqual(w.snapshot(),before)
  # Even failed event IDs are consumed. Correcting the payload is not a successful replay.
  r=w.apply(event('P0','pick',bin_id='A01',sku='SKU-A',lot='L01',units='6'));self.assertFalse(r['accepted']);self.assertIn('Duplicate',r['error'])
  self.assertTrue(w.apply(event('P_NEW','pick',bin_id='A01',sku='SKU-A',lot='L01',units='6'))['accepted'])
  before=w.snapshot();self.assertFalse(w.apply(event('C2','cancel'))['accepted']);self.assertEqual(w.snapshot(),before)
 def test_wms_rollback_after_partial_mutation_and_invalid_inputs(self):
  m,stock,orders=self.load_warehouse_lab();w=m.Warehouse(stock,orders);events=json.loads((D/'labs/warehouse-events.json').read_text())
  for index in [0,4,6,7]:self.assertTrue(w.apply(events[index])['accepted'])
  # Controlled fault: eligibility changes before ship. Earlier bin decrements must roll back.
  w.stock['B01']['status']='quarantine';before=w.snapshot();r=w.apply(events[8]);self.assertFalse(r['accepted']);self.assertEqual(w.snapshot(),before)
  self.assertEqual(w.stock['A01']['on_hand'],6);self.assertEqual(w.stock['A02']['on_hand'],8)
  for bad in [None,[],{},dict(event_id='NEW1',action='unknown',order_id='O01'),dict(event_id='NEW2',action='reserve',order_id='UNKNOWN'),dict(event_id='NEW3',action='reserve',order_id='O02',extra=True)]:
   before=w.snapshot();self.assertFalse(w.apply(bad)['accepted']);self.assertEqual(w.snapshot(),before)
  rows=m.read_csv(D/'labs','warehouse-stock.csv');o=m.read_csv(D/'labs','warehouse-orders.csv')
  for patch in [dict(units='-1'),dict(expiry='2026-11-31'),dict(status='unknown'),dict(units='1.5')]:
   bad=copy.deepcopy(rows);bad[0].update(patch)
   with self.assertRaises(ValueError):m.load(bad,o)
  with self.assertRaises(ValueError):m.load(rows+[rows[0]],o)
  with self.assertRaises(ValueError):m.unique_object([('a',1),('a',2)])
 def test_warehouse_published_readonly_cli_atomic_errors(self):
  import tempfile,hashlib
  names=['warehouse-stock.csv','warehouse-orders.csv','warehouse-events.json','warehouse-flow-lab.py','order-picking-guide.md','wms-state-guide.md']
  for name in names:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  for slug in ['order-picking-validation','wms-state-control']:self.assertIn('/'+slug+'.html',(R/'sitemap.xml').read_text())
  with tempfile.TemporaryDirectory(prefix='warehouse flow ') as folder:
   folder=Path(folder)
   for name in names[:3]:(folder/name).write_bytes((D/'labs'/name).read_bytes())
   before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()}
   def run(case):return subprocess.run([sys.executable,str(D/'labs/warehouse-flow-lab.py'),'--case',case,'--directory',str(folder)],capture_output=True,text=True)
   r=run('all');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(set(json.loads(r.stdout)),{'picking','wms'})
   self.assertEqual(before,{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()})
   (folder/'warehouse-events.json').write_text('{');r=run('all');self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'');self.assertIn('rejected',r.stderr)
   self.assertEqual(run('picking').returncode,0)
   (folder/'warehouse-events.json').write_text('[{"event_id":"X","event_id":"Y"}]');self.assertEqual(run('wms').returncode,2)
   (folder/'warehouse-events.json').write_text('[{"event_id":"X","action":"ship","order_id":"O01"}]');r=run('wms');self.assertEqual(r.returncode,0);self.assertFalse(json.loads(r.stdout)['wms']['results'][0]['accepted'])
   (folder/'warehouse-stock.csv').write_text('wrong\n');r=run('picking');self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'')

 def load_digital_handover_lab(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('digital_handover',D/'labs/digital-handover-lab.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def test_digital_handover_fixed_byte_oracles_and_same_size_change(self):
  import tempfile
  m=self.load_digital_handover_lab();names=['digital-agenda-v1.md','digital-decision-v1.md'];expected=[(441,'ed1f0435c1e251b92ae3e8a3827c7a5a8db954b0da25b0f888ed65f832655f07'),(479,'d1d5ac8750e878deea1972d4f479d9a5f60c384fe0775be7ae8186ed6ebb02cf')]
  r=m.verify(D/'labs');self.assertTrue(r['ok']);self.assertEqual([(x['actual_bytes'],x['actual_sha256']) for x in r['files']],expected)
  with tempfile.TemporaryDirectory(prefix='digital work ') as folder:
   folder=Path(folder)
   for name in names+[m.MANIFEST]:(folder/name).write_bytes((D/'labs'/name).read_bytes())
   p=folder/names[0];original=p.read_bytes();p.write_bytes(original.replace(b'1',b'2',1));r=m.verify(folder)
   self.assertFalse(r['ok']);self.assertTrue(r['files'][0]['size_matches']);self.assertFalse(r['files'][0]['hash_matches']);self.assertEqual(r['files'][0]['actual_bytes'],441)
   p.write_bytes(original+b'\n');r=m.verify(folder);self.assertEqual(r['files'][0]['actual_bytes'],442);self.assertFalse(r['files'][0]['size_matches'])
   p.write_bytes(original);self.assertTrue(m.verify(folder)['ok'])
 def test_digital_handover_joint_tampering_and_unlisted_file_limit(self):
  import tempfile,hashlib
  m=self.load_digital_handover_lab()
  with tempfile.TemporaryDirectory() as folder:
   folder=Path(folder)
   for name in [m.MANIFEST,'digital-agenda-v1.md','digital-decision-v1.md']:(folder/name).write_bytes((D/'labs'/name).read_bytes())
   p=folder/'digital-agenda-v1.md';changed=p.read_bytes()+b'changed';p.write_bytes(changed)
   self.assertFalse(m.verify(folder)['ok'])
   manifest=json.loads((folder/m.MANIFEST).read_text());manifest['files'][0].update(bytes=len(changed),sha256=hashlib.sha256(changed).hexdigest());manifest['author']='Unverified declaration'
   (folder/m.MANIFEST).write_text(json.dumps(manifest));r=m.verify(folder);self.assertTrue(r['ok']);self.assertEqual(r['declared_author'],'Unverified declaration')
   (folder/'extra-note.txt').write_text('Not listed');self.assertTrue(m.verify(folder)['ok']);self.assertEqual(len(m.verify(folder)['files']),2)
 def test_digital_handover_schema_path_and_duplicate_guards(self):
  m=self.load_digital_handover_lab();base=json.loads((D/'labs'/m.MANIFEST).read_text())
  for key,value in [('name','../digital-file.md'),('name','/tmp/digital-file.md'),('name','a\\digital-file.md'),('name','digital-UPPER.md'),('bytes',True),('bytes',-1),('bytes',65537),('sha256','a'*63),('sha256','z'*64)]:
   bad=copy.deepcopy(base);bad['files'][0][key]=value
   with self.assertRaises(ValueError,msg=str((key,value))):m.validate_manifest(bad)
  for bad in [dict(base,format_version=True),dict(base,files=[]),dict(base,extra=1),dict(base,author=' '),dict(base,files=base['files']+[base['files'][0]])]:
   with self.assertRaises(ValueError):m.validate_manifest(bad)
  with self.assertRaises(ValueError):m.unique_object([('a',1),('a',2)])
  twenty=dict(base,files=[dict(name=f'digital-{i}.md',bytes=0,sha256='0'*64) for i in range(20)]);self.assertEqual(len(m.validate_manifest(twenty)),20)
  twenty['files'].append(dict(name='digital-extra.md',bytes=0,sha256='0'*64))
  with self.assertRaises(ValueError):m.validate_manifest(twenty)
 def test_digital_handover_byte_limits_and_symlinks(self):
  import tempfile,hashlib
  m=self.load_digital_handover_lab()
  with tempfile.TemporaryDirectory() as folder:
   folder=Path(folder)
   for name in [m.MANIFEST,'digital-agenda-v1.md','digital-decision-v1.md']:(folder/name).write_bytes((D/'labs'/name).read_bytes())
   p=folder/'digital-agenda-v1.md';data=b'x'*65536;p.write_bytes(data)
   manifest=json.loads((folder/m.MANIFEST).read_text());manifest['files'][0].update(bytes=65536,sha256=hashlib.sha256(data).hexdigest());raw=json.dumps(manifest).encode()
   (folder/m.MANIFEST).write_bytes(raw+b' '*(32768-len(raw)));self.assertTrue(m.verify(folder)['ok'])
   (folder/m.MANIFEST).write_bytes(raw+b' '*(32769-len(raw)))
   with self.assertRaises(ValueError):m.verify(folder)
   (folder/m.MANIFEST).write_bytes(raw);p.write_bytes(data+b'x')
   with self.assertRaises(ValueError):m.verify(folder)
   p.unlink();p.symlink_to(folder/'digital-decision-v1.md')
   with self.assertRaises(ValueError):m.verify(folder)
   link=folder/'root-link';link.symlink_to(folder,target_is_directory=True)
   with self.assertRaises(ValueError):m.verify(link)
 def test_digital_handover_published_readonly_cli_codes_atomic_errors(self):
  import tempfile,hashlib
  m=self.load_digital_handover_lab();names=[m.MANIFEST,'digital-agenda-v1.md','digital-decision-v1.md','digital-handover-lab.py','digital-work-guide.md']
  for name in names:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  self.assertIn('/digital-work-handover.html',(R/'sitemap.xml').read_text())
  with tempfile.TemporaryDirectory(prefix='handover space ') as folder:
   folder=Path(folder)
   for name in names[:3]:(folder/name).write_bytes((D/'labs'/name).read_bytes())
   before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()}
   def run():return subprocess.run([sys.executable,str(D/'labs/digital-handover-lab.py'),'--directory',str(folder)],capture_output=True,text=True)
   r=run();self.assertEqual(r.returncode,0,r.stderr);self.assertTrue(json.loads(r.stdout)['ok']);self.assertEqual(before,{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir()})
   p=folder/'digital-agenda-v1.md';p.write_bytes(p.read_bytes()+b'\n');r=run();self.assertEqual(r.returncode,1);self.assertFalse(json.loads(r.stdout)['ok'])
   (folder/'digital-decision-v1.md').unlink();r=run();self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'');self.assertIn('rejected',r.stderr)
   (folder/m.MANIFEST).write_text('{"format_version":1,"format_version":1}');r=run();self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'')

 def load_internet_marketing_lab(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('internet_marketing',D/'labs/internet-marketing-lab.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def test_marketing_independent_oracles_and_weighted_totals(self):
  m=self.load_internet_marketing_lab();rows=m.read_case(D/'labs');before=copy.deepcopy(rows);r=m.calculate(rows);a,b=r['campaigns'];t=r['total']
  self.assertEqual((a['ctr_percent'],a['click_to_lead_percent'],a['lead_to_order_percent'],a['click_to_order_percent']),(5,10,20,2))
  self.assertEqual((b['ctr_percent'],b['click_to_lead_percent'],b['lead_to_order_percent'],b['click_to_order_percent']),(5,20,10,2))
  self.assertEqual((a['cpc_rub'],b['cpc_rub'],a['cpl_rub'],b['cpl_rub']),(10,10,100,50))
  self.assertEqual((a['cost_per_attributed_order_rub'],b['cost_per_attributed_order_rub']),(500,500))
  self.assertEqual((a['contribution_after_ad_rub'],b['contribution_after_ad_rub'],t['contribution_after_ad_rub']),(3000,2400,5400))
  self.assertEqual((t['impressions'],t['clicks'],t['leads'],t['orders'],t['ad_spend_rub']),(18000,900,130,18,9000))
  self.assertAlmostEqual(t['cpl_rub'],9000/130);self.assertNotEqual(t['cpl_rub'],75);self.assertAlmostEqual(t['click_to_lead_percent'],13000/900)
  self.assertEqual(rows,before)
 def test_marketing_cost_sensitivity_zero_bases_and_negative_result(self):
  m=self.load_internet_marketing_lab();rows=m.read_case(D/'labs');rows[1]['ad_spend_rub']='5000';r=m.calculate(rows);b=r['campaigns'][1]
  self.assertEqual((b['cpc_rub'],b['cpl_rub'],b['cost_per_attributed_order_rub'],b['net_revenue_per_ad_ruble'],b['contribution_after_ad_rub'],r['total']['contribution_after_ad_rub']),(12.5,62.5,625,3.2,1400,4400))
  rows[1]['ad_spend_rub']='0';r=m.calculate(rows);self.assertIsNone(r['campaigns'][1]['net_revenue_per_ad_ruble']);self.assertEqual(r['total']['contribution_after_ad_rub'],9400)
  rows=m.read_case(D/'labs');rows[1].update(orders='0',net_revenue_rub='0',variable_cost_rub='0');r=m.calculate(rows);self.assertEqual(r['campaigns'][1]['cpl_rub'],50);self.assertIsNone(r['campaigns'][1]['cost_per_attributed_order_rub']);self.assertEqual(r['total']['contribution_after_ad_rub'],-1000)
  for row in rows:
   for key in m.COLUMNS[1:]:row[key]='0'
  t=m.calculate(rows)['total'];self.assertIsNone(t['ctr_percent']);self.assertIsNone(t['cpl_rub']);self.assertEqual(t['contribution_after_ad_rub'],0)
 def test_marketing_rejects_invalid_contract_without_mutating_inputs(self):
  m=self.load_internet_marketing_lab();rows=m.read_case(D/'labs')
  for patch in [dict(campaign_id='a'),dict(campaign_id='B'),dict(clicks='10001'),dict(leads='501'),dict(orders='51'),dict(orders='0'),dict(ad_spend_rub='-1'),dict(ad_spend_rub='NaN'),dict(ad_spend_rub='1.5'),dict(ad_spend_rub='100000001'),dict(ad_spend_rub='')]:
   bad=copy.deepcopy(rows);bad[0].update(patch);before=copy.deepcopy(bad)
   with self.assertRaises(ValueError,msg=str(patch)):m.calculate(bad)
   self.assertEqual(bad,before)
  with self.assertRaises(ValueError):m.calculate(rows+[rows[0]])
  with self.assertRaises(ValueError):m.calculate([])
  with self.assertRaises(ValueError):m.calculate([dict(rows[0],extra='1')])
 def test_marketing_published_cli_readonly_and_bounded_atomic_errors(self):
  import tempfile,hashlib
  names=['internet-marketing-case.csv','internet-marketing-lab.py','internet-marketing-guide.md']
  for name in names:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  self.assertIn('/internet-marketing-measurement.html',(R/'sitemap.xml').read_text())
  with tempfile.TemporaryDirectory(prefix='marketing case ') as folder:
   folder=Path(folder);p=folder/names[0];raw=(D/'labs'/names[0]).read_bytes();p.write_bytes(raw);before=hashlib.sha256(raw).hexdigest()
   def run():return subprocess.run([sys.executable,str(D/'labs'/names[1]),'--directory',str(folder)],capture_output=True,text=True)
   r=run();self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(json.loads(r.stdout)['total']['orders'],18);self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),before)
   for bad in [b'wrong\n',raw+b'B,1,1,1,1,1,1,1\n',raw+b' '*(65537-len(raw)),raw.replace(b'4000,16000',b'-1,16000')]:
    p.write_bytes(bad);r=run();self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'');self.assertIn('rejected',r.stderr)
   p.unlink();r=run();self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'')

 def load_marketing_events(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('marketing_events',D/'labs/marketing-events-lab.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def test_marketing_events_independent_oracle_and_reordering(self):
  m=self.load_marketing_events();rows=m.read_case(D/'labs');before=copy.deepcopy(rows);r=m.reconcile(rows)
  self.assertEqual(r['total'],dict(orders=2,gross_rub=3000,refund_rub=300,net_rub=2700));self.assertEqual(r['campaigns']['A']['net_rub'],700);self.assertEqual(r['campaigns']['B']['net_rub'],2000)
  self.assertEqual(r['duplicates'],[dict(line=6,event_id='E4',reason='exact_duplicate')]);self.assertEqual({x['event_id']:x['reason'] for x in r['excluded']},{'E3':'outside_sale_cohort','E5':'after_refund_cutoff','E6':'outside_sale_cohort'})
  self.assertEqual((r['input_rows'],r['unique_events']),(7,6));self.assertEqual(rows,before)
  self.assertEqual(m.reconcile(rows[::-1])['total'],r['total']);self.assertEqual(m.reconcile(rows+[rows[1]])['total'],r['total'])
 def test_marketing_events_cutoff_partial_refunds_and_atomic_validation(self):
  m=self.load_marketing_events();rows=m.read_case(D/'labs');rows[5]['date']='2026-11-07';self.assertEqual(m.reconcile(rows)['total']['net_rub'],1700)
  rows=m.read_case(D/'labs');extra=dict(event_id='E7',kind='refund',order_id='O1',campaign_id='A',date='2026-11-07',amount_rub='700');self.assertEqual(m.reconcile(rows+[extra])['total']['net_rub'],2000)
  for patch in [dict(amount_rub='701'),dict(order_id='UNKNOWN'),dict(campaign_id='B'),dict(date='2026-09-30'),dict(date='2026-02-30'),dict(date='2026-1-01'),dict(amount_rub='0'),dict(amount_rub='-1'),dict(amount_rub='1.5'),dict(amount_rub='100000001'),dict(kind='cancel'),dict(event_id='bad')]:
   bad=rows+[dict(extra,**patch)];before=copy.deepcopy(bad)
   with self.assertRaises(ValueError,msg=str(patch)):m.reconcile(bad)
   self.assertEqual(before,bad)
  for bad in [[],rows*144,rows+[dict(rows[0],amount_rub='2')],rows+[dict(rows[0],event_id='E8')],rows+[dict(extra,extra='x')]]:
   with self.assertRaises(ValueError):m.reconcile(bad)
  # Late invalid events still invalidate the complete dataset.
  with self.assertRaises(ValueError):m.reconcile(rows+[dict(extra,date='2027-01-01',amount_rub='701')])
 def test_marketing_events_cli_bounds_readonly_and_public_parity(self):
  import tempfile
  m=self.load_marketing_events()
  for name in ['marketing-events-lab.py','marketing-events-case.csv','marketing-events-guide.md']:self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
  with tempfile.TemporaryDirectory() as folder:
   folder=Path(folder);p=folder/'marketing-events-case.csv';raw=(D/'labs'/p.name).read_bytes();p.write_bytes(raw)
   def run():return subprocess.run([sys.executable,str(D/'labs/marketing-events-lab.py'),'--directory',str(folder)],capture_output=True,text=True)
   r=run();self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(json.loads(r.stdout)['total']['net_rub'],2700);self.assertEqual(p.read_bytes(),raw)
   p.write_bytes(b'\xef\xbb\xbf'+raw);self.assertEqual(run().returncode,0)
   for bad in [b'x\n',raw+b' '*(65537-len(raw)),raw.replace(b'300',b'-300'),raw.replace(b'2026-10-01',b'2026-02-30'),raw+b'E1,sale,O1,A,2026-10-01,2\n']:
    p.write_bytes(bad);r=run();self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'');self.assertIn('rejected',r.stderr)
   p.unlink();self.assertEqual(run().returncode,2)

 def test_browser_evidence_bound_to_exact_published_bytes_and_runner(self):
  import hashlib
  report=json.loads((D/'labs/digital-browser-report.json').read_text())
  self.assertEqual(report['status'],'automated_browser_checks_only')
  self.assertEqual(report['target_sha256'],hashlib.sha256((D/'labs/digital-access-practice.html').read_bytes()).hexdigest())
  self.assertEqual(report['runner_sha256'],hashlib.sha256((R/'academy/tests/digital-access-browser.cjs').read_bytes()).hexdigest())
  self.assertEqual({x['id'] for x in report['checks']},{'B'+str(i) for i in range(1,10)})
  self.assertTrue(all(x['result']=='pass' and x['evidence'] for x in report['checks']))
  self.assertTrue(report['browser']['headless']);self.assertGreaterEqual(len(report['not_checked']),7)
  for name in ['digital-access-practice.html','digital-access-guide.md','digital-browser-report.json','testing-browser-guide.md','testing-guide.md']:
   self.assertEqual((D/'labs'/name).read_bytes(),(O/name).read_bytes())
 def test_browser_evidence_does_not_approve_review_gates(self):
  ledger=json.loads((D/'review-ledger.json').read_text())
  for cid in ['D09-C04','D10-C04']:
   row=next(r for r in ledger['materials'] if r['id']==cid)
   for gate in ['subject_review','legal_review','answer_review','pilot']:
    self.assertEqual(row[gate]['status'],'pending');self.assertIsNone(row[gate]['reviewer'])
  self.assertEqual(json.loads((O/'progress.json').read_text())['expert_approved'],0)

if __name__=='__main__':unittest.main()
