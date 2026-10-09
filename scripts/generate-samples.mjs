import initSqlJs from 'sql.js'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const publicDir = 'public'
const wasmSource = join('node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
const wasmTarget = join(publicDir, 'sql-wasm.wasm')

await mkdir(publicDir, { recursive: true })
await copyFile(wasmSource, wasmTarget)

const SQL = await initSqlJs({
  locateFile: (file) => join('node_modules', 'sql.js', 'dist', file),
})

function seedBase(db) {
  db.run(`
PRAGMA foreign_keys = OFF;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  password_hash TEXT,
  api_token TEXT
);

CREATE TABLE devices (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  device_name TEXT NOT NULL,
  ip_address TEXT,
  os TEXT,
  first_seen TEXT,
  last_seen TEXT,
  trust_score INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  device_id INTEGER,
  started_at TEXT,
  ended_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  risk_score INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  amount REAL,
  currency TEXT,
  status TEXT,
  created_at TEXT,
  merchant TEXT,
  card_last4 TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  created_at TEXT,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  note TEXT,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);
`)

  const users = [
    [1, 'ava.chen@example.com', '+1-415-555-0191', 'admin', 'active', '2025-11-04T09:12:00Z', '2026-02-18T18:40:00Z', '$argon2id$v=19$m=65536$ava', 'sk_live_ava_42a9c1d4f8b742'],
    [2, 'mateo.rios@example.com', '+1-312-555-0129', 'analyst', 'active', '2025-11-07T10:20:00Z', '2026-02-18T17:10:00Z', '$argon2id$v=19$m=65536$mateo', null],
    [3, 'nina.patel@example.com', '+44-20-7946-0182', 'finance', 'active', '2025-11-12T15:04:00Z', '2026-02-14T09:50:00Z', '$argon2id$v=19$m=65536$nina', null],
    [4, 'liam.kovac@example.com', '+49-30-555-0160', 'support', 'review', '2025-12-01T12:30:00Z', '2026-02-18T03:08:00Z', '$argon2id$v=19$m=65536$liam', 'token_shadow_9dfcbb7301a2'],
    [5, 'mara.sato@example.com', '', 'vendor', 'disabled', '2025-12-16T08:11:00Z', null, null, null],
  ]

  const devices = [
    [1, 1, 'Ava MacBook Pro', '10.20.4.12', 'macOS', '2025-11-04T09:14:00Z', '2026-02-18T18:39:00Z', 94],
    [2, 2, 'Mateo ThinkPad', '10.20.7.19', 'Linux', '2025-11-07T10:21:00Z', '2026-02-18T17:09:00Z', 88],
    [3, 3, 'Nina iPhone', '172.16.8.10', 'iOS', '2025-11-13T07:05:00Z', '2026-02-14T09:48:00Z', 79],
    [4, 4, 'Liam Desktop', '192.168.9.45', 'Windows', '2025-12-01T12:35:00Z', '2026-02-18T03:06:00Z', 41],
    [5, 99, 'Unknown kiosk', '203.0.113.44', 'Linux', '2026-02-18T02:55:00Z', '2026-02-18T03:25:00Z', 12],
  ]

  const sessions = [
    [1, 1, 1, '2026-02-18T18:00:00Z', '2026-02-18T18:40:00Z', '10.20.4.12', 'Mozilla/5.0 macOS', 11],
    [2, 2, 2, '2026-02-18T16:55:00Z', '2026-02-18T17:10:00Z', '10.20.7.19', 'Mozilla/5.0 Linux', 17],
    [3, 4, 4, '2026-02-18T02:58:00Z', '2026-02-18T03:08:00Z', '198.51.100.77', 'curl/8.1', 88],
    [4, 99, 5, '2026-02-18T03:12:00Z', null, '203.0.113.44', 'python-requests/2.31', 96],
  ]

  const transactions = [
    [1, 3, 1240.5, 'USD', 'approved', '2026-02-11T14:20:00Z', 'Northwind Cloud', '4242'],
    [2, 3, 89.95, 'USD', 'approved', '2026-02-12T10:12:00Z', 'Atlas Storage', '1881'],
    [3, 4, 4999.0, 'USD', 'manual_review', '2026-02-18T03:04:00Z', 'Night Market API', '0000'],
    [4, 99, 710.0, 'USD', 'blocked', '2026-02-18T03:15:00Z', 'Unknown Vendor', '9999'],
  ]

  const audits = [
    [1, 1, 'user.login', 'users', '1', '2026-02-18T18:00:00Z', '{"mfa":"passed","country":"US"}'],
    [2, 4, 'api.token.export', 'users', '4', '2026-02-18T03:01:00Z', '{"reason":"support escalation","ip":"198.51.100.77"}'],
    [3, 4, 'transaction.override', 'transactions', '3', '2026-02-18T03:05:00Z', '{"approval":"manual","amount":4999}'],
    [4, 99, 'session.create', 'sessions', '4', '2026-02-18T03:12:00Z', '{"ip":"203.0.113.44","risk":"critical"}'],
  ]

  const notes = [
    [1, 2, 'Quarterly review completed. No escalation.', '2026-01-30T11:15:00Z'],
    [2, 4, 'Temporary key sk_live_incident_7d9f0123456789 was pasted into chat.', '2026-02-18T03:07:00Z'],
    [3, 5, '', '2026-01-02T08:00:00Z'],
  ]

  const migrations = [
    ['2025_11_01_initial_identity', '2025-11-01T00:00:00Z'],
    ['2025_12_15_audit_events', '2025-12-15T00:00:00Z'],
  ]

  insertRows(db, 'users', users)
  insertRows(db, 'devices', devices)
  insertRows(db, 'sessions', sessions)
  insertRows(db, 'transactions', transactions)
  insertRows(db, 'audit_events', audits)
  insertRows(db, 'notes', notes)
  insertRows(db, 'schema_migrations', migrations)
}

function insertRows(db, table, rows) {
  if (!rows.length) return
  const placeholders = rows[0].map(() => '?').join(', ')
  const statement = db.prepare(`INSERT INTO ${table} VALUES (${placeholders})`)
  rows.forEach((row) => statement.run(row))
  statement.free()
}

function createDatabase({ after = false } = {}) {
  const db = new SQL.Database()
  seedBase(db)

  if (after) {
    db.run(`
ALTER TABLE users ADD COLUMN risk_label TEXT DEFAULT 'normal';
UPDATE users SET status = 'locked', risk_label = 'critical' WHERE id = 4;
UPDATE users SET risk_label = 'watch' WHERE id IN (1, 3);
DELETE FROM transactions WHERE id = 2;

CREATE TABLE incident_notes (
  id INTEGER PRIMARY KEY,
  incident_key TEXT,
  severity TEXT,
  opened_at TEXT,
  summary TEXT
);
`)

    insertRows(db, 'users', [
      [6, 'orion.black@example.com', '+1-202-555-0144', 'contractor', 'active', '2026-02-18T02:45:00Z', '2026-02-18T03:28:00Z', '$argon2id$v=19$m=65536$orion', 'api_key_shadow_after_0011223344', 'watch'],
    ])

    insertRows(db, 'devices', [
      [6, 6, 'Orion Surface', '198.51.100.12', 'Windows', '2026-02-18T02:46:00Z', '2026-02-18T03:30:00Z', 28],
      [7, 404, 'Ghost device', '203.0.113.90', 'Unknown', '2026-02-18T03:31:00Z', '2026-02-18T03:33:00Z', 4],
    ])

    insertRows(db, 'sessions', [
      [5, 6, 6, '2026-02-18T02:47:00Z', '2026-02-18T03:29:00Z', '198.51.100.12', 'Mozilla/5.0 Windows', 74],
      [6, 404, 7, '2026-02-18T03:32:00Z', null, '203.0.113.90', 'sqlmap/1.8', 99],
    ])

    insertRows(db, 'audit_events', [
      [5, 6, 'user.invited', 'users', '6', '2026-02-18T02:45:00Z', '{"inviter":"liam.kovac@example.com"}'],
      [6, 404, 'db.dump.request', 'database', 'primary', '2026-02-18T03:32:00Z', '{"tool":"unknown","ip":"203.0.113.90"}'],
    ])

    insertRows(db, 'incident_notes', [
      [1, 'INC-2026-0218-A', 'critical', '2026-02-18T03:35:00Z', 'Credential-like string and orphaned sessions observed after snapshot.'],
    ])
  }

  return db
}

const base = createDatabase()
const after = createDatabase({ after: true })

await writeFile(join(publicDir, 'sample-forensics.sqlite'), Buffer.from(base.export()))
await writeFile(join(publicDir, 'sample-forensics-after.sqlite'), Buffer.from(after.export()))

base.close()
after.close()

console.log('Generated SQLite WASM runtime and sample forensic databases.')
