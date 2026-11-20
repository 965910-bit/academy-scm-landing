"""Offline Linux file lab. No network, sudo, shell execution or deletion.

python3 linux-lab.py --init NEW_DIRECTORY
python3 linux-lab.py --check DIRECTORY

Check reads only known files, rejects symlinks/special files and files >1 MiB.
It checks output artifacts, not authorship, understanding, or every command used.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat

LOG = ('INFO start\nWARN retry job=J1\nERROR missing_price job=J2\n'
       'INFO recovered job=J1\nERROR duplicate_id job=J3\nWARN timeout job=J4\n'
       'INFO done job=J5\nERROR missing_price job=J6\n')
MARKER = 'academy-linux-files-v1\n'
ERRORS = ''.join(line+'\n' for line in LOG.splitlines() if line.startswith('ERROR '))
EXPECTED_COUNTS = {'duplicate_id': 1, 'missing_price': 2}


def read_regular(root, relative):
    path = root
    for part in Path(relative).parts:
        path = path/part
        if path.is_symlink():
            raise ValueError('Symlink not allowed: ' + relative)
    info = path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_size > 1024*1024:
        raise ValueError('Expected regular file <=1 MiB: ' + relative)
    # O_NOFOLLOW blocks final-component symlinks; this is a local lab, not a
    # hardened concurrent multi-user sandbox. Do not use with hostile writers.
    descriptor = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_NONBLOCK', 0))
    with os.fdopen(descriptor, 'rb') as stream:
        opened=os.fstat(stream.fileno())
        if not stat.S_ISREG(opened.st_mode) or opened.st_size > 1024*1024:
            raise ValueError('File changed or is not a bounded regular file: ' + relative)
        return stream.read(1024*1024+1).decode('utf-8')


def initialize(target):
    target = Path(target).absolute()
    if target.exists() or target.is_symlink():
        raise ValueError('Target must not exist; nothing overwritten')
    target.mkdir()  # Parent must already exist; never touch an existing tree.
    (target/'input').mkdir()
    (target/'input/events.log').write_text(LOG, encoding='utf-8')
    (target/'.academy-linux-lab').write_text(MARKER, encoding='utf-8')
    return target


def check(target):
    root = Path(target).absolute()
    if root.is_symlink() or not root.is_dir():
        raise ValueError('Expected a real lab directory')
    if read_regular(root,'.academy-linux-lab') != MARKER:
        raise ValueError('Wrong lab marker')
    original = read_regular(root,'input/events.log')
    if original != LOG:
        raise ValueError('Original input changed')
    if read_regular(root,'work/events-copy.log') != original:
        raise ValueError('Working copy differs from original')
    if read_regular(root,'reports/errors.log') != ERRORS:
        raise ValueError('Expected exactly three ERROR lines in original order')
    counts = {}
    for line in read_regular(root,'reports/error-counts.txt').splitlines():
        parts = line.split()
        if len(parts)!=2 or not parts[0].isdigit() or parts[1] in counts:
            raise ValueError('Invalid count line')
        counts[parts[1]]=int(parts[0])
    if counts != EXPECTED_COUNTS:
        raise ValueError('Expected duplicate_id=1 and missing_price=2')
    if read_regular(root,'reports/error-total.txt').strip() != '3':
        raise ValueError('Expected total 3')
    if read_regular(root,'reports/fatal.log') != '':
        raise ValueError('Expected empty FATAL search output')
    if read_regular(root,'reports/fatal-status.txt').strip() != '1':
        raise ValueError('No-match grep status must be 1')
    note = read_regular(root,'reports/note.txt')
    if not note.strip():
        raise ValueError('Add an explanation; contents need human review')
    mode = stat.S_IMODE((root/'reports/note.txt').stat().st_mode)
    if os.name=='posix' and mode!=0o600:
        raise ValueError('Expected note.txt mode 600 in this Linux lab')
    return dict(input_lines=8, error_lines=3, error_types=counts, fatal_grep_status=1,
                input_sha256=hashlib.sha256(original.encode()).hexdigest(),
                permission_checked=os.name=='posix',
                notice='Artifacts match. Explanation, command history and skill require human review; not a secure exam.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--init',type=Path)
    mode.add_argument('--check',type=Path)
    args=parser.parse_args()
    try:
        if args.init is not None:
            print('Created fictional lab: '+str(initialize(args.init)))
        else:
            print(json.dumps(check(args.check),ensure_ascii=False,indent=2))
            print('PASS: local artifacts only')
    except (OSError,ValueError,UnicodeError) as error:
        parser.exit(1,str(error)+'\n')
