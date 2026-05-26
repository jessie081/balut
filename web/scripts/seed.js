'use strict';

// Optional seed data – mirrors the original Balut MVP defaults.
const db = require('../db');

const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (count > 0) {
  console.log(`Skipping seed – ${count} product(s) already present.`);
  process.exit(0);
}

const insert = db.prepare(
  'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)'
);

const seed = db.transaction(() => {
  insert.run('Balut', 20, 100);
  insert.run('Penoy', 15, 80);
  insert.run('Aboy',  10, 50);
});

seed();
console.log('Seeded 3 products: Balut, Penoy, Aboy.');
