'use strict';

// GET /api/history?from=...&to=...&type=...
// Returns sales and rejects merged, newest first.
// Each row has a `type` field: 'sale' or 'reject'.

const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { from, to, type } = req.query;
    const filterType = String(type || 'all').toLowerCase();
    if (!['all', 'sale', 'reject'].includes(filterType)) {
      const err = new Error('type must be one of: all, sale, reject');
      err.status = 400;
      throw err;
    }

    const buildWhere = (col) => {
      const parts = [];
      if (from) parts.push(`${col} >= ?`);
      if (to)   parts.push(`${col} <= ?`);
      return parts.length ? ' WHERE ' + parts.join(' AND ') : '';
    };

    const salesParams  = [];
    if (from) salesParams.push(String(from));
    if (to)   salesParams.push(String(to));
    const rejectParams = [...salesParams];

    const sales = filterType === 'reject' ? [] : await db.all(`
      SELECT 'sale'       AS type,
             id,
             product_name AS productName,
             quantity,
             unit_price   AS unitPrice,
             total,
             customer_name AS customerName,
             NULL          AS reason,
             NULL          AS notes,
             sale_date     AS eventDate
      FROM sales
      ${buildWhere('sale_date')}
    `, ...salesParams);

    const rejects = filterType === 'sale' ? [] : await db.all(`
      SELECT 'reject'     AS type,
             id,
             product_name AS productName,
             quantity,
             NULL          AS unitPrice,
             NULL          AS total,
             NULL          AS customerName,
             reason,
             notes,
             created_at    AS eventDate
      FROM rejects
      ${buildWhere('created_at')}
    `, ...rejectParams);

    const merged = [...sales, ...rejects].sort((a, b) => {
      // Descending by date string (ISO-like), then by id desc
      if (b.eventDate > a.eventDate) return 1;
      if (b.eventDate < a.eventDate) return -1;
      return b.id - a.id;
    });

    res.json(merged);
  } catch (e) { next(e); }
});

module.exports = router;
