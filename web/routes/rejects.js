'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_REASONS = ['Bugok', 'Cracked Shell', 'Damaged', 'Customer Return', 'Expired', 'Other'];

const baseSelect = `
  SELECT id, product_id AS productId, product_name AS productName,
         quantity, reason, notes, created_at AS createdAt
  FROM rejects
`;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// GET /api/rejects?from=...&to=...
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where  = [];
    const params = [];
    if (from) { where.push('created_at >= ?'); params.push(String(from)); }
    if (to)   { where.push('created_at <= ?'); params.push(String(to)); }
    const sql = baseSelect +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ' ORDER BY created_at DESC, id DESC';
    res.json(await db.all(sql, ...params));
  } catch (e) { next(e); }
});

// POST /api/rejects – atomic: insert reject + deduct stock
router.post('/', async (req, res, next) => {
  try {
    const { productId, quantity, reason, customReason, notes } = req.body || {};

    const pid = Number(productId);
    const qty = Number(quantity);
    if (!Number.isInteger(pid) || pid <= 0) throw httpError(400, 'productId is required');
    if (!Number.isInteger(qty) || qty <= 0) throw httpError(400, 'quantity must be a positive integer');

    if (!reason || !String(reason).trim()) throw httpError(400, 'reason is required');
    const reasonStr = String(reason).trim();
    if (!VALID_REASONS.includes(reasonStr)) throw httpError(400, `reason must be one of: ${VALID_REASONS.join(', ')}`);

    const finalReason = reasonStr === 'Other'
      ? String(customReason || '').trim()
      : reasonStr;
    if (!finalReason) throw httpError(400, 'customReason is required when reason is Other');

    const notesStr = notes ? String(notes).trim().slice(0, 500) : null;

    const product = await db.get('SELECT id, name, stock FROM products WHERE id = ?', pid);
    if (!product) throw httpError(404, 'product not found');

    const id = await db.transaction(async (tx) => {
      const r = await tx.run(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        qty, pid, qty
      );
      if (r.changes === 0) {
        throw httpError(409, `Only ${product.stock} egg${product.stock !== 1 ? 's' : ''} are currently available.`);
      }
      const ins = await tx.run(
        `INSERT INTO rejects (product_id, product_name, quantity, reason, notes)
         VALUES (?, ?, ?, ?, ?)`,
        pid, product.name, qty, finalReason, notesStr
      );
      return ins.lastInsertRowid;
    });

    const reject = await db.get(`${baseSelect} WHERE id = ?`, id);
    res.status(201).json(reject);
  } catch (e) { next(e); }
});

module.exports = router;
