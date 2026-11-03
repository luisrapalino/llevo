// Aplica las migraciones pendientes de supabase/migrations antes de compilar.
// Usa la misma tabla de control que la CLI de Supabase (supabase_migrations.schema_migrations),
// así que ambas herramientas son compatibles.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const BASELINE = '20261103000000'; // primera migración: puede haberse aplicado a mano en el SQL Editor

const raw =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL;

// En Vercel solo se migra en producción: una vista previa de otra rama no debe tocar la base real.
if (process.env.VERCEL && process.env.VERCEL_ENV !== 'production') {
  console.log(`[migraciones] Entorno ${process.env.VERCEL_ENV}: se omiten (solo corren en producción).`);
  process.exit(0);
}

if (!raw) {
  console.warn('[migraciones] No hay DATABASE_URL: se omiten las migraciones.');
  process.exit(0);
}

const url = new URL(raw);
const local = ['localhost', '127.0.0.1'].includes(url.hostname);
url.search = ''; // quita parámetros propios de otros clientes (sslmode, supa, pgbouncer…)

const sql = postgres(url.toString(), {
  ssl: local ? false : 'require',
  max: 1,
  prepare: false, // compatible con el pooler de Supabase
  onnotice: () => {},
  connect_timeout: 20,
});

try {
  await sql`create schema if not exists supabase_migrations`;
  await sql`create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`;

  const applied = new Set((await sql`select version from supabase_migrations.schema_migrations`).map((r) => r.version));
  const files = (await readdir(DIR)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  let count = 0;

  for (const file of files) {
    const [version, ...rest] = file.replace(/\.sql$/, '').split('_');
    const name = rest.join('_');
    if (applied.has(version)) continue;

    if (version === BASELINE) {
      const [{ exists }] = await sql`select to_regclass('public.requests') is not null as exists`;
      if (exists) {
        await sql`insert into supabase_migrations.schema_migrations (version, name) values (${version}, ${name}) on conflict do nothing`;
        console.log(`[migraciones] ${file}: el esquema ya existía, se marca como aplicada.`);
        continue;
      }
    }

    const content = await readFile(path.join(DIR, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into supabase_migrations.schema_migrations (version, name) values (${version}, ${name})`;
    });
    console.log(`[migraciones] ✓ ${file}`);
    count++;
  }

  console.log(count ? `[migraciones] ${count} aplicada(s).` : '[migraciones] La base de datos está al día.');
} catch (err) {
  console.error('[migraciones] ✗ Error:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
