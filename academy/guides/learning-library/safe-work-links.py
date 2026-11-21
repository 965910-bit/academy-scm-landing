"""Герасимов Дмитрий Сергеевич, v0.38.0, 2026-11-19.
Offline fictional URL-policy exercise. No DNS/network/browser or safety verdict.
"""
import argparse
import csv
import io
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

COLUMNS=['case_id','url']
HOST='portal.example.invalid'
PATHS=('/', '/help', '/training')


def inspect_url(value):
 if type(value) is not str or not 1<=len(value)<=2048:raise ValueError('Expected URL text1..2048 characters')
 # Reject before urlsplit can silently strip controls. No normalization or decoding.
 if any(not 33<=ord(ch)<=126 or ch=='\\' for ch in value):return dict(host=None,reason='noncanonical_input')
 try:
  parts=urlsplit(value)
  if parts.scheme.lower()!='https':return dict(host=None,reason='non_https')
  if parts.username is not None or parts.password is not None:return dict(host=None,reason='userinfo')
  host=parts.hostname;port=parts.port
 except ValueError:return dict(host=None,reason='invalid_authority')
 if not host or not parts.netloc:return dict(host=None,reason='invalid_authority')
 if '%' in parts.netloc or parts.netloc.endswith(':') or host.endswith('.') or any(x.startswith('xn--') for x in host.split('.')) or not re.fullmatch(r'[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*',host):return dict(host=None,reason='noncanonical_authority')
 if host!=HOST:return dict(host=host,reason='host_not_listed')
 if port not in (None,443):return dict(host=host,reason='port_not_listed')
 # Even an empty explicit ? or # is outside this deliberately narrow policy.
 if '?' in value or '#' in value:return dict(host=host,reason='extra_components')
 if (parts.path or '/') not in PATHS:return dict(host=host,reason='path_not_listed')
 return dict(host=host,reason='manual_verification_required')


def calculate(rows):
 if type(rows) is not list or not 1<=len(rows)<=100:raise ValueError('Expected1..100 cases')
 seen=set();results=[]
 for row in rows:
  if type(row) is not dict or set(row)!=set(COLUMNS):raise ValueError('Unexpected schema')
  cid=row['case_id']
  if type(cid) is not str or not re.fullmatch(r'L[0-9]{2}',cid) or cid in seen:raise ValueError('Invalid or duplicate case ID')
  seen.add(cid);results.append(dict(case_id=cid,**inspect_url(row['url'])))
 return dict(fictional=True,policy_version='0.38.0',results=results,limits='No safety/authenticity verdict. No DNS, TLS, redirects, content, mail authentication, credentials or permissions checked. Verify independently; do not follow exercise URLs.')


def read_case(directory):
 with (Path(directory)/'safe-work-links-case.csv').open('rb') as stream:raw=stream.read(65537)
 if len(raw)>65536:raise ValueError('CSV too large')
 reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig'),newline=''),strict=True)
 if reader.fieldnames!=COLUMNS:raise ValueError('Unexpected columns')
 rows=[]
 for row in reader:
  rows.append(row)
  if len(rows)>100:raise ValueError('Too many cases')
 return rows


def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent);args=parser.parse_args()
 try:result=calculate(read_case(args.directory))
 except (OSError,ValueError,TypeError,UnicodeError,csv.Error) as error:
  import sys
  print('Input rejected: '+str(error),file=sys.stderr);return 2
 print(json.dumps(result,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
