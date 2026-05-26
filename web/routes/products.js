'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

const selectAll  = db.prepare('SELECT id, name, price, stock FROM products ORDER BY name COLLATE NOCASE');
const selectById = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?');
const insertOne  = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)');
const updateOne  = db.prepare('UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?');
const deleteOne  = db.prepare('DELETE FROM products WHERE id = ?');
const countSales = db.prepare('SELECT COUNT(*) AS c FROM sales WHERE product_id = ?');

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

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

router.get('/', (_req, res) => {
  res.json(selectAll.all());
});

router.get('/:id', (req, res, next) => {
  try {
    const row = selectById.get(Number(req.params.id));
    if (!row) throw httpError(404, 'product not found');
    res.json(row);
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    validate(req.body);
    const { name, price, stock } = req.body;
    const info = insertOne.run(name.trim(), Number(price), Number(stock));
    res.status(201).json(selectById.get(info.lastInsertRowid));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return next(httpError(409, 'a product with that name already exists'));
    }
    next(e);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = selectById.get(id);
    if (!existing) throw httpError(404, 'product not found');

    const merged = {
      name:  req.body.name  ?? existing.name,
      price: req.body.price ?? existing.price,
      stock: req.body.stock ?? existing.stock
    };
    validate(merged);
    updateOne.run(merged.name.trim(), Number(merged.price), Number(merged.stock), id);
    res.json(selectById.get(id));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return next(httpError(409, 'a product with that name already exists'));
    }
    next(e);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = selectById.get(id);
    if (!existing) throw httpError(404, 'product not found');

    const sales = countSales.get(id).c;
    if (sales > 0) {
      throw httpError(409, `cannot delete: ${sales} sale(s) exist for this product`);
    }
    deleteOne.run(id);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
