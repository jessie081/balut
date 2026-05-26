'use strict';

// Database driver: @libsql/client.
// - Local dev:  uses file:./data/balut.db (no auth token).
// - Production: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (works on Vercel /
//   any serverless platform because libsql speaks HTTP).

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

let url, authToken;
if (process.env.TURSO_DATABASE_URL) {
  url = process.env.TURSO_DATABASE_URL;
  authToken = process.env.TURSO_AUTH_TOKEN;
} else {
  const localPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'balut.db');
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  url = 'file:' + localPath;
}

const client = createClient({ url, authToken });

// Lazy schema init so cold serverless invocations stay fast.
const SCHEMA_SQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
let initPromise;
function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      const sql = SCHEMA_SQL
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await client.execute(stmt);
      }
    })();
  }
  return initPromise;
}

function toRunResult(r) {
  return {
    changes: Number(r.rowsAffected ?? 0),
    lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined
  };
}

async function run(sql, ...args) {
  await ensureInit();
  return toRunResult(await client.execute({ sql, args }));
}

async function get(sql, ...args) {
  await ensureInit();
  const r = await client.execute({ sql, args });
  return r.rows[0];
}

async function all(sql, ...args) {
  await ensureInit();
  const r = await client.execute({ sql, args });
  return r.rows;
}

// transaction(async tx => { ... }) — tx exposes run/get/all bound to the txn.
async function transaction(fn) {
  await ensureInit();
  const tx = await client.transaction('write');
  try {
    const txApi = {
      async run(sql, ...args) { return toRunResult(await tx.execute({ sql, args })); },
      async get(sql, ...args) { const r = await tx.execute({ sql, args }); return r.rows[0]; },
      async all(sql, ...args) { const r = await tx.execute({ sql, args }); return r.rows; }
    };
    const result = await fn(txApi);
    await tx.commit();
    return result;
  } catch (e) {
    try { await tx.rollback(); } catch (_) { /* ignore */ }
    throw e;
  }
}

module.exports = { run, get, all, transaction, name: url };
