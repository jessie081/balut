'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

const SUMMARY_COLS = `
  COALESCE(SUM(total), 0)    AS revenue,
  COALESCE(SUM(quantity), 0) AS units,
  COUNT(*)                   AS count
`;

router.get('/', async (req, res, next) => {
  try {
    const threshold = Number(req.query.lowStock ?? 5);
    const safeThreshold = Number.isFinite(threshold) ? threshold : 5;

    const [today, week, month, days, lowStock] = await Promise.all([
      db.get(`
        SELECT ${SUMMARY_COLS}
        FROM sales
        WHERE sale_date >= date('now') AND sale_date < date('now','+1 day')
      `),
      db.get(`
        SELECT ${SUMMARY_COLS}
        FROM sales
        WHERE sale_date >= date('now','-6 days')
      `),
      db.get(`
        SELECT ${SUMMARY_COLS}
        FROM sales
        WHERE sale_date >= date('now','start of month')
      `),
      db.all(`
        SELECT date(sale_date) AS day, COALESCE(SUM(total),0) AS revenue
        FROM sales
        WHERE sale_date >= date('now','-6 days')
        GROUP BY day
        ORDER BY day
      `),
      db.all(
        'SELECT id, name, price, stock FROM products WHERE stock < ? ORDER BY stock ASC, name COLLATE NOCASE',
        safeThreshold
      )
    ]);

    // Pad missing days so the chart always shows 7 bars (UTC-aligned).
    const chart = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().slice(0, 10);
      const found = days.find(r => r.day === key);
      chart.push({ day: key, revenue: found ? Number(found.revenue) : 0 });
    }

    res.json({ today, week, month, last7: chart, lowStock });
  } catch (e) { next(e); }
});

module.exports = router;
