import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const dbPath = process.env.DATABASE_URL ?? '/data/investment.db'
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
const db = drizzle(sqlite)

const __dirname = dirname(fileURLToPath(import.meta.url))
await migrate(db, { migrationsFolder: resolve(__dirname, '../lib/db/migrations') })

sqlite.close()
console.log('✓ Database migrations applied')
