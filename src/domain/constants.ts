export const sampleUrl = '/sample-forensics.sqlite'
export const comparisonSampleUrl = '/sample-forensics-after.sqlite'
export const wasmUrl = '/sql-wasm.wasm'

export const defaultQuery = `SELECT name AS object_name, type, sql
FROM sqlite_master
WHERE type IN ('table', 'index', 'view', 'trigger')
ORDER BY type, name;`

export const presetQueries = [
  {
    name: 'Risky sessions',
    sql: `SELECT sessions.id, users.email, sessions.ip_address, sessions.risk_score, sessions.started_at
FROM sessions
LEFT JOIN users ON users.id = sessions.user_id
WHERE sessions.risk_score >= 70
ORDER BY sessions.risk_score DESC;`,
  },
  {
    name: 'PII inventory',
    sql: `SELECT id, email, phone, role, status, last_login_at
FROM users
ORDER BY last_login_at DESC;`,
  },
  {
    name: 'Audit timeline',
    sql: `SELECT audit_events.created_at, users.email, audit_events.action, audit_events.entity, audit_events.metadata
FROM audit_events
LEFT JOIN users ON users.id = audit_events.user_id
ORDER BY audit_events.created_at DESC
LIMIT 50;`,
  },
  {
    name: 'Orphan candidates',
    sql: `SELECT devices.id, devices.user_id, devices.device_name, devices.ip_address
FROM devices
LEFT JOIN users ON users.id = devices.user_id
WHERE devices.user_id IS NOT NULL AND users.id IS NULL;`,
  },
]

export const emptyReport = {
  findings: [],
  timeline: [],
  piiColumns: 0,
  missingValues: 0,
  orphanRecords: 0,
  sensitiveHits: 0,
}
