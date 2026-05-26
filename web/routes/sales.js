'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

const baseSelect = `
  SELECT id, product_id AS productId, product_name AS productName,
         quantity, unit_price AS unitPrice, total,
         customer_name AS customerName, sale_date AS saleDate
  FROM sales
`;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// GET /api/sales?from=...&to=...
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = [];
    const params = [];
    if (from) { where.push('sale_date >= ?'); params.push(String(from)); }
    if (to)   { where.push('sale_date <= ?'); params.push(String(to)); }
    const sql = baseSelect + (where.length ? ' WHERE ' + where.join(' AND ') : '') +
                ' ORDER BY sale_date DESC, id DESC';
    res.json(await db.all(sql, ...params));
  } catch (e) { next(e); }
});

// GET /api/sales/export.csv
router.get('/export.csv', async (_req, res, next) => {
  try {
    const rows = await db.all(baseSelect + ' ORDER BY sale_date DESC, id DESC');
    const header = 'id,productName,quantity,unitPrice,total,customerName,saleDate\n';
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map(r => [
      r.id, r.productName, r.quantity, r.unitPrice, r.total, r.customerName ?? '', r.saleDate
    ].map(escape).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="balut-sales.csv"');
    res.send(header + body + '\n');
  } catch (e) { next(e); }
});

// POST /api/sales – atomic stock deduction
router.post('/', async (req, res, next) => {
  try {
    const { productId, quantity, unitPrice, customerName } = req.body || {};

    const pid = Number(productId);
    const qty = Number(quantity);
    if (!Number.isInteger(pid) || pid <= 0) throw httpError(400, 'productId is required');
    if (!Number.isInteger(qty) || qty <= 0) throw httpError(400, 'quantity must be a positive integer');

    const product = await db.get('SELECT id, name, price, stock FROM products WHERE id = ?', pid);
    if (!product) throw httpError(404, 'product not found');

    const price = unitPrice === undefined || unitPrice === null || unitPrice === ''
      ? Number(product.price)
      : Number(unitPrice);
    if (!Number.isFinite(price) || price < 0) throw httpError(400, 'unitPrice must be a non-negative number');

    const total = +(price * qty).toFixed(2);

    const id = await db.transaction(async (tx) => {
      const r = await tx.run(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        qty, pid, qty
      );
      if (r.changes === 0) {
        throw httpError(409, `not enough stock (available: ${product.stock})`);
      }
      const ins = await tx.run(
        `INSERT INTO sales (product_id, product_name, quantity, unit_price, total, customer_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        pid, product.name, qty, price, total,
        customerName ? String(customerName).trim() : null
      );
      return ins.lastInsertRowid;
    });

    const sale = await db.get(`${baseSelect} WHERE id = ?`, id);
    res.status(201).json(sale);
  } catch (e) { next(e); }
});

module.exports = router;
