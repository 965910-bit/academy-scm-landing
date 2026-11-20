"""Original educational example. Author: Герасимов Дмитрий Сергеевич.
Version 0.3.0, 2026-11-19. Fictional data; not production data processing.
Run: python3 python-lab.py (no files read, no network access).
"""

def parse_units(value):
    """Parse 1..9 ASCII digits after strip; otherwise raise ValueError."""
    if not isinstance(value, str):
        raise ValueError('Ожидается строка')
    text = value.strip()
    if not text or len(text) > 9 or any(ch < '0' or ch > '9' for ch in text):
        raise ValueError('Нужны от 1 до 9 ASCII-цифр без знака')
    return int(text)


def summarize(rows):
    """Return total, valid_count, issues without mutating input records.

    rows is an iterable of records. Non-dict records are logged as issues.
    IDs need not be unique and are not validated; issue positions are 1-based.
    """
    total = 0
    valid_count = 0
    issues = []
    for position, row in enumerate(rows, 1):
        if not isinstance(row, dict):
            issues.append({'position': position, 'reason': 'Ожидается словарь'})
            continue
        try:
            value = parse_units(row.get('units'))
        except ValueError as error:
            issues.append({'position': position, 'reason': str(error)})
            continue
        total += value
        valid_count += 1
    return {'total': total, 'valid_count': valid_count, 'issues': issues}


SAMPLE = [
    {'id': 'A', 'units': '10'}, {'id': 'B', 'units': '20'},
    {'id': 'C', 'units': None}, {'id': 'D', 'units': '-2'},
    {'id': 'E', 'units': '0'},
]

if __name__ == '__main__':
    print(summarize(SAMPLE))
