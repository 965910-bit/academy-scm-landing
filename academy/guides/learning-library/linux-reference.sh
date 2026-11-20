#!/usr/bin/env bash
# OPEN solution. Read first. Run only in a newly initialized fictional lab.
# Creates/overwrites named work/ and reports/ artifacts. No sudo or deletion.
set -eu
set -o pipefail
export LC_ALL=C
if [ ! -f .academy-linux-lab ] || [ "$(cat .academy-linux-lab)" != "academy-linux-files-v1" ]; then
  printf '%s\n' 'Wrong directory: first initialize a new lab and cd into it.' >&2
  exit 2
fi
mkdir -p -- work reports
cp -- input/events.log work/events-copy.log
grep '^ERROR ' work/events-copy.log > reports/errors.log
cut -d ' ' -f 2 reports/errors.log | sort | uniq -c > reports/error-counts.txt
grep -c '^ERROR ' work/events-copy.log > reports/error-total.txt
if grep '^FATAL ' work/events-copy.log > reports/fatal.log; then
  printf '0\n' > reports/fatal-status.txt
else
  status=$?
  printf '%s\n' "$status" > reports/fatal-status.txt
  if [ "$status" -ne 1 ]; then exit "$status"; fi
fi
printf '%s\n' '8 input lines; 3 ERROR lines; missing_price=2, duplicate_id=1.' \
  'grep FATAL returned 1: no matching lines, not a missing-file error.' \
  'Source content preserved; outputs do not prove incident resolution or command mastery.' > reports/note.txt
chmod 600 -- reports/note.txt
printf '%s\n' 'Reference files created. Run linux-lab.py --check with this directory path.'
