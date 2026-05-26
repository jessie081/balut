'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function validate({ name, price, stock }, { partial = false } = {}) {
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'name is required');
  }
  if (!partial || price !== undefined) {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) throw httpError(400, 'price must be a non-negative number');
  }
  if (!partial || stock !== undefined) {
    const s = Number(stock);
    if (!Number.isInteger(s) || s < 0) throw httpError(400, 'stock must be a non-negative integer');
  }
}

router.get('/', async (_req, res, next) => {
  try {
    const rows = await db.all('SELECT id, name, price, stock FROM products ORDER BY name COLLATE NOCASE');
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await db.get('SELECT id, name, price, stock FROM products WHERE id = ?', Number(req.params.id));
    if (!row) throw httpError(404, 'product not found');
    res.json(row);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    validate(req.body);
    const { name, price, stock } = req.body;
    const info = await db.run(
      'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
      name.trim(), Number(price), Number(stock)
    );
    const row = await db.get('SELECT id, name, price, stock FROM products WHERE id = ?', info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    if (isUniqueViolation(e)) return next(httpError(409, 'a product with that name already exists'));
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.get('SELECT id, name, price, stock FROM products WHERE id = ?', id);
    if (!existing) throw httpError(404, 'product not found');

    const merged = {
      name:  req.body.name  ?? existing.name,
      price: req.body.price ?? existing.price,
      stock: req.body.stock ?? existing.stock
    };
    validate(merged);
    await db.run(
      'UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?',
      merged.name.trim(), Number(merged.price), Number(merged.stock), id
    );
    res.json(await db.get('SELECT id, name, price, stock FROM products WHERE id = ?', id));
  } catch (e) {
    if (isUniqueViolation(e)) return next(httpError(409, 'a product with that name already exists'));
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.get('SELECT id FROM products WHERE id = ?', id);
    if (!existing) throw httpError(404, 'product not found');

    const row = await db.get('SELECT COUNT(*) AS c FROM sales WHERE product_id = ?', id);
    const sales = Number(row.c);
    if (sales > 0) throw httpError(409, `cannot delete: ${sales} sale(s) exist for this product`);

    await db.run('DELETE FROM products WHERE id = ?', id);
    res.status(204).end();
  } catch (e) { next(e); }
});

function isUniqueViolation(e) {
  const msg = String(e?.message || '');
  return /UNIQUE/i.test(msg) || e?.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

module.exports = router;
