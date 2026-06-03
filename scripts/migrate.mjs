/**
 * Simple, reliable migration runner. Tracks applied migrations by filename
 * in a __migrations table — no snapshots, no Drizzle journal required.
 *
 * Convention: add files to lib/db/migrations/*.sql named NNNN_description.sql.
 * They run in alphabetical order exactly once.
 *
 * One-time bootstrap: if migrating from the old Drizzle-journal system,
 * the number of rows in __drizzle_migrations tells us how many SQL files
 * were already applied (they're in the same alphabetical order).
 */

import Database from 'better-sqlite3'
import { readdirSync, readFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const dbPath = process.env.DATABASE_URL ?? './data/investment.db'
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )
`)

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(__dirname, '../lib/db/migrations')

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

// One-time bootstrap: seed __migrations from the old __drizzle_migrations count
// so we don't re-run migrations that were already applied by the old system.
const isNewTable =
  sqlite.prepare('SELECT COUNT(*) as n FROM __migrations').get().n === 0

if (isNewTable) {
  const oldTableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
    .get()

  if (oldTableExists) {
    const oldCount = sqlite
      .prepare('SELECT COUNT(*) as n FROM __drizzle_migrations')
      .get().n

    // Mark the first oldCount files as already applied
    const now = Date.now()
    const insert = sqlite.prepare('INSERT OR IGNORE INTO __migrations (name, applied_at) VALUES (?, ?)')
    for (const file of files.slice(0, oldCount)) {
      insert.run(file, now)
    }
    if (oldCount > 0) {
      console.log(`  (bootstrapped ${oldCount} migration(s) from previous tracker)`)
    }
  }
}

const applied = new Set(
  sqlite.prepare('SELECT name FROM __migrations').all().map((r) => r.name)
)

let count = 0
for (const file of files) {
  if (applied.has(file)) continue
  const sql = readFileSync(resolve(migrationsDir, file), 'utf8')
  sqlite.exec(sql)
  sqlite.prepare('INSERT INTO __migrations (name, applied_at) VALUES (?, ?)').run(file, Date.now())
  console.log(`  ✓ ${file}`)
  count++
}

sqlite.close()
console.log(count > 0 ? `✓ ${count} migration(s) applied` : '✓ Database up to date')
