'use strict';

const db = require('../db');

(async () => {
  const row = await db.get('SELECT COUNT(*) AS c FROM products');
  if (Number(row.c) > 0) {
    console.log(`Skipping seed – ${row.c} product(s) already present.`);
    return;
  }
  await db.transaction(async (tx) => {
    await tx.run('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', 'Balut', 20, 100);
    await tx.run('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', 'Penoy', 15, 80);
    await tx.run('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', 'Aboy',  10, 50);
  });
  console.log('Seeded 3 products: Balut, Penoy, Aboy.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
