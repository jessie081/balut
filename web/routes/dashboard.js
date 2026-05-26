'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

// SQLite stores sale_date as 'YYYY-MM-DD HH:MM:SS' UTC (datetime('now')).
// All comparisons use SQLite's date helpers which operate in UTC by default.

const todayStmt = db.prepare(`
  SELECT COALESCE(SUM(total), 0)    AS revenue,
         COALESCE(SUM(quantity), 0) AS units,
         COUNT(*)                   AS count
  FROM sales
  WHERE sale_date >= date('now') AND sale_date < date('now', '+1 day')
`);

// Rolling 7-day window (today and the previous 6 days).
const weekStmt = db.prepare(`
  SELECT COALESCE(SUM(total), 0)    AS revenue,
         COALESCE(SUM(quantity), 0) AS units,
         COUNT(*)                   AS count
  FROM sales
  WHERE sale_date >= date('now', '-6 days')
`);

const monthStmt = db.prepare(`
  SELECT COALESCE(SUM(total), 0)    AS revenue,
         COALESCE(SUM(quantity), 0) AS units,
         COUNT(*)                   AS count
  FROM sales
  WHERE sale_date >= date('now', 'start of month')
`);

const last7Stmt = db.prepare(`
  SELECT date(sale_date) AS day,
         COALESCE(SUM(total), 0) AS revenue
  FROM sales
  WHERE sale_date >= date('now', '-6 days')
  GROUP BY day
  ORDER BY day
`);

const lowStockStmt = db.prepare(`
  SELECT id, name, price, stock
  FROM products
  WHERE stock < ?
  ORDER BY stock ASC, name COLLATE NOCASE
`);

router.get('/', (req, res, next) => {
  try {
    const threshold = Number(req.query.lowStock ?? 5);

    const today = todayStmt.get();
    const week  = weekStmt.get();
    const month = monthStmt.get();
    const days  = last7Stmt.all();

    // Pad missing days so the chart always shows 7 bars (UTC-aligned).
    const chart = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().slice(0, 10);
      const found = days.find(r => r.day === key);
      chart.push({ day: key, revenue: found ? found.revenue : 0 });
    }

    const lowStock = lowStockStmt.all(Number.isFinite(threshold) ? threshold : 5);

    res.json({ today, week, month, last7: chart, lowStock });
  } catch (e) { next(e); }
});

module.exports = router;
