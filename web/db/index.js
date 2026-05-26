'use strict';

// Uses Node's built-in SQLite (node:sqlite, stable in Node 22.5+ / 24).
// No native compilation, no Python toolchain required.

// Silence the "SQLite is experimental" warning emitted by node:sqlite.
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && /SQLite/i.test(w.message)) return;
  // eslint-disable-next-line no-console
  console.warn(w);
});

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'balut.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// ---- better-sqlite3-compatible thin wrapper -------------------------------
// Lets the existing route code keep using db.prepare(...).run|.get|.all and
// db.transaction(fn) without changes.

function wrapStatement(stmt) {
  return {
    run(...args) {
      const r = stmt.run(...args);
      // node:sqlite returns { lastInsertRowid: bigint, changes: bigint }
      return {
        changes: Number(r.changes ?? 0),
        lastInsertRowid: r.lastInsertRowid !== undefined ? Number(r.lastInsertRowid) : undefined
      };
    },
    get(...args) { return stmt.get(...args); },
    all(...args) { return stmt.all(...args); }
  };
}

const wrapped = {
  name: DB_PATH,
  prepare(sql) { return wrapStatement(db.prepare(sql)); },
  exec(sql)    { return db.exec(sql); },
  pragma(s)    { return db.exec('PRAGMA ' + s + ';'); },
  transaction(fn) {
    return (...args) => {
      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (e) {
        try { db.exec('ROLLBACK'); } catch (_) { /* ignore */ }
        throw e;
      }
    };
  },
  close() { db.close(); }
};

module.exports = wrapped;
