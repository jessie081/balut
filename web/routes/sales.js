'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

const selectProduct = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?');
const decrementStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
const insertSale = db.prepare(`
  INSERT INTO sales (product_id, product_name, quantity, unit_price, total, customer_name, sale_date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const selectSaleById = db.prepare('SELECT * FROM sales WHERE id = ?');

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

// GET /api/sales?from=ISO&to=ISO
router.get('/', (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = [];
    const params = [];
    if (from) { where.push('sale_date >= ?'); params.push(String(from)); }
    if (to)   { where.push('sale_date <= ?'); params.push(String(to)); }
    const sql = baseSelect + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sale_date DESC, id DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { next(e); }
});

// GET /api/sales/export.csv – streams a CSV download
router.get('/export.csv', (req, res, next) => {
  try {
    const rows = db.prepare(baseSelect + ' ORDER BY sale_date DESC, id DESC').all();
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

// POST /api/sales – record a sale (atomic stock deduction)
router.post('/', (req, res, next) => {
  try {
    const { productId, quantity, unitPrice, customerName, saleDate } = req.body || {};

    const pid = Number(productId);
    const qty = Number(quantity);
    if (!Number.isInteger(pid) || pid <= 0) throw httpError(400, 'productId is required');
    if (!Number.isInteger(qty) || qty <= 0) throw httpError(400, 'quantity must be a positive integer');

    const product = selectProduct.get(pid);
    if (!product) throw httpError(404, 'product not found');

    const price = unitPrice === undefined || unitPrice === null || unitPrice === ''
      ? product.price
      : Number(unitPrice);
    if (!Number.isFinite(price) || price < 0) throw httpError(400, 'unitPrice must be a non-negative number');

    const when = saleDate ? new Date(saleDate) : new Date();
    if (Number.isNaN(when.getTime())) throw httpError(400, 'saleDate is invalid');
    const isoDate = when.toISOString().slice(0, 19).replace('T', ' ');

    const total = +(price * qty).toFixed(2);

    const tx = db.transaction(() => {
      const r = decrementStock.run(qty, pid, qty);
      if (r.changes === 0) {
        throw httpError(409, `not enough stock (available: ${product.stock})`);
      }
      const info = insertSale.run(
        pid, product.name, qty, price, total,
        customerName ? String(customerName).trim() : null,
        isoDate
      );
      return info.lastInsertRowid;
    });

    const id = tx();
    res.status(201).json(selectSaleById.get(id));
  } catch (e) { next(e); }
});

module.exports = router;
