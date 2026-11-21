"""Герасимов Дмитрий Сергеевич. v0.37.0, 2026-11-19.
Validate fictional rubric records. Does not evaluate answers or award qualifications.
"""
import argparse
import json
from pathlib import Path
import re

CRITERIA=('P1','P2','P3','P4')
CRITICAL=('invented_evidence','unauthorized_disclosure','automated_score_as_qualification','no_accessible_alternative')


def pairs_unique(pairs):
 result={}
 for key,value in pairs:
  if key in result:raise ValueError('Duplicate JSON key')
  result[key]=value
 return result


def evaluate(data):
 if type(data) is not dict or set(data)!={'schema_version','fictional','records'} or type(data['schema_version']) is not int or data['schema_version']!=1 or data['fictional'] is not True:raise ValueError('Expected fictional schema version1')
 records=data['records']
 if type(records) is not list or not 1<=len(records)<=50:raise ValueError('Expected1..50 records')
 seen=set();results=[]
 for record in records:
  if type(record) is not dict or set(record)!={'record_id','scores','critical_errors'}:raise ValueError('Unexpected record schema')
  rid=record['record_id']
  if type(rid) is not str or not re.fullmatch(r'EX[0-9]{2}',rid) or rid in seen:raise ValueError('Invalid or duplicate fictional ID')
  seen.add(rid);scores=record['scores'];critical=record['critical_errors']
  if type(scores) is not dict or set(scores)!=set(CRITERIA):raise ValueError('Expected four rubric criteria')
  for value in scores.values():
   if value is not None and (type(value) is not int or not 0<=value<=3):raise ValueError('Expected integer0..3 or null')
  if type(critical) is not list or any(type(x) is not str or x not in CRITICAL for x in critical) or len(set(critical))!=len(critical):raise ValueError('Invalid critical error list')
  missing=[key for key in CRITERIA if scores[key] is None]
  total=None if missing else sum(scores.values())
  status='critical_block' if critical else 'incomplete' if missing else 'ready_for_teacher_review' if total>=9 else 'needs_revision'
  results.append(dict(record_id=rid,total=total,missing=missing,critical_errors=list(critical),status=status))
 return dict(fictional=True,threshold=9,maximum=12,results=results,limits='Arithmetic on supplied judgments only; no answer analysis, independent review, learner result or qualification.')


def read_case(directory):
 with (Path(directory)/'digital-teaching-rubric-case.json').open('rb') as stream:raw=stream.read(65537)
 if len(raw)>65536:raise ValueError('Input too large')
 return json.loads(raw.decode('utf-8-sig'),object_pairs_hook=pairs_unique)


def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent);args=parser.parse_args()
 try:result=evaluate(read_case(args.directory))
 except (OSError,ValueError,TypeError,UnicodeError) as error:
  import sys
  print('Input rejected: '+str(error),file=sys.stderr);return 2
 print(json.dumps(result,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
