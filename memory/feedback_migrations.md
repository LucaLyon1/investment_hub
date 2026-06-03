---
name: feedback_migrations
description: How to properly add DB migrations in this project — always create a plain SQL file, never rely on Drizzle-kit snapshots
metadata:
  type: feedback
---

Always create migrations as plain `.sql` files in `lib/db/migrations/` named `NNNN_description.sql`. The custom runner in `scripts/migrate.mjs` applies them in alphabetical order exactly once, tracked by filename in `__migrations`. No Drizzle-kit snapshots, no journal edits, no manual hash insertion needed.

**Why:** The Drizzle migrator silently skipped hand-crafted migrations without snapshot files, causing a missing `ai_reason` column crash in production. The project now uses a simpler custom runner that never has this problem.

**How to apply:** Any time a schema change is needed: create the SQL file, run `npm run db:migrate` locally to test it, then deploy. Never edit `_journal.json` or touch `__drizzle_migrations`. Never apply migrations by hand or insert hashes manually.
