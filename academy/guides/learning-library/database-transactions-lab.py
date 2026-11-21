"""Герасимов Дмитрий Сергеевич. v0.27.0, 2026-11-19.
Fictional SQLite transfer lab; never opens a production database or accepts arbitrary SQL.
Main model/backup use memory; two-writer demonstration creates/deletes a temporary DB.
No network, dependency installs, or writes to downloaded source files.
"""
from pathlib import Path
import json
import sqlite3
import tempfile

SCHEMA = '''
CREATE TABLE bins(bin_id TEXT PRIMARY KEY NOT NULL);
CREATE TABLE products(sku TEXT PRIMARY KEY NOT NULL);
CREATE TABLE stock(
  bin_id TEXT NOT NULL REFERENCES bins(bin_id),
  sku TEXT NOT NULL REFERENCES products(sku),
  quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity>=0),
  PRIMARY KEY(bin_id,sku)
);
CREATE TABLE movements(
  movement_id TEXT PRIMARY KEY NOT NULL,
  src TEXT NOT NULL,
  dst TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity>0),
  CHECK(src<>dst),
  FOREIGN KEY(src,sku) REFERENCES stock(bin_id,sku),
  FOREIGN KEY(dst,sku) REFERENCES stock(bin_id,sku)
);
PRAGMA user_version=1;
'''


def connect(path=':memory:'):
    db = sqlite3.connect(path, isolation_level=None, timeout=0)
    db.execute('PRAGMA foreign_keys=ON')
    if db.execute('PRAGMA foreign_keys').fetchone() != (1,):
        db.close()
        raise RuntimeError('Foreign key enforcement unavailable')
    return db


def initialize(db):
    db.executescript(SCHEMA)
    try:
        db.execute('BEGIN IMMEDIATE')
        db.executemany('INSERT INTO bins VALUES (?)', [('B1',), ('B2',)])
        db.execute("INSERT INTO products VALUES ('SKU1')")
        db.executemany('INSERT INTO stock VALUES (?,?,?)', [('B1', 'SKU1', 10), ('B2', 'SKU1', 3)])
        db.execute('COMMIT')
    except Exception:
        if db.in_transaction:
            db.execute('ROLLBACK')
        raise


def state(db):
    return {'stock': [list(row) for row in db.execute('SELECT bin_id,sku,quantity FROM stock ORDER BY bin_id,sku')],
            'movements': [list(row) for row in db.execute('SELECT movement_id,src,dst,sku,quantity FROM movements ORDER BY movement_id')]}


def transfer(db, movement_id, src, dst, sku, quantity, fail_after_debit=False):
    if db.in_transaction:
        raise ValueError('Existing transaction not accepted by this narrow API')
    if any(type(v) is not str or not v or len(v) > 32 for v in [movement_id, src, dst, sku]):
        raise ValueError('Nonempty bounded string IDs required')
    if type(quantity) is not int or not 1 <= quantity <= 1000:
        raise ValueError('Quantity must be int, not bool, in 1..1000')
    if src == dst:
        raise ValueError('Distinct source and destination required')
    try:
        db.execute('BEGIN IMMEDIATE')
        # Unique audit ID and foreign keys are checked inside the same transaction.
        db.execute('INSERT INTO movements VALUES (?,?,?,?,?)', (movement_id, src, dst, sku, quantity))
        changed = db.execute('''UPDATE stock SET quantity=quantity-?
                                WHERE bin_id=? AND sku=? AND quantity>=?''', (quantity, src, sku, quantity)).rowcount
        if changed != 1:
            raise ValueError('Insufficient stock or missing source')
        if fail_after_debit:
            raise RuntimeError('Injected educational failure after debit')
        changed = db.execute('UPDATE stock SET quantity=quantity+? WHERE bin_id=? AND sku=?', (quantity, dst, sku)).rowcount
        if changed != 1:
            raise ValueError('Missing destination')
        db.execute('COMMIT')
    except Exception:
        if db.in_transaction:
            db.execute('ROLLBACK')
        raise


def writer_lock_demo(source):
    # Sequentially controlled two-connection lock, not a threaded/high-load stress test.
    with tempfile.TemporaryDirectory(prefix='academy db lab ') as folder:
        path = Path(folder) / 'fictional.sqlite'
        first, second = connect(path), connect(path)
        try:
            source.backup(first)
            first.execute('BEGIN IMMEDIATE')
            try:
                second.execute('BEGIN IMMEDIATE')
            except sqlite3.OperationalError as error:
                if getattr(error, 'sqlite_errorcode', None) != sqlite3.SQLITE_BUSY:
                    raise
                blocked = True
            else:
                second.execute('ROLLBACK')
                raise RuntimeError('Expected second writer to be blocked')
            first.execute('ROLLBACK')
            second.execute('BEGIN IMMEDIATE')
            second.execute('ROLLBACK')
            return {'second_writer_busy': blocked, 'writer_allowed_after_rollback': True,
                    'source_unchanged': state(first) == state(source)}
        finally:
            first.close()
            second.close()


def run_lab():
    db, backup = connect(), connect()
    try:
        initialize(db)
        initial = state(db)
        transfer(db, 'M01', 'B1', 'B2', 'SKU1', 4)
        after_success = state(db)
        try:
            transfer(db, 'M02', 'B1', 'B2', 'SKU1', 2, fail_after_debit=True)
        except RuntimeError as error:
            if str(error) != 'Injected educational failure after debit':
                raise
        else:
            raise RuntimeError('Injected failure was not detected')
        after_failure = state(db)
        rejected = []
        for name, args in [('overdraw', ('M03', 'B1', 'B2', 'SKU1', 7)),
                           ('duplicate_id', ('M01', 'B1', 'B2', 'SKU1', 1)),
                           ('unknown_destination', ('M04', 'B1', 'UNKNOWN', 'SKU1', 1))]:
            try:
                transfer(db, *args)
            except (ValueError, sqlite3.IntegrityError):
                rejected.append(name)
            else:
                raise RuntimeError('Expected rejection: ' + name)
            if state(db) != after_success:
                raise RuntimeError('Rejected transfer changed committed state')
        db.backup(backup)
        if state(backup) != after_success:
            raise RuntimeError('Logical backup mismatch')
        lock = writer_lock_demo(db)
        report = {'initial': initial, 'after_success': after_success,
                  'after_injected_failure': after_failure,
                  'rollback_restored_both_stock_and_log': after_failure == after_success,
                  'rejected_without_changes': rejected, 'logical_backup_matches': True,
                  'foreign_key_check': list(db.execute('PRAGMA foreign_key_check')),
                  'integrity_check': db.execute('PRAGMA integrity_check').fetchone()[0],
                  'schema_version': db.execute('PRAGMA user_version').fetchone()[0], 'lock_demo': lock}
        if not report['rollback_restored_both_stock_and_log'] or not lock['source_unchanged']:
            raise RuntimeError('Model verification failed')
        return report
    finally:
        db.close()
        backup.close()


def main():
    try:
        report = run_lab()
    except (OSError, ValueError, RuntimeError, sqlite3.Error) as error:
        import sys
        print('Lab failed: ' + str(error), file=sys.stderr)
        return 1
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
