// One-time bootstrap: promote the first super_admin.
//
// public.profiles has a BEFORE UPDATE trigger (profiles_enforce_role_authority)
// that only lets an existing super_admin grant admin/super_admin. Before the
// first one exists that is a chicken-and-egg, so this script momentarily
// disables that trigger for the single promotion and re-enables it — the
// standard "first admin" bootstrap the README describes.
//
// Usage:
//   PGHOST=... PGPORT=5432 PGUSER=... PGPASSWORD=... \
//     node scripts/promote-first-admin.mjs [email]
//
// email defaults to admin@tdb.test

import pg from "pg";

const email = process.argv[2] || "admin@tdb.test";

const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows: userRows } = await client.query(
  "select id from auth.users where email = $1",
  [email]
);
if (userRows.length === 0) {
  console.error(`No auth user with email ${email}`);
  await client.end();
  process.exit(1);
}
const uid = userRows[0].id;

await client.query("begin");
try {
  await client.query(
    "alter table public.profiles disable trigger profiles_enforce_role_authority"
  );
  await client.query(
    `insert into public.profiles (id, full_name, role)
       values ($1, 'TDB Admin', 'super_admin')
       on conflict (id) do update set role = 'super_admin'`,
    [uid]
  );
  await client.query(
    "alter table public.profiles enable trigger profiles_enforce_role_authority"
  );
  await client.query("commit");
} catch (err) {
  await client.query("rollback");
  console.error("promotion failed:", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `select u.email, p.role
     from public.profiles p join auth.users u on u.id = p.id
     order by p.role`
);
console.log(`Promoted ${email} to super_admin.\n`);
console.table(rows);

await client.end();
