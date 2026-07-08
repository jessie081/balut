'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const rejectsRouter = require('./routes/rejects');
const historyRouter = require('./routes/history');
const dashboardRouter = require('./routes/dashboard');

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '256kb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// API
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/rejects', rejectsRouter);
app.use('/api/history', historyRouter);
app.use('/api/dashboard', dashboardRouter);

// Static frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { extensions: ['html'] }));

// SPA-ish fallback for non-API routes
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralised JSON error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Balut web listening on http://localhost:${PORT}`));
}

module.exports = app;
