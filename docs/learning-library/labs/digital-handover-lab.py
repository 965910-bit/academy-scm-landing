"""Герасимов Дмитрий Сергеевич. v0.32.0, 2026-11-19.
Read-only fictional file handover check. No network/writes/authentication.
Checks listed file bytes only, not authorship, rights, malware or folder completeness.
Trusted local directory required; no protection against concurrent path replacement.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

MAX_FILE_BYTES=65536
MAX_MANIFEST_BYTES=32768
MAX_FILES=20
MANIFEST='digital-handover-manifest.json'


def unique_object(pairs):
 result={}
 for key,value in pairs:
  if key in result:raise ValueError('Duplicate JSON key')
  result[key]=value
 return result


def bounded_file(folder,name,limit):
 path=folder/name
 if path.is_symlink() or not path.is_file():raise ValueError('Expected a regular non-symlink file: '+name)
 with path.open('rb') as stream:data=stream.read(limit+1)
 if len(data)>limit:raise ValueError('File exceeds byte limit: '+name)
 return data


def validate_manifest(manifest):
 if type(manifest) is not dict or set(manifest)!={'format_version','bundle_version','author','files'}:raise ValueError('Unexpected manifest fields')
 if type(manifest['format_version']) is not int or manifest['format_version']!=1:raise ValueError('Expected format version 1')
 for key in ['bundle_version','author']:
  if type(manifest[key]) is not str or not 1<=len(manifest[key].strip())<=200:raise ValueError('Invalid text metadata')
 entries=manifest['files']
 if type(entries) is not list or not 1<=len(entries)<=MAX_FILES:raise ValueError('Expected 1..20 listed files')
 seen=set()
 for entry in entries:
  if type(entry) is not dict or set(entry)!={'name','bytes','sha256'}:raise ValueError('Unexpected file entry')
  name=entry['name']
  if type(name) is not str or not re.fullmatch(r'digital-[a-z0-9-]+\.md',name) or len(name)>100:raise ValueError('Unsafe or unsupported filename')
  if name in seen:raise ValueError('Duplicate filename')
  seen.add(name)
  if type(entry['bytes']) is not int or not 0<=entry['bytes']<=MAX_FILE_BYTES:raise ValueError('Invalid expected byte count')
  if type(entry['sha256']) is not str or not re.fullmatch(r'[0-9a-f]{64}',entry['sha256']):raise ValueError('Expected lowercase SHA-256 hex')
 return entries


def verify(folder):
 folder=Path(folder)
 if folder.is_symlink() or not folder.is_dir():raise ValueError('Expected a trusted local non-symlink directory')
 raw=bounded_file(folder,MANIFEST,MAX_MANIFEST_BYTES)
 manifest=json.loads(raw.decode('utf-8'),object_pairs_hook=unique_object)
 entries=validate_manifest(manifest);results=[]
 for entry in entries:
  data=bounded_file(folder,entry['name'],MAX_FILE_BYTES)
  digest=hashlib.sha256(data).hexdigest()
  results.append(dict(name=entry['name'],expected_bytes=entry['bytes'],actual_bytes=len(data),
                      expected_sha256=entry['sha256'],actual_sha256=digest,
                      size_matches=len(data)==entry['bytes'],hash_matches=digest==entry['sha256']))
 return dict(bundle_version=manifest['bundle_version'],declared_author=manifest['author'],files=results,
             ok=all(r['size_matches'] and r['hash_matches'] for r in results),
             limits='Only listed bytes compared to untrusted manifest. No authorship, approval, access rights, latest-version, malware or full-folder claim. No signature, server versions or race resistance.')


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
 args=parser.parse_args()
 try:report=verify(args.directory)
 except (OSError,ValueError) as error:parser.exit(2,'Package rejected: '+str(error)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2))
 return 0 if report['ok'] else 1


if __name__=='__main__':raise SystemExit(main())
