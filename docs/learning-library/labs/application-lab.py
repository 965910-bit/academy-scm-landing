"""Герасимов Дмитрий Сергеевич. v0.27.0, 2026-11-19.
Original fictional batch-price calculator. Reads one bounded JSON file, writes stdout only.
Not a purchasing/payment system, a sandbox for hostile code, or a production security audit.
"""
import argparse
import json
from pathlib import Path
import re

MAX_BYTES = 65536


def reject_constant(value):
    raise ValueError('Non-finite JSON constant: ' + value)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key: ' + key)
        result[key] = value
    return result


def load_request(path):
    # Bound the actual read, rather than stat followed by unbounded read.
    with Path(path).open('rb') as stream:
        content = stream.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise ValueError('Request exceeds educational 65536-byte limit')
    return json.loads(content.decode('utf-8-sig'), object_pairs_hook=unique_object, parse_constant=reject_constant)


def calculate(request):
    if type(request) is not dict or set(request) != {'currency', 'lines'}:
        raise ValueError('Expected exactly currency and lines')
    if request['currency'] != 'RUB':
        raise ValueError('Only fictional RUB contract is supported')
    lines = request['lines']
    if type(lines) is not list or not 1 <= len(lines) <= 100:
        raise ValueError('Expected 1 to 100 lines')
    result = []
    seen = set()
    for line in lines:
        if type(line) is not dict or set(line) != {'line_id', 'qty', 'unit_price_kopecks'}:
            raise ValueError('Unexpected line fields')
        line_id = line['line_id']
        if type(line_id) is not str or re.fullmatch(r'L[0-9]{2}', line_id) is None or line_id in seen:
            raise ValueError('Invalid or duplicate line_id')
        seen.add(line_id)
        qty, price = line['qty'], line['unit_price_kopecks']
        if type(qty) is not int or not 1 <= qty <= 1000:
            raise ValueError('qty must be int, not bool, in 1..1000')
        if type(price) is not int or not 0 <= price <= 100000000:
            raise ValueError('price must be integer kopecks, not bool, in 0..100000000')
        result.append({'line_id': line_id, 'amount_kopecks': qty * price})
    # All input has been validated before any result is returned or printed.
    return {'currency': 'RUB', 'line_count': len(result), 'lines': result,
            'total_kopecks': sum(line['amount_kopecks'] for line in result)}


def main():
    parser = argparse.ArgumentParser(description='Fictional integer-kopeck calculator. No network/source writes.', allow_abbrev=False)
    parser.add_argument('--input', type=Path, default=Path(__file__).resolve().with_name('application-request.json'))
    args = parser.parse_args()
    try:
        result = calculate(load_request(args.input))
    except (OSError, UnicodeError, ValueError, RecursionError) as error:
        parser.exit(2, 'Request rejected: ' + str(error) + '\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
