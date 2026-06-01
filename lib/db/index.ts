import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

function initDb(): Db {
  const dbPath = process.env.DATABASE_URL ?? './data/investment.db'
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

let _db: Db | null = null

// Proxy defers the actual DB connection until the first method call,
// so importing this module at build time doesn't open the file.
export const db = new Proxy({} as Db, {
  get(_, prop) {
    if (!_db) _db = initDb()
    return Reflect.get(_db, prop)
  },
})
