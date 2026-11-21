"""Original educational BI model: Герасимов Дмитрий Сергеевич, v0.25.0, 2026-11-19.
Reads three fictional CSVs only. No network, source writes, external packages or BI GUI.
Public reference, not a protected exam or a hostile-input production data pipeline.
"""
from pathlib import Path
import csv
import json
import re
import sqlite3

SNAPSHOT = '2026-03-01'
SCHEMAS = {
    'bi-products.csv': ['product_id', 'category'],
    'bi-sales.csv': ['line_id', 'order_id', 'sale_month', 'site', 'product_id', 'qty', 'amount_rub'],
    'bi-returns.csv': ['return_id', 'line_id', 'return_month', 'amount_rub'],
}


def read_csv(folder, name):
    with (Path(folder) / name).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != SCHEMAS[name]:
            raise ValueError('Unexpected columns: ' + name)
        rows = list(reader)
    for row in rows:
        if set(row) != set(SCHEMAS[name]) or any(value is None or not value.strip() for value in row.values()):
            raise ValueError('Missing/extra value: ' + name)
    return rows


def unique(rows, key):
    ids = [r[key] for r in rows]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate key: ' + key)
    return {r[key]: r for r in rows}


def positive_integer(value, label):
    if not re.fullmatch(r'[0-9]+', value) or not 0 < int(value) <= 1_000_000:
        raise ValueError('Expected positive bounded integer: ' + label)
    return int(value)


def month(value):
    # Intentionally narrow educational data contract, not a general date parser.
    if value not in {'2026-01', '2026-02'}:
        raise ValueError('Month outside fictional snapshot: ' + value)


def validate(products, sales, returns):
    if not products or not sales:
        raise ValueError('Products and sales required')
    for name, rows in [('bi-products.csv', products), ('bi-sales.csv', sales), ('bi-returns.csv', returns)]:
        for row in rows:
            if set(row) != set(SCHEMAS[name]) or any(not isinstance(v, str) or not v.strip() for v in row.values()):
                raise ValueError('Invalid fields: ' + name)
    product_by_id = unique(products, 'product_id')
    line_by_id = unique(sales, 'line_id')
    unique(returns, 'return_id')
    order_context = {}
    for sale in sales:
        month(sale['sale_month'])
        if sale['product_id'] not in product_by_id:
            raise ValueError('Unknown product_id')
        positive_integer(sale['qty'], 'qty')
        positive_integer(sale['amount_rub'], 'sale amount_rub')
        context = (sale['sale_month'], sale['site'])
        if sale['order_id'] in order_context and order_context[sale['order_id']] != context:
            raise ValueError('Conflicting order month/site')
        order_context[sale['order_id']] = context
    returned = {}
    for event in returns:
        month(event['return_month'])
        if event['line_id'] not in line_by_id:
            raise ValueError('Unknown return line_id')
        sale = line_by_id[event['line_id']]
        if event['return_month'] < sale['sale_month']:
            raise ValueError('Return before sale month')
        amount = positive_integer(event['amount_rub'], 'return amount_rub')
        returned[event['line_id']] = returned.get(event['line_id'], 0) + amount
        if returned[event['line_id']] > int(sale['amount_rub']):
            raise ValueError('Returns exceed line amount')
    return returned


def calculate(products, sales, returns):
    returned = validate(products, sales, returns)
    categories = {r['product_id']: r['category'] for r in products}
    independent_lines = [dict(sale, category=categories[sale['product_id']],
                              gross_rub=int(sale['amount_rub']),
                              returned_rub=returned.get(sale['line_id'], 0),
                              net_rub=int(sale['amount_rub']) - returned.get(sale['line_id'], 0))
                         for sale in sales]
    # Explicit schemas, bound parameters and an in-memory database; no user SQL.
    db = sqlite3.connect(':memory:')
    try:
        db.executescript('''
          CREATE TABLE products(product_id TEXT PRIMARY KEY, category TEXT NOT NULL);
          CREATE TABLE sales(line_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, sale_month TEXT NOT NULL,
                             site TEXT NOT NULL, product_id TEXT NOT NULL, qty INTEGER NOT NULL, amount_rub INTEGER NOT NULL);
          CREATE TABLE returns(return_id TEXT PRIMARY KEY, line_id TEXT NOT NULL, return_month TEXT NOT NULL, amount_rub INTEGER NOT NULL);
        ''')
        db.executemany('INSERT INTO products VALUES (?,?)', [(r['product_id'], r['category']) for r in products])
        db.executemany('INSERT INTO sales VALUES (?,?,?,?,?,?,?)', [tuple(r[k] if k not in {'qty', 'amount_rub'} else int(r[k]) for k in SCHEMAS['bi-sales.csv']) for r in sales])
        db.executemany('INSERT INTO returns VALUES (?,?,?,?)', [(r['return_id'], r['line_id'], r['return_month'], int(r['amount_rub'])) for r in returns])
        naive = db.execute('''SELECT COUNT(*), SUM(s.amount_rub), COALESCE(SUM(r.amount_rub),0)
                              FROM sales s LEFT JOIN returns r ON s.line_id=r.line_id''').fetchone()
        db.executescript('''
          CREATE VIEW net_lines AS
          WITH returns_by_line AS (SELECT line_id, SUM(amount_rub) AS returned_rub FROM returns GROUP BY line_id)
          SELECT s.*, p.category, COALESCE(r.returned_rub,0) AS returned_rub,
                 s.amount_rub-COALESCE(r.returned_rub,0) AS net_rub
          FROM sales s JOIN products p ON s.product_id=p.product_id
          LEFT JOIN returns_by_line r ON s.line_id=r.line_id;
        ''')

        def metric(sale_month=None, site=None, category=None):
            filters = {k: v for k, v in [('sale_month', sale_month), ('site', site), ('category', category)] if v is not None}
            where = ' AND '.join(k + '=?' for k in filters) or '1=1'
            row = db.execute('''SELECT COUNT(*), COALESCE(SUM(amount_rub),0), COALESCE(SUM(returned_rub),0),
                                       COALESCE(SUM(net_rub),0), COUNT(DISTINCT order_id)
                                FROM net_lines WHERE ''' + where, tuple(filters.values())).fetchone()
            selected = [r for r in independent_lines if all(r[k] == v for k, v in filters.items())]
            expected = (len(selected), sum(r['gross_rub'] for r in selected),
                        sum(r['returned_rub'] for r in selected), sum(r['net_rub'] for r in selected),
                        len({r['order_id'] for r in selected}))
            if row != expected:
                raise ValueError('SQL/independent result mismatch')
            return dict(zip(['rows', 'gross_rub', 'returns_rub', 'net_rub', 'orders'], row),
                        average_net_per_order_rub=row[3] / row[4] if row[4] else None)

        by_month = {m: metric(sale_month=m) for m in sorted({r['sale_month'] for r in sales})}
        event_net = {m: sum(int(r['amount_rub']) for r in sales if r['sale_month'] == m)
                       - sum(int(r['amount_rub']) for r in returns if r['return_month'] == m)
                     for m in sorted({r['sale_month'] for r in sales} | {r['return_month'] for r in returns})}
        return {
            'snapshot': SNAPSHOT, 'policy': 'Known returns attributed to original sale month; fictional management metric, not accounting revenue',
            'source_counts': {'sales_lines': len(sales), 'products': len(products), 'return_events': len(returns)},
            'naive_join': {'rows': naive[0], 'gross_rub': naive[1], 'returns_rub': naive[2], 'incorrect_net_rub': naive[1] - naive[2]},
            'all': metric(), 'by_sale_month': by_month,
            'by_site': {s: metric(site=s) for s in sorted({r['site'] for r in sales})},
            'by_category': {c: metric(category=c) for c in sorted(set(categories.values()))},
            'feb_A': metric(sale_month='2026-02', site='A'),
            'feb_A_equipment': metric(sale_month='2026-02', site='A', category='Оборудование'),
            'alternative_event_month_net_rub': event_net,
        }
    finally:
        db.close()


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Public fictional BI model reference; reads CSVs only; no network or source writes.')
    parser.add_argument('--directory', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    try:
        report = calculate(*(read_csv(args.directory, name) for name in ['bi-products.csv', 'bi-sales.csv', 'bi-returns.csv']))
    except (OSError, ValueError, csv.Error, sqlite3.Error) as error:
        parser.exit(1, 'Validation failed: ' + str(error) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print('Сверка SQL с независимым расчетом выполнена. Это не проверка GUI BI, DAX, безопасности, права или квалификации.')


if __name__ == '__main__':
    main()
