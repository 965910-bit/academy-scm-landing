"""Герасимов Дмитрий Сергеевич. v0.40.0, 2026-11-19.
Numeric opaque sRGB text contrast only; no browser audit or conformance verdict.
"""
import argparse
import json
from pathlib import Path
import re

THRESHOLDS={'normal_text':4.5,'large_text':3.0}


def unique_pairs(pairs):
 result={}
 for key,value in pairs:
  if key in result:raise ValueError('Duplicate JSON key')
  result[key]=value
 return result


def color(value):
 if type(value) is not str or not re.fullmatch(r'#[0-9a-fA-F]{6}',value):raise ValueError('Expected opaque sRGB #RRGGBB')
 return tuple(int(value[i:i+2],16)/255 for i in (1,3,5))


def linear(channel):
 if type(channel) not in (int,float) or not 0<=channel<=1:raise ValueError('Expected channel0..1')
 return channel/12.92 if channel<=0.04045 else ((channel+0.055)/1.055)**2.4


def luminance(value):
 r,g,b=map(linear,color(value))
 return 0.2126*r+0.7152*g+0.0722*b


def ratio(foreground,background):
 a,b=sorted((luminance(foreground),luminance(background)))
 return (b+0.05)/(a+0.05)


def calculate(data):
 if type(data) is not dict or set(data)!={'schema_version','fictional','pairs'} or type(data['schema_version']) is not int or data['schema_version']!=1 or data['fictional'] is not True:raise ValueError('Expected fictional schema1')
 pairs=data['pairs']
 if type(pairs) is not list or not 1<=len(pairs)<=100:raise ValueError('Expected1..100 pairs')
 seen=set();results=[]
 for pair in pairs:
  if type(pair) is not dict or set(pair)!={'pair_id','foreground','background','declared_role'}:raise ValueError('Unexpected pair schema')
  pid=pair['pair_id'];role=pair['declared_role']
  if type(pid) is not str or not re.fullmatch(r'C[0-9]{2}',pid) or pid in seen:raise ValueError('Invalid or duplicate pair ID')
  if type(role) is not str or role not in THRESHOLDS:raise ValueError('Unknown declared text role')
  seen.add(pid);value=ratio(pair['foreground'],pair['background']);threshold=THRESHOLDS[role]
  results.append(dict(pair_id=pid,foreground=pair['foreground'].upper(),background=pair['background'].upper(),declared_role=role,contrast_ratio=value,numeric_threshold=threshold,meets_numeric_threshold=value>=threshold))
 return dict(fictional=True,policy_version='0.40.0',results=results,limits='Numeric opaque sRGB pairs only. Role supplied, not measured. No CSS/size/weight/states/images/alpha/browser/assistive-technology or complete WCAG/Russian-law conformance checked.')


def read_case(directory):
 with (Path(directory)/'design-contrast-case.json').open('rb') as stream:raw=stream.read(65537)
 if len(raw)>65536:raise ValueError('JSON too large')
 return json.loads(raw.decode('utf-8-sig'),object_pairs_hook=unique_pairs)


def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent);args=parser.parse_args()
 try:report=calculate(read_case(args.directory))
 except (OSError,ValueError,TypeError,UnicodeError) as error:
  import sys
  print('Input rejected: '+str(error),file=sys.stderr);return 2
 print(json.dumps(report,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
