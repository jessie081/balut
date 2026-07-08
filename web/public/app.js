/* Balut Web · plain ES module-free JS, talks to /api/*  */
(() => {
  'use strict';

  const pesoFull = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Compact formatter used on dashboard cards.
  // Always uses compact notation so the value never overflows the card.
  // Small values (< 1000) show two decimal places for precision.
  const compactFmt = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 });
  const pesoCompact = (n) => {
    const v = Number(n || 0);
    if (Math.abs(v) < 1000) return pesoFull(v);   // ₱25.00, ₱294.50
    return '₱' + compactFmt.format(v);             // ₱1.5K, ₱20M, ₱2.4T …
  };

  // Keep the original peso for tables / forms
  const peso = pesoFull;
  const fmtDate = (s) => {
    if (!s) return '';
    // SQLite returns 'YYYY-MM-DD HH:MM:SS' in UTC. Treat as UTC and render local.
    const iso = s.includes('T') ? s : s.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  // ---------- API ----------
  async function api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // ---------- Toasts ----------
  const toastsEl = document.getElementById('toasts');
  function toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    toastsEl.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 2400);
    setTimeout(() => el.remove(), 2800);
  }

  // ---------- Tabs ----------
  const tabs = ['dashboard', 'sell', 'inventory', 'history'];
  const navBtns = document.querySelectorAll('#nav .nav-btn');

  function setTab(name) {
    tabs.forEach(t => document.getElementById('tab-' + t).classList.toggle('hidden', t !== name));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    if (location.hash !== '#' + name) location.hash = '#' + name;
    onTabShown(name);
  }
  navBtns.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  window.addEventListener('hashchange', () => {
    const t = (location.hash || '#dashboard').slice(1);
    if (tabs.includes(t)) setTab(t);
  });

  function onTabShown(name) {
    if (name === 'dashboard') loadDashboard();
    if (name === 'sell')      loadProductsForSale();
    if (name === 'inventory') loadInventory();
    if (name === 'history')   loadHistory();
  }

  // ---------- Dashboard ----------
  let weekChart;
  let isRefreshing = false;

  async function loadDashboard() {
    if (isRefreshing) return;
    isRefreshing = true;

    const btn = document.getElementById('refresh-dash');
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';

    try {
      const d = await api('/dashboard');
      const setStatCard = (elId, hintId, rev, units, count) => {
        const el = document.getElementById(elId);
        el.textContent = pesoCompact(rev);
        el.title = pesoFull(rev);              // full value on hover
        document.getElementById(hintId).textContent = `${units} units · ${count} sales`;
      };
      setStatCard('stat-today',  'stat-today-units',  d.today.revenue,  d.today.units,  d.today.count);
      setStatCard('stat-week',   'stat-week-units',   d.week.revenue,   d.week.units,   d.week.count);
      setStatCard('stat-month',  'stat-month-units',  d.month.revenue,  d.month.units,  d.month.count);

      // chart
      const labels = d.last7.map(r => new Date(r.day + 'T00:00:00Z').toLocaleDateString('en-PH', { weekday: 'short' }));
      const values = d.last7.map(r => r.revenue);
      const ctx = document.getElementById('chart-week').getContext('2d');
      if (weekChart) weekChart.destroy();
      weekChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Revenue',
            data: values,
            backgroundColor: '#f5b400',
            borderRadius: 6,
            maxBarThickness: 48
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => '₱' + v } },
            x: { grid: { display: false } }
          }
        }
      });

      // low stock
      const ul = document.getElementById('low-stock');
      if (!d.lowStock.length) {
        ul.innerHTML = '<li class="py-3 text-yolk-700/60">All stocked up 🎉</li>';
      } else {
        ul.innerHTML = d.lowStock.map(p => `
          <li class="py-2 flex items-center justify-between">
            <span>${escape(p.name)}</span>
            <span class="font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-yolk-800'}">${p.stock} left</span>
          </li>`).join('');
      }

      // Last updated timestamp
      const ts = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      document.getElementById('dash-last-updated').textContent = `Updated ${ts}`;

    } catch (e) {
      toast(e.message, 'error');
    } finally {
      isRefreshing = false;
      const btn = document.getElementById('refresh-dash');
      btn.disabled = false;
      btn.textContent = '↻ Refresh';
    }
  }
  document.getElementById('refresh-dash').addEventListener('click', loadDashboard);

  // ---------- Sell ----------
  let productCache = [];
  async function loadProductsForSale() {
    try {
      productCache = await api('/products');
      const sel = document.getElementById('sale-product');
      sel.innerHTML = productCache.length
        ? productCache.map(p => `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">${escape(p.name)} — ${peso(p.price)} (${p.stock} in stock)</option>`).join('')
        : '<option value="">No products – add one in Inventory</option>';
      syncSaleFromSelection();
    } catch (e) { toast(e.message, 'error'); }
  }

  function syncSaleFromSelection() {
    const sel = document.getElementById('sale-product');
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      document.getElementById('sale-stock-hint').textContent = '';
      document.getElementById('sale-price').value = '';
      updateSaleTotal();
      return;
    }
    const stock = Number(opt.dataset.stock);
    const price = Number(opt.dataset.price);
    document.getElementById('sale-stock-hint').textContent = `${stock} available`;
    const priceEl = document.getElementById('sale-price');
    if (!priceEl.dataset.touched) priceEl.value = price.toFixed(2);
    document.getElementById('sale-qty').max = stock || '';
    updateSaleTotal();
  }
  function updateSaleTotal() {
    const q = Number(document.getElementById('sale-qty').value) || 0;
    const p = Number(document.getElementById('sale-price').value) || 0;
    document.getElementById('sale-total').textContent = peso(q * p);
  }
  const MAX_PRICE = 1_000_000_000;

  function validatePrice(val) {
    const v = Number(val);
    if (val === '' || val === null || val === undefined) return '';        // empty – let required attr handle
    if (isNaN(v) || !isFinite(v))   return 'Unit price must be a number.';
    if (v < 0.01)                   return 'Unit price must be at least ₱0.01.';
    if (v > MAX_PRICE)              return `Unit price cannot exceed ${peso(MAX_PRICE)}.`;
    // reject more than 2 decimal places
    if (Math.round(v * 100) !== v * 100) return 'Unit price can have at most 2 decimal places.';
    return '';
  }

  function applyPriceValidation() {
    const el    = document.getElementById('sale-price');
    const errEl = document.getElementById('sale-price-error');
    const msg   = validatePrice(el.value);
    errEl.textContent = msg;
    errEl.style.display = msg ? 'block' : 'none';
    el.style.borderColor = msg ? '#dc2626' : '';
    el.style.boxShadow   = msg ? '0 0 0 3px rgba(220,38,38,.2)' : '';
    // toggle submit button
    const submit = document.querySelector('#sale-form [type="submit"]');
    if (submit) submit.disabled = !!msg;
    return msg;
  }

  document.getElementById('sale-product').addEventListener('change', syncSaleFromSelection);
  document.getElementById('sale-qty').addEventListener('input', updateSaleTotal);
  document.getElementById('sale-price').addEventListener('input', (e) => {
    e.target.dataset.touched = '1';
    updateSaleTotal();
    applyPriceValidation();
  });
  document.getElementById('sale-price').addEventListener('blur', () => {
    const el = document.getElementById('sale-price');
    if (el.value && !applyPriceValidation()) {
      const v = Number(el.value);
      if (isFinite(v)) el.value = v.toFixed(2);
    }
  });

  document.getElementById('sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = Number(document.getElementById('sale-product').value);
    const quantity  = Number(document.getElementById('sale-qty').value);
    const unitPrice = Number(document.getElementById('sale-price').value);
    const customerName = document.getElementById('sale-customer').value.trim() || null;

    if (!productId) return toast('Pick a product first', 'error');

    // Final price guard before sending to API
    const priceError = validatePrice(String(unitPrice));
    if (priceError) { applyPriceValidation(); return toast(priceError, 'error'); }

    const opt = document.getElementById('sale-product').options[document.getElementById('sale-product').selectedIndex];
    const stock = Number(opt?.dataset.stock || 0);
    if (quantity > stock) return toast(`Only ${stock} in stock`, 'error');

    const btn = e.submitter; btn.disabled = true;
    try {
      await api('/sales', { method: 'POST', body: { productId, quantity, unitPrice, customerName } });
      toast('Sale recorded', 'success');
      e.target.reset();
      document.getElementById('sale-price').dataset.touched = '';
      document.getElementById('sale-qty').value = 1;
      await loadProductsForSale();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('sale-form').addEventListener('reset', () => {
    setTimeout(() => {
      document.getElementById('sale-price').dataset.touched = '';
      // Clear any price validation error on reset
      const errEl = document.getElementById('sale-price-error');
      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      const priceEl = document.getElementById('sale-price');
      priceEl.style.borderColor = '';
      priceEl.style.boxShadow = '';
      const submit = document.querySelector('#sale-form [type="submit"]');
      if (submit) submit.disabled = false;
      syncSaleFromSelection();
    }, 0);
  });

  // ---------- Inventory ----------
  async function loadInventory() {
    const body = document.getElementById('inv-body');
    body.innerHTML = '<tr><td colspan="4" class="td skeleton">Loading…</td></tr>';
    try {
      const items = await api('/products');
      if (!items.length) {
        body.innerHTML = '<tr><td colspan="4" class="td text-yolk-700/60">No products yet. Click “Add product”.</td></tr>';
        return;
      }
      body.innerHTML = items.map(p => `
        <tr>
          <td class="td font-medium">${escape(p.name)}</td>
          <td class="td text-right">${peso(p.price)}</td>
          <td class="td text-right ${p.stock < 5 ? 'text-red-600 font-semibold' : ''}">${p.stock}</td>
          <td class="td text-right space-x-2">
            <button class="btn-ghost" data-edit="${p.id}">Edit</button>
            <button class="btn-danger" data-delete="${p.id}">Delete</button>
          </td>
        </tr>`).join('');
    } catch (e) { toast(e.message, 'error'); }
  }

  // Inventory delegated actions
  document.getElementById('inv-body').addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId  = e.target.getAttribute('data-delete');
    if (editId) {
      const product = await api('/products/' + editId);
      openProductDialog(product);
    } else if (delId) {
      if (!confirm('Delete this product? Sales for it must be removed first.')) return;
      try {
        await api('/products/' + delId, { method: 'DELETE' });
        toast('Product deleted', 'success');
        loadInventory();
      } catch (err) { toast(err.message, 'error'); }
    }
  });

  // Product dialog
  const dlg = document.getElementById('product-dialog');
  document.getElementById('add-product-btn').addEventListener('click', () => openProductDialog());
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());

  function openProductDialog(product) {
    document.getElementById('product-dialog-title').textContent = product ? 'Edit product' : 'Add product';
    document.getElementById('product-id').value     = product?.id ?? '';
    document.getElementById('product-name').value   = product?.name ?? '';
    document.getElementById('product-price').value  = product?.price ?? '';
    document.getElementById('product-stock').value  = product?.stock ?? 0;
    dlg.showModal();
  }

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id    = document.getElementById('product-id').value;
    const name  = document.getElementById('product-name').value.trim();
    const price = Number(document.getElementById('product-price').value);
    const stock = Number(document.getElementById('product-stock').value);

    if (!name) return toast('Name is required', 'error');
    if (!Number.isFinite(price) || price < 0) return toast('Invalid price', 'error');
    if (!Number.isInteger(stock) || stock < 0) return toast('Invalid stock', 'error');

    try {
      if (id) await api('/products/' + id, { method: 'PUT', body: { name, price, stock } });
      else    await api('/products',          { method: 'POST', body: { name, price, stock } });
      dlg.close();
      toast('Saved', 'success');
      loadInventory();
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---------- History ----------
  async function loadHistory() {
    const body = document.getElementById('hist-body');
    const range = document.getElementById('hist-range').value;
    const params = new URLSearchParams();

    const now = new Date();
    if (range === 'today') {
      const start = new Date(now); start.setHours(0,0,0,0);
      params.set('from', toSqlDate(start));
    } else if (range === 'week') {
      const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
      params.set('from', toSqlDate(start));
    } else if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      params.set('from', toSqlDate(start));
    }

    body.innerHTML = '<tr><td colspan="6" class="td skeleton">Loading…</td></tr>';
    try {
      const sales = await api('/sales' + (params.toString() ? '?' + params : ''));
      if (!sales.length) {
        body.innerHTML = '<tr><td colspan="6" class="td text-yolk-700/60">No sales in this range.</td></tr>';
        return;
      }
      body.innerHTML = sales.map(s => `
        <tr>
          <td class="td whitespace-nowrap">${fmtDate(s.saleDate)}</td>
          <td class="td font-medium">${escape(s.productName)}</td>
          <td class="td text-right">${s.quantity}</td>
          <td class="td text-right">${peso(s.unitPrice)}</td>
          <td class="td text-right font-semibold">${peso(s.total)}</td>
          <td class="td">${escape(s.customerName || '—')}</td>
        </tr>`).join('');
    } catch (e) { toast(e.message, 'error'); }
  }
  document.getElementById('hist-range').addEventListener('change', loadHistory);

  function toSqlDate(d) {
    // Convert local Date to UTC 'YYYY-MM-DD HH:MM:SS' for SQLite comparisons.
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0,19).replace('T',' ');
  }

  // ---------- Helpers ----------
  function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // ---------- Boot ----------
  const start = (location.hash || '#dashboard').slice(1);
  setTab(tabs.includes(start) ? start : 'dashboard');
})();
