// Applies the supabase/*.sql files to a Postgres database in the README order.
//
// Usage:
//   node scripts/apply-migrations.mjs "postgresql://postgres:PASSWORD@HOST:5432/postgres"
//   (or set DATABASE_URL in the environment)
//
// Each file is sent as its own simple-protocol query, i.e. its own implicit
// transaction — the same as "one file per run" in the Supabase SQL editor.
// That is what lets 002a_status_enum.sql / 005a_notification_channel_enum.sql
// (which each ALTER TYPE ... ADD VALUE) commit before the file that uses the
// new enum value runs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, "..", "supabase");

const FILES = [
  "schema.sql",
  "rls.sql",
  "seed.sql",
  "002a_status_enum.sql",
  "002_case_management.sql",
  "002_case_management_rls.sql",
  "003_seed_case_management.sql",
  "004_public_analytics.sql",
  "005a_notification_channel_enum.sql",
  "005_advanced_features.sql",
  "005_advanced_features_rls.sql",
  "006_anonymous_submission_fix.sql",
];

const connectionString = process.argv[2] || process.env.DATABASE_URL;

// Fall back to discrete params (avoids URL-encoding a password with % * etc.)
const client = new pg.Client(
  connectionString
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || "postgres",
        ssl: { rejectUnauthorized: false },
      }
);

await client.connect();
console.log("connected\n");

for (const file of FILES) {
  const sql = readFileSync(join(sqlDir, file), "utf8");
  process.stdout.write(`running ${file} … `);
  try {
    await client.query(sql);
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(`\n${file}: ${err.message}\n`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("\nAll migrations applied.");
