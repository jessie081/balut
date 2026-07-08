/* Balut Web · plain ES module-free JS, talks to /api/*  */
(() => {
  'use strict';

  const pesoFull = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const compactFmt = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 });
  const pesoCompact = (n) => {
    const v = Number(n || 0);
    if (Math.abs(v) < 1000) return pesoFull(v);
    return '₱' + compactFmt.format(v);
  };

  const peso = pesoFull;

  const fmtDate = (s) => {
    if (!s) return '';
    const iso = s.includes('T') ? s : s.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  // ---------- Helpers ----------
  function toSqlDate(d) {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 19).replace('T', ' ');
  }

  function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function skelRows(cols, count = 3) {
    const widths = ['55%', '40%', '65%'];
    return Array.from({ length: count }, (_, i) =>
      `<tr><td class="td" colspan="${cols}"><span class="skel skel-line" style="width:${widths[i % 3]}"></span></td></tr>`
    ).join('');
  }

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

  function toastRetry(msg, retryFn) {
    const el = document.createElement('div');
    el.className = 'toast error';
    el.innerHTML = `${escape(msg)} <button style="margin-left:.5rem;font-weight:600;text-decoration:underline;background:none;border:none;cursor:pointer;color:inherit">Retry</button>`;
    el.querySelector('button').addEventListener('click', () => { el.remove(); retryFn(); });
    toastsEl.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 5000);
    setTimeout(() => el.remove(), 5500);
  }

  function setActionLoading(control, loadingText) {
    if (!control) return () => {};

    const originalHtml = control.innerHTML;
    const originalWidth = control.style.width;
    const width = Math.ceil(control.getBoundingClientRect().width);
    if (width) control.style.width = width + 'px';

    control.classList.add('is-loading');
    control.setAttribute('aria-busy', 'true');
    if ('disabled' in control) control.disabled = true;
    if (control.tagName === 'A') {
      control.setAttribute('aria-disabled', 'true');
      control.tabIndex = -1;
    }
    control.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>${escape(loadingText)}</span>`;

    return () => {
      control.classList.remove('is-loading');
      control.removeAttribute('aria-busy');
      if ('disabled' in control) control.disabled = false;
      if (control.tagName === 'A') {
        control.removeAttribute('aria-disabled');
        control.removeAttribute('tabindex');
      }
      control.innerHTML = originalHtml;
      if (originalWidth) control.style.width = originalWidth;
      else control.style.removeProperty('width');
    };
  }

  async function withActionLoading(control, loadingText, work) {
    const clearLoading = setActionLoading(control, loadingText);
    try {
      return await work();
    } finally {
      clearLoading();
    }
  }

  // ---------- Tabs ----------
  const tabs = ['dashboard', 'sell', 'inventory', 'rejects', 'history'];
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
    if (name === 'rejects')   loadProductsForReject();
    if (name === 'history')   loadHistory();
  }

  // ---------- Dashboard ----------
  let weekChart;
  let isRefreshing = false;
  let dashHasData  = false;

  function skelCard(cardId) {
    const card = document.getElementById(cardId);
    card.classList.add('stat-card-loading');
    card.querySelectorAll('.skel').forEach(s => s.style.display = '');
    card.querySelectorAll('.card-label, .card-value, .card-sub').forEach(el => el.style.display = 'none');
  }

  function revealCard(cardId) {
    const card = document.getElementById(cardId);
    card.querySelectorAll('.skel').forEach(s => s.style.display = 'none');
    card.querySelectorAll('.card-label, .card-value, .card-sub').forEach(el => {
      el.style.display = '';
      el.classList.add('dash-loaded');
    });
    card.classList.remove('stat-card-loading');
  }

  async function loadDashboard(options = {}) {
    const { trigger = null, showToast = false } = options;
    if (isRefreshing) return;
    isRefreshing = true;

    const clearLoading = trigger ? setActionLoading(trigger, 'Refreshing...') : null;

    const chartOverlay  = document.getElementById('chart-overlay');
    const chartSkeleton = document.getElementById('chart-skeleton');
    const chartCanvas   = document.getElementById('chart-week');

    if (!dashHasData) {
      skelCard('card-today'); skelCard('card-week'); skelCard('card-month');
      chartSkeleton.style.display = '';
      chartCanvas.style.display   = 'none';
    } else {
      chartOverlay.style.display = '';
    }

    try {
      const d = await api('/dashboard');
      dashHasData = true;

      const setStatCard = (cardId, elId, hintId, rev, units, count) => {
        const el = document.getElementById(elId);
        el.textContent = pesoCompact(rev);
        el.title = pesoFull(rev);
        document.getElementById(hintId).textContent = `${units} units · ${count} sales`;
        revealCard(cardId);
      };
      setStatCard('card-today', 'stat-today', 'stat-today-units', d.today.revenue, d.today.units, d.today.count);
      setStatCard('card-week',  'stat-week',  'stat-week-units',  d.week.revenue,  d.week.units,  d.week.count);
      setStatCard('card-month', 'stat-month', 'stat-month-units', d.month.revenue, d.month.units, d.month.count);

      const labels = d.last7.map(r => new Date(r.day + 'T00:00:00Z').toLocaleDateString('en-PH', { weekday: 'short' }));
      const values = d.last7.map(r => r.revenue);
      chartSkeleton.style.display = 'none';
      chartCanvas.style.display   = '';
      chartCanvas.classList.add('dash-loaded');
      const ctx = chartCanvas.getContext('2d');
      if (weekChart) weekChart.destroy();
      weekChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Revenue', data: values, backgroundColor: '#f5b400', borderRadius: 6, maxBarThickness: 48 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₱' + v } }, x: { grid: { display: false } } } }
      });

      const ul = document.getElementById('low-stock');
      if (!d.lowStock.length) {
        ul.innerHTML = '<li class="py-3 dash-loaded" style="color:var(--yolk-700);opacity:.6">All stocked up 🎉</li>';
      } else {
        ul.innerHTML = d.lowStock.map(p => `
          <li class="py-2 flex items-center justify-between dash-loaded">
            <span>${escape(p.name)}</span>
            <span class="font-semibold" style="color:${p.stock === 0 ? '#dc2626' : 'var(--yolk-800)'}">${p.stock} left</span>
          </li>`).join('');
      }

      const ts = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      document.getElementById('dash-last-updated').textContent = `Updated ${ts}`;
      if (showToast) toast('Dashboard refreshed.', 'success');

    } catch (e) {
      if (!dashHasData) {
        ['card-today', 'card-week', 'card-month'].forEach(id => {
          const card = document.getElementById(id);
          card.querySelectorAll('.skel').forEach(s => s.style.display = 'none');
          card.classList.remove('stat-card-loading');
        });
        chartSkeleton.style.display = 'none';
      }
      toastRetry(e.message, () => loadDashboard({ trigger, showToast }));
    } finally {
      isRefreshing = false;
      chartOverlay.style.display = 'none';
      if (clearLoading) clearLoading();
    }
  }
  document.getElementById('refresh-dash').addEventListener('click', (e) => loadDashboard({ trigger: e.currentTarget, showToast: true }));

  // ---------- Sell ----------
  let productCache = [];

  async function loadProductsForSale() {
    const skel = document.getElementById('sell-skeleton');
    const form = document.getElementById('sale-form');
    skel.style.display = '';
    form.style.display = 'none';
    try {
      productCache = await api('/products');
      const sel = document.getElementById('sale-product');
      sel.innerHTML = productCache.length
        ? productCache.map(p => `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">${escape(p.name)} — ${peso(p.price)} (${p.stock} in stock)</option>`).join('')
        : '<option value="">No products – add one in Inventory</option>';
      syncSaleFromSelection();
      skel.style.display = 'none';
      form.style.display = '';
      form.classList.add('dash-loaded');
    } catch (e) {
      skel.style.display = 'none';
      form.style.display = '';
      toast(e.message, 'error');
    }
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
    if (val === '' || val === null || val === undefined) return '';
    if (isNaN(v) || !isFinite(v)) return 'Unit price must be a number.';
    if (v < 0.01) return 'Unit price must be at least ₱0.01.';
    if (v > MAX_PRICE) return `Unit price cannot exceed ${peso(MAX_PRICE)}.`;
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
    const productId    = Number(document.getElementById('sale-product').value);
    const quantity     = Number(document.getElementById('sale-qty').value);
    const unitPrice    = Number(document.getElementById('sale-price').value);
    const customerName = document.getElementById('sale-customer').value.trim() || null;

    if (!productId) return toast('Pick a product first', 'error');
    const priceError = validatePrice(String(unitPrice));
    if (priceError) { applyPriceValidation(); return toast(priceError, 'error'); }

    const opt   = document.getElementById('sale-product').options[document.getElementById('sale-product').selectedIndex];
    const stock = Number(opt?.dataset.stock || 0);
    if (quantity > stock) return toast(`Only ${stock} in stock`, 'error');

    const btn = e.submitter;
    try {
      await withActionLoading(btn, 'Recording...', async () => {
        await api('/sales', { method: 'POST', body: { productId, quantity, unitPrice, customerName } });
        toast('Sale recorded successfully.', 'success');
        e.target.reset();
        document.getElementById('sale-price').dataset.touched = '';
        document.getElementById('sale-qty').value = 1;
        await loadProductsForSale();
        if (dashHasData) loadDashboard();
        loadInventory();
        loadHistory();
        loadProductsForReject();
      });
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('sale-form').addEventListener('reset', () => {
    setTimeout(() => {
      document.getElementById('sale-price').dataset.touched = '';
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
    body.innerHTML = skelRows(4);
    try {
      const items = await api('/products');
      if (!items.length) {
        body.innerHTML = '<tr><td colspan="4" class="td" style="color:var(--yolk-700);opacity:.6">No products yet. Click "Add product".</td></tr>';
        return;
      }
      body.innerHTML = items.map(p => `
        <tr class="dash-loaded">
          <td class="td font-medium">${escape(p.name)}</td>
          <td class="td text-right">${peso(p.price)}</td>
          <td class="td text-right ${p.stock < 5 ? 'text-red-600 font-semibold' : ''}">${p.stock}</td>
          <td class="td text-right space-x-2">
            <button class="btn-ghost" data-edit="${p.id}">Edit</button>
            <button class="btn-danger" data-delete="${p.id}">Delete</button>
          </td>
        </tr>`).join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="4" class="td" style="color:#dc2626">${escape(e.message)}</td></tr>`;
      toast(e.message, 'error');
    }
  }

  document.getElementById('inv-body').addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId  = e.target.getAttribute('data-delete');
    if (editId) {
      const product = await api('/products/' + editId);
      openProductDialog(product);
    } else if (delId) {
      if (!confirm('Delete this product? Sales for it must be removed first.')) return;
      const btn = e.target.closest('button');
      try {
        await withActionLoading(btn, 'Deleting...', async () => {
          await api('/products/' + delId, { method: 'DELETE' });
          toast('Product deleted successfully.', 'success');
          loadInventory();
          loadProductsForSale();
          loadProductsForReject();
          if (dashHasData) loadDashboard();
        });
      } catch (err) { toast(err.message, 'error'); }
    }
  });

  const dlg = document.getElementById('product-dialog');
  document.getElementById('add-product-btn').addEventListener('click', () => openProductDialog());
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());

  function openProductDialog(product) {
    document.getElementById('product-dialog-title').textContent = product ? 'Edit product' : 'Add product';
    document.getElementById('product-id').value    = product?.id ?? '';
    document.getElementById('product-name').value  = product?.name ?? '';
    document.getElementById('product-price').value = product?.price ?? '';
    document.getElementById('product-stock').value = product?.stock ?? 0;
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

    const btn = e.submitter;
    try {
      await withActionLoading(btn, 'Saving...', async () => {
        if (id) await api('/products/' + id, { method: 'PUT', body: { name, price, stock } });
        else    await api('/products',       { method: 'POST', body: { name, price, stock } });
        dlg.close();
        toast('Inventory updated.', 'success');
        loadInventory();
        loadProductsForSale();
        loadProductsForReject();
        if (dashHasData) loadDashboard();
      });
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---------- Rejects ----------
  async function loadProductsForReject() {
    const skel = document.getElementById('reject-skeleton');
    const form = document.getElementById('reject-form');
    skel.style.display = '';
    form.style.display = 'none';
    try {
      const products = await api('/products');
      const sel = document.getElementById('reject-product');
      sel.innerHTML = products.length
        ? products.map(p => `<option value="${p.id}" data-stock="${p.stock}">${escape(p.name)} (${p.stock} in stock)</option>`).join('')
        : '<option value="">No products – add one in Inventory</option>';
      syncRejectFromSelection();
      skel.style.display = 'none';
      form.style.display = '';
      form.classList.add('dash-loaded');
    } catch (e) {
      skel.style.display = 'none';
      form.style.display = '';
      toast(e.message, 'error');
    }
  }

  function syncRejectFromSelection() {
    const sel = document.getElementById('reject-product');
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      document.getElementById('reject-stock-hint').textContent = '';
      return;
    }
    const stock = Number(opt.dataset.stock);
    document.getElementById('reject-stock-hint').textContent = `Available: ${stock} egg${stock !== 1 ? 's' : ''}`;
    document.getElementById('reject-qty').max = stock || '';
  }

  document.getElementById('reject-product').addEventListener('change', syncRejectFromSelection);
  document.getElementById('reject-reason').addEventListener('change', (e) => {
    document.getElementById('reject-other-wrap').style.display = e.target.value === 'Other' ? '' : 'none';
  });

  document.getElementById('reject-qty').addEventListener('input', () => {
    const el       = document.getElementById('reject-qty');
    const sel      = document.getElementById('reject-product');
    const opt      = sel.options[sel.selectedIndex];
    const stock    = Number(opt?.dataset.stock || 0);
    const qty      = Number(el.value);
    const errEl    = document.getElementById('reject-qty-error');
    const submitBtn= document.getElementById('reject-submit');
    if (qty > stock) {
      errEl.textContent = `Only ${stock} egg${stock !== 1 ? 's' : ''} are currently available.`;
      errEl.style.display = 'block';
      submitBtn.disabled = true;
    } else {
      errEl.textContent = '';
      errEl.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  document.getElementById('reject-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = Number(document.getElementById('reject-product').value);
    const quantity  = Number(document.getElementById('reject-qty').value);
    const reason    = document.getElementById('reject-reason').value;
    const customReason = document.getElementById('reject-other').value.trim();
    const notes     = document.getElementById('reject-notes').value.trim() || null;

    if (!productId) return toast('Pick a product first', 'error');
    if (!reason)    return toast('Reason is required', 'error');
    if (reason === 'Other' && !customReason) {
      return toast('Custom reason is required when selecting "Other"', 'error');
    }

    const sel   = document.getElementById('reject-product');
    const opt   = sel.options[sel.selectedIndex];
    const stock = Number(opt?.dataset.stock || 0);
    if (quantity > stock) return toast(`Only ${stock} egg${stock !== 1 ? 's' : ''} are currently available.`, 'error');

    const btn = e.submitter;
    try {
      await withActionLoading(btn, 'Recording...', async () => {
        await api('/rejects', { method: 'POST', body: { productId, quantity, reason, customReason, notes } });
        const prodName = opt.textContent.split('(')[0].trim();
        toast(`Reject recorded successfully. ${quantity} ${prodName} egg${quantity !== 1 ? 's' : ''} marked as ${reason === 'Other' ? customReason : reason}.`, 'success');
        e.target.reset();
        if (dashHasData) loadDashboard();
        loadInventory();
        loadHistory();
        await loadProductsForReject();
      });
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('reject-form').addEventListener('reset', () => {
    setTimeout(() => {
      document.getElementById('reject-other-wrap').style.display = 'none';
      document.getElementById('reject-qty-error').textContent = '';
      document.getElementById('reject-qty-error').style.display = 'none';
      document.getElementById('reject-submit').disabled = false;
      syncRejectFromSelection();
    }, 0);
  });

  // ---------- History ----------
  async function loadHistory() {
    const list   = document.getElementById('hist-list');
    const range  = document.getElementById('hist-range').value;
    const type   = document.getElementById('hist-type').value;
    const params = new URLSearchParams();
    const now    = new Date();

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
    if (type && type !== 'all') params.set('type', type);

    // Skeleton cards while loading
    list.innerHTML = Array.from({ length: 3 }, () =>
      `<div class="card" style="padding:1rem"><span class="skel skel-line" style="width:30%;margin-bottom:.6rem"></span><span class="skel skel-line" style="width:70%"></span></div>`
    ).join('');

    try {
      const events = await api('/history' + (params.toString() ? '?' + params : ''));
      if (!events.length) {
        list.innerHTML = '<div class="card" style="text-align:center;padding:2rem;color:var(--yolk-700);opacity:.6">No matching history in this filter.</div>';
        return;
      }
      list.innerHTML = events.map(ev => {
        const isSale = ev.type === 'sale';
        const badge  = isSale
          ? '<span class="badge badge-sale">🟢 Sale</span>'
          : '<span class="badge badge-reject">🔴 Reject</span>';
        const details = isSale
          ? `<div style="font-size:.95rem;margin-top:.3rem"><strong>Qty:</strong> ${ev.quantity} · <strong>Unit:</strong> ${peso(ev.unitPrice)} · <strong>Total:</strong> ${peso(ev.total)}</div>${ev.customerName ? `<div style="font-size:.85rem;margin-top:.25rem;color:var(--yolk-700)"><strong>Customer:</strong> ${escape(ev.customerName)}</div>` : ''}`
          : `<div style="font-size:.95rem;margin-top:.3rem"><strong>Qty:</strong> ${ev.quantity} · <strong>Reason:</strong> ${escape(ev.reason)}</div>${ev.notes ? `<div style="font-size:.85rem;margin-top:.25rem;color:var(--yolk-700)"><em>${escape(ev.notes)}</em></div>` : ''}`;
        return `
          <div class="card history-card dash-loaded">
            <div>${badge}</div>
            <div>
              <div style="font-weight:600;font-size:1rem">${escape(ev.productName)}</div>
              ${details}
            </div>
            <div style="font-size:.85rem;color:var(--yolk-700);white-space:nowrap">${fmtDate(ev.eventDate)}</div>
          </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = `<div class="card" style="color:#dc2626;padding:1rem">${escape(e.message)}</div>`;
      toast(e.message, 'error');
    }
  }
  document.getElementById('hist-range').addEventListener('change', loadHistory);
  document.getElementById('hist-type').addEventListener('change', loadHistory);
  document.getElementById('hist-export').addEventListener('click', async (e) => {
    e.preventDefault();
    const link = e.currentTarget;
    if (link.classList.contains('is-loading')) return;

    try {
      await withActionLoading(link, 'Exporting...', async () => {
        const res = await fetch(link.href);
        if (!res.ok) throw new Error(`Export failed (${res.status})`);

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        const disposition = res.headers.get('content-disposition') || '';
        const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);

        downloadLink.href = url;
        downloadLink.download = filenameMatch ? filenameMatch[1] : 'balut-sales.csv';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('CSV exported successfully.', 'success');
      });
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // ---------- Boot ----------
  const start = (location.hash || '#dashboard').slice(1);
  setTab(tabs.includes(start) ? start : 'dashboard');
})();
