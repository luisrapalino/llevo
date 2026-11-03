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

/**
 * Lee la cadena de conexión sin depender de que la contraseña esté codificada para URL
 * (las contraseñas con / # ? @ [ ] rompen el parser estándar). La contraseña va desde el
 * primer ":" después del usuario hasta la ÚLTIMA "@".
 */
export function parseConnection(str) {
  const m = /^postgres(?:ql)?:\/\/([^:/?#]+)(?::(.*))?@([^@/?#:]+)(?::(\d+))?(?:\/([^?#]*))?/.exec(str.trim());
  if (!m) throw new Error('DATABASE_URL no tiene el formato postgresql://usuario:contraseña@servidor:puerto/base');
  const dec = (v) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  const [, user, pass = '', host, port = '5432', database = 'postgres'] = m;
  if (/\[?YOUR-PASSWORD\]?/i.test(pass)) throw new Error('DATABASE_URL todavía tiene [YOUR-PASSWORD]: reemplázalo por la contraseña de la base de datos.');
  return { user: dec(user), pass: dec(pass), host, port: Number(port), database: dec(database) || 'postgres' };
}

let conn;
try {
  conn = parseConnection(raw);
} catch (err) {
  console.error(`[migraciones] ✗ ${err.message}`);
  process.exit(1);
}
const local = ['localhost', '127.0.0.1'].includes(conn.host);
console.log(`[migraciones] Conectando a ${conn.host}:${conn.port} como ${conn.user}…`);

const sql = postgres({
  ...conn,
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
  const hint =
    err.code === 'ENOTFOUND' ? ' (no se encontró el servidor: revisa el host de DATABASE_URL)'
    : err.code === '28P01' ? ' (contraseña incorrecta)'
    : err.code === 'ENETUNREACH' || err.code === 'EHOSTUNREACH' ? ' (usa la cadena "Session pooler", no la conexión directa)'
    : '';
  console.error(`[migraciones] ✗ Error: ${err.message}${hint}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
