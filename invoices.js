/**
 * Invoices page — Smart Invoice with PDF preview
 */
const InvoicesPage = (() => {
  let currentItems = [];
  let invoiceCounter = 0;

  const STATUS_MAP = {
    draft: { label: 'Чернетка', cls: 'badge-gray' },
    sent: { label: 'Відправлено', cls: 'badge-blue' },
    paid: { label: 'Оплачено', cls: 'badge-green' },
    overdue: { label: 'Прострочено', cls: 'badge-red' },
    refunded: { label: 'Повернення', cls: 'badge-yellow' },
  };

  function render() {
    const content = document.getElementById('content');
    invoiceCounter = Store.getAll('invoices').length;

    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Інвойси</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Виставляйте рахунки та відстежуйте оплати</p>
          </div>
          <button id="create-invoice-btn" class="btn-primary self-start sm:self-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Створити інвойс
          </button>
        </div>

        <!-- Summary cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="invoice-stats"></div>

        <!-- Table -->
        <div class="card overflow-hidden p-0">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 text-left">
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">№</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Клієнт</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Дата</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Термін</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сума</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Дії</th>
                </tr>
              </thead>
              <tbody id="invoices-tbody" class="divide-y divide-gray-100 dark:divide-gray-700"></tbody>
            </table>
          </div>
          <div id="invoices-empty" class="hidden text-center py-16">
            <div class="text-6xl mb-4">🧾</div>
            <p class="text-gray-500 dark:text-gray-400 font-medium">Немає інвойсів</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Натисніть «Створити інвойс» щоб виставити перший рахунок</p>
          </div>
        </div>
      </div>
    `;

    _renderStats();
    _renderTable();

    document.getElementById('create-invoice-btn').addEventListener('click', () => _openForm());
  }

  function _renderStats() {
    const all = Store.getAll('invoices');
    const paid = all.filter(i => i.status === 'paid');
    const sent = all.filter(i => i.status === 'sent');
    const overdue = all.filter(i => i.status === 'overdue');

    const st = [
      { label: 'Всього', value: all.length, sub: 'інвойсів', color: 'indigo' },
      { label: 'Оплачено', value: _fmt(paid.reduce((s,i) => s+(parseFloat(i.total)||0), 0)), sub: `${paid.length} інвойсів`, color: 'green' },
      { label: 'В очікуванні', value: _fmt(sent.reduce((s,i) => s+(parseFloat(i.total)||0), 0)), sub: `${sent.length} інвойсів`, color: 'blue' },
      { label: 'Прострочено', value: overdue.length, sub: 'інвойсів', color: 'red' },
    ];

    const cm = { indigo:'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400', green:'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400', blue:'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400', red:'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' };

    document.getElementById('invoice-stats').innerHTML = st.map(s => `
      <div class="card py-3">
        <p class="text-xs text-gray-400 uppercase font-medium">${s.label}</p>
        <p class="text-xl font-bold ${cm[s.color].split(' ')[0]} mt-1">${s.value}</p>
        <p class="text-xs text-gray-400 mt-0.5">${s.sub}</p>
      </div>
    `).join('');
  }

  function _renderTable() {
    const all = Store.getAll('invoices').slice().reverse();
    const clients = Store.getAll('clients');
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c; });

    const tbody = document.getElementById('invoices-tbody');
    const empty = document.getElementById('invoices-empty');

    if (!all.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    tbody.innerHTML = all.map(inv => {
      const client = clientMap[inv.clientId];
      const st = STATUS_MAP[inv.status] || { label: inv.status, cls: 'badge-gray' };
      return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
          <td class="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">#${inv.number}</td>
          <td class="px-4 py-3">
            <p class="font-medium text-gray-800 dark:text-gray-100">${client?.name || '—'}</p>
            ${client?.company ? `<p class="text-xs text-gray-500">${client.company}</p>` : ''}
          </td>
          <td class="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">${inv.issueDate || '—'}</td>
          <td class="px-4 py-3 hidden md:table-cell">
            ${inv.dueDate ? `<span class="${new Date(inv.dueDate) < new Date() && inv.status !== 'paid' ? 'text-red-500 font-semibold' : 'text-gray-600 dark:text-gray-400'}">${inv.dueDate}</span>` : '—'}
          </td>
          <td class="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">${_fmt(inv.total)}</td>
          <td class="px-4 py-3">
            <select data-id="${inv.id}" class="inv-status-select text-xs rounded-lg px-2 py-1 font-medium border-0 cursor-pointer
              ${inv.status === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                inv.status === 'sent' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                inv.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                inv.status === 'refunded' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">
              ${Object.entries(STATUS_MAP).map(([v, s]) => `<option value="${v}" ${inv.status === v ? 'selected':''}>${s.label}</option>`).join('')}
            </select>
            ${inv.isRefunded ? '<span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">↩️ Повернення</span>' : ''}
          </td>
          <td class="px-4 py-3 text-right">
            <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              ${inv.status === 'paid' || inv.isRefunded ? `
              <button class="btn-icon payer-info-invoice" data-id="${inv.id}" title="Дані платника">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </button>` : ''}
              ${inv.status === 'paid' && !inv.isRefunded ? `
              <button class="btn-icon refund-invoice text-orange-500" data-id="${inv.id}" title="Повернути кошти">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
              </button>` : ''}
              <button class="btn-icon preview-invoice" data-id="${inv.id}" title="Перегляд PDF">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
              <button class="btn-icon edit-invoice" data-id="${inv.id}" title="Редагувати">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger delete-invoice" data-id="${inv.id}" title="Видалити">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.preview-invoice').forEach(btn => btn.addEventListener('click', () => _showPreview(btn.dataset.id)));
    tbody.querySelectorAll('.edit-invoice').forEach(btn => btn.addEventListener('click', () => _openForm(btn.dataset.id)));
    tbody.querySelectorAll('.delete-invoice').forEach(btn => btn.addEventListener('click', () => _confirmDelete(btn.dataset.id)));
    tbody.querySelectorAll('.payer-info-invoice').forEach(btn => btn.addEventListener('click', () => _showPayerInfo(btn.dataset.id)));
    tbody.querySelectorAll('.refund-invoice').forEach(btn => btn.addEventListener('click', () => _confirmRefund(btn.dataset.id)));
    tbody.querySelectorAll('.inv-status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        Store.update('invoices', sel.dataset.id, { status: sel.value });
        const inv = Store.getById('invoices', sel.dataset.id);
        Notifications.add(`Інвойс #${inv.number}: статус змінено на «${STATUS_MAP[sel.value]?.label}»`);
        EventBus.emit('data:changed');
        _renderStats();
        _renderTable();
      });
    });
  }

  function _openForm(id) {
    const invoice = id ? Store.getById('invoices', id) : null;
    const clients = Store.getAll('clients');
    currentItems = invoice?.items ? JSON.parse(JSON.stringify(invoice.items)) : [{ description: '', qty: 1, price: 0 }];

    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    // Отримуємо основний рахунок для підтягування за замовчуванням
    const defaultCurrency = invoice?.currency || 'UAH';
    const primaryAccount = BankAccountsService.getPrimary(defaultCurrency);

    Modal.open({
      title: invoice ? `Редагувати інвойс #${invoice.number}` : 'Новий інвойс',
      size: 'xl',
      content: `
        <form id="invoice-form" class="space-y-5">
          <!-- Client + dates -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-1">
              <label class="label">Клієнт *</label>
              <select name="clientId" class="input" required>
                <option value="">— Оберіть клієнта —</option>
                ${clients.map(c => `<option value="${c.id}" ${invoice?.clientId === c.id ? 'selected':''}>${c.name}${c.company ? ` (${c.company})` : ''}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Дата виставлення *</label>
              <input name="issueDate" type="date" class="input" value="${invoice?.issueDate || today}" required />
            </div>
            <div>
              <label class="label">Термін оплати</label>
              <input name="dueDate" type="date" class="input" value="${invoice?.dueDate || nextMonth}" />
            </div>
          </div>

          <!-- Currency + bank account -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label class="label">Валюта</label>
              <select name="currency" class="input" id="invoice-currency-select">
                ${CurrencyService.getSelectOptions(invoice?.currency || 'UAH')}
              </select>
            </div>
            <div>
              <label class="label">ПДВ (%)</label>
              <select name="vatRate" class="input" id="vat-rate-select">
                <option value="0" ${(invoice?.vatRate||0)==0?'selected':''}>0% (без ПДВ)</option>
                <option value="7" ${invoice?.vatRate==7?'selected':''}>7%</option>
                <option value="20" ${invoice?.vatRate==20?'selected':''}>20%</option>
              </select>
            </div>
            <div>
              <label class="label">Знижка (%)</label>
              <input name="discount" type="number" min="0" max="100" class="input" id="discount-input" value="${invoice?.discount || 0}" placeholder="0" />
            </div>
            <div>
              <label class="label">Статус</label>
              <select name="status" class="input">
                ${Object.entries(STATUS_MAP).map(([v, s]) => `<option value="${v}" ${(invoice?.status||'draft')===v?'selected':''}>${s.label}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Bank account selector -->
          <div id="invoice-bank-account-block">
            ${_renderBankAccountSelector(invoice?.bankAccountId, invoice?.currency || 'UAH')}
          </div>

          <!-- Line items -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="label mb-0">Товари / Послуги *</label>
              <button type="button" id="add-item-btn" class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Додати рядок
              </button>
            </div>
            <div class="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <div class="grid grid-cols-12 gap-0 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                <div class="col-span-5">Опис</div>
                <div class="col-span-2 text-right">Кількість</div>
                <div class="col-span-2 text-right">Ціна</div>
                <div class="col-span-2 text-right">Сума</div>
                <div class="col-span-1"></div>
              </div>
              <div id="line-items-container" class="divide-y divide-gray-100 dark:divide-gray-700"></div>
            </div>
          </div>

          <!-- Totals -->
          <div class="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
            <div class="max-w-xs ml-auto space-y-2 text-sm" id="totals-block"></div>
          </div>

          <!-- Notes -->
          <div>
            <label class="label">Нотатки до рахунку</label>
            <textarea name="notes" rows="2" class="input resize-none" placeholder="Дякуємо за співпрацю! Оплата протягом 30 днів.">${invoice?.notes || ''}</textarea>
          </div>
        </form>
      `,
      onConfirm: () => _saveInvoice(id),
    });

    _renderLineItems();
    _recalc();

    document.getElementById('add-item-btn').addEventListener('click', () => {
      currentItems.push({ description: '', qty: 1, price: 0 });
      _renderLineItems();
      _recalc();
    });

    document.getElementById('vat-rate-select').addEventListener('change', _recalc);
    document.getElementById('discount-input').addEventListener('input', _recalc);

    // При зміні валюти — оновлюємо список рахунків
    document.getElementById('invoice-currency-select')?.addEventListener('change', e => {
      const block = document.getElementById('invoice-bank-account-block');
      if (block) block.innerHTML = _renderBankAccountSelector(null, e.target.value);
    });
  }

  function _renderLineItems() {
    const container = document.getElementById('line-items-container');
    if (!container) return;
    container.innerHTML = currentItems.map((item, i) => `
      <div class="grid grid-cols-12 gap-2 items-center px-3 py-2" data-index="${i}">
        <div class="col-span-5">
          <input type="text" class="input py-1.5 text-sm item-description" data-index="${i}" value="${item.description}" placeholder="Назва послуги/товару" />
        </div>
        <div class="col-span-2">
          <input type="number" min="0.01" step="0.01" class="input py-1.5 text-sm text-right item-qty" data-index="${i}" value="${item.qty}" />
        </div>
        <div class="col-span-2">
          <input type="number" min="0" step="0.01" class="input py-1.5 text-sm text-right item-price" data-index="${i}" value="${item.price}" />
        </div>
        <div class="col-span-2 text-right">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300 item-line-total" data-index="${i}">
            ${_fmtNum((parseFloat(item.qty)||0) * (parseFloat(item.price)||0))}
          </span>
        </div>
        <div class="col-span-1 text-center">
          ${currentItems.length > 1 ? `
            <button type="button" class="text-gray-400 hover:text-red-500 transition-colors remove-item" data-index="${i}">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.item-description').forEach(el => {
      el.addEventListener('input', e => { currentItems[e.target.dataset.index].description = e.target.value; });
    });
    container.querySelectorAll('.item-qty').forEach(el => {
      el.addEventListener('input', e => {
        currentItems[e.target.dataset.index].qty = parseFloat(e.target.value) || 0;
        _updateLineTotal(e.target.dataset.index);
        _recalc();
      });
    });
    container.querySelectorAll('.item-price').forEach(el => {
      el.addEventListener('input', e => {
        currentItems[e.target.dataset.index].price = parseFloat(e.target.value) || 0;
        _updateLineTotal(e.target.dataset.index);
        _recalc();
      });
    });
    container.querySelectorAll('.remove-item').forEach(el => {
      el.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.index);
        currentItems.splice(idx, 1);
        _renderLineItems();
        _recalc();
      });
    });
  }

  function _updateLineTotal(idx) {
    const el = document.querySelector(`.item-line-total[data-index="${idx}"]`);
    if (el) el.textContent = _fmtNum((currentItems[idx].qty||0) * (currentItems[idx].price||0));
  }

  function _recalc() {
    const subtotal = currentItems.reduce((s, i) => s + (parseFloat(i.qty)||0) * (parseFloat(i.price)||0), 0);
    const discountPct = Math.min(100, Math.max(0, parseFloat(document.getElementById('discount-input')?.value || 0)));
    const vatPct = parseFloat(document.getElementById('vat-rate-select')?.value || 0);

    const discountAmt = subtotal * (discountPct / 100);
    const base = subtotal - discountAmt;
    const vatAmt = base * (vatPct / 100);
    const total = base + vatAmt;

    const tb = document.getElementById('totals-block');
    if (!tb) return;
    tb.innerHTML = `
      <div class="flex justify-between text-gray-600 dark:text-gray-400"><span>Підсумок</span><span>${_fmtNum(subtotal)}</span></div>
      ${discountPct > 0 ? `<div class="flex justify-between text-red-500"><span>Знижка ${discountPct}%</span><span>−${_fmtNum(discountAmt)}</span></div>` : ''}
      ${vatPct > 0 ? `<div class="flex justify-between text-gray-600 dark:text-gray-400"><span>ПДВ ${vatPct}%</span><span>+${_fmtNum(vatAmt)}</span></div>` : ''}
      <div class="flex justify-between font-bold text-lg text-gray-800 dark:text-gray-100 border-t border-gray-200 dark:border-gray-600 pt-2">
        <span>Разом</span><span>${_fmtNum(total)}</span>
      </div>
    `;
  }

  function _saveInvoice(id) {
    const form = document.getElementById('invoice-form');
    Validator.clearAllErrors(form);

    let valid = true;
    const clientId = form.clientId.value;
    const issueDate = form.issueDate.value;

    const clientErr = Validator.required(clientId, 'Клієнт');
    if (clientErr) { Validator.showError(form.clientId, clientErr); valid = false; }
    const dateErr = Validator.required(issueDate, 'Дата виставлення');
    if (dateErr) { Validator.showError(form.issueDate, dateErr); valid = false; }

    // Validate line items
    const hasEmpty = currentItems.some(i => !i.description.trim());
    if (hasEmpty || currentItems.length === 0) {
      const container = document.getElementById('line-items-container');
      const err = document.createElement('p');
      err.className = 'text-red-500 text-xs mt-1 validator-error';
      err.textContent = 'Заповніть опис усіх позицій';
      container.parentNode.appendChild(err);
      valid = false;
    }

    if (!valid) return;

    const discountPct = Math.min(100, Math.max(0, parseFloat(form.discount.value || 0)));
    const vatPct = parseFloat(form.vatRate.value || 0);
    const subtotal = currentItems.reduce((s, i) => s + (parseFloat(i.qty)||0) * (parseFloat(i.price)||0), 0);
    const discountAmt = subtotal * (discountPct / 100);
    const base = subtotal - discountAmt;
    const vatAmt = base * (vatPct / 100);
    const total = base + vatAmt;

    const existing = Store.getAll('invoices');
    const number = id
      ? (Store.getById('invoices', id)?.number || (existing.length + 1))
      : (existing.length + 1);

    const data = {
      number: String(number).padStart(4, '0'),
      clientId,
      issueDate,
      dueDate: form.dueDate.value || null,
      currency: form.currency.value,
      vatRate: vatPct,
      discount: discountPct,
      items: JSON.parse(JSON.stringify(currentItems)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountAmt: parseFloat(discountAmt.toFixed(2)),
      vatAmt: parseFloat(vatAmt.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      status: form.status.value,
      notes: form.notes.value.trim(),
      bankAccountId: document.getElementById('invoice-bank-account-select')?.value || '',
    };

    if (id) {
      Store.update('invoices', id, data);
      Notifications.add(`Інвойс #${data.number} оновлено`);
    } else {
      Store.save('invoices', data);
      const client = Store.getById('clients', clientId);
      Notifications.add(`Інвойс #${data.number} виставлено клієнту ${client?.name || ''}`, 'email');
    }

    Modal.close();
    EventBus.emit('data:changed');
    render();
  }

  function _showPreview(id) {
    const inv = Store.getById('invoices', id);
    if (!inv) return;
    const client = Store.getById('clients', inv.clientId);
    const CURR = { UAH:'₴', USD:'$', EUR:'€' };
    const sym = CURR[inv.currency] || inv.currency;

    // Отримуємо реквізити: збережений рахунок або основний для валюти
    const bankAccount = inv.bankAccountId
      ? BankAccountsService.getById(inv.bankAccountId)
      : BankAccountsService.getPrimary(inv.currency);

    const fmtM = (n) => `${sym} ${Number(n).toFixed(2)}`;

    // Блок реквізитів для PDF
    const bankBlock = bankAccount ? `
      <div class="mt-6 pt-5 border-t border-gray-200">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Реквізити для оплати</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div class="flex gap-2"><span class="text-gray-400 w-32 shrink-0">Банк:</span><span class="text-gray-700 font-medium">${bankAccount.bankName}</span></div>
          <div class="flex gap-2"><span class="text-gray-400 w-32 shrink-0">Отримувач:</span><span class="text-gray-700 font-medium">${bankAccount.recipientName}</span></div>
          <div class="flex gap-2 sm:col-span-2"><span class="text-gray-400 w-32 shrink-0">IBAN:</span><span class="text-gray-700 font-mono font-medium">${bankAccount.iban.replace(/(.{4})/g,'$1 ').trim()}</span></div>
          ${bankAccount.cardNumber ? `<div class="flex gap-2"><span class="text-gray-400 w-32 shrink-0">Картка:</span><span class="text-gray-700 font-mono">${bankAccount.cardNumber}</span></div>` : ''}
          ${bankAccount.swiftBic ? `<div class="flex gap-2"><span class="text-gray-400 w-32 shrink-0">SWIFT/BIC:</span><span class="text-gray-700 font-mono">${bankAccount.swiftBic}</span></div>` : ''}
          ${bankAccount.paymentPurpose ? `<div class="flex gap-2 sm:col-span-2"><span class="text-gray-400 w-32 shrink-0">Призначення:</span><span class="text-gray-600 italic">${bankAccount.paymentPurpose || `Оплата за рахунком №${inv.number}`}</span></div>` : ''}
        </div>
      </div>
    ` : '';

    // Sandbox/payment статус
    const isSandbox = PaymentService.isSandbox();
    const sandboxBadge = isSandbox
      ? `<span class="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 mr-2">🧪 SANDBOX</span>`
      : '';

    Modal.open({
      title: `Інвойс #${inv.number} — Перегляд`,
      size: 'xl',
      hideFooter: true,
      content: `
        <div class="flex flex-wrap justify-end gap-2 mb-4 no-print">
          ${sandboxBadge}
          ${bankAccount ? `
            <button id="copy-requisites-btn" class="btn-secondary text-sm" title="Скопіювати реквізити">
              📋 Копіювати реквізити
            </button>
            <button id="show-qr-btn" class="btn-secondary text-sm" title="QR для оплати">
              📲 QR-код
            </button>
          ` : ''}
          ${inv.status !== 'paid' ? `
            <button id="simulate-payment-btn" class="btn-secondary text-sm border-green-300 text-green-700 hover:bg-green-50" title="Симулювати оплату">
              ✅ ${isSandbox ? '[Sandbox] ' : ''}Відмітити як оплачено
            </button>
          ` : `
            ${inv.isRefunded ? `
              <span class="inline-flex items-center gap-1 text-sm font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1.5 rounded-full border border-yellow-300 dark:border-yellow-700">
                ↩️ Повернення здійснено
              </span>
            ` : `
              <button id="preview-payer-btn" class="btn-secondary text-sm" title="Дані платника">
                💳 Дані платника
              </button>
              <button id="preview-refund-btn" class="btn-secondary text-sm border-orange-300 text-orange-600 hover:bg-orange-50" title="Повернути кошти">
                ↩️ Повернути кошти
              </button>
            `}
          `}
          <button onclick="window.print()" class="btn-primary text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Роздрукувати / PDF
          </button>
        </div>

        <!-- QR modal (прихований спочатку) -->
        <div id="qr-modal-block" class="hidden mb-4 no-print">
          <div class="border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20">
            <div class="flex items-start gap-4">
              <div id="qr-canvas-wrapper" class="shrink-0 bg-white p-2 rounded-lg border border-gray-200">
                <canvas id="payment-qr-canvas" width="140" height="140"></canvas>
              </div>
              <div class="flex-1">
                <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-1">QR-код для оплати</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Відскануйте мобільним банком (Монобанк, ПриватБанк, тощо) або міжнародним банківським застосунком (EPC QR).</p>
                <pre id="qr-data-text" class="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600 max-h-28 overflow-y-auto whitespace-pre-wrap"></pre>
              </div>
            </div>
          </div>
        </div>

        <div id="invoice-print-area" class="bg-white p-8 rounded-xl text-gray-800 shadow-sm border border-gray-200 font-sans">
          <!-- Header -->
          <div class="flex justify-between items-start mb-8">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <span class="font-bold text-xl text-indigo-600">FreelanceHub</span>
              </div>
              <p class="text-gray-500 text-sm">Pro Suite · Автоматично згенеровано</p>
            </div>
            <div class="text-right">
              <p class="text-3xl font-bold text-gray-800">РАХУНОК</p>
              <p class="text-indigo-600 font-semibold text-lg">#${inv.number}</p>
              <span class="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold
                ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                  inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'}">
                ${{ draft:'Чернетка', sent:'Відправлено', paid:'ОПЛАЧЕНО', overdue:'ПРОСТРОЧЕНО' }[inv.status] || inv.status}
              </span>
            </div>
          </div>

          <!-- Dates + Client -->
          <div class="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Одержувач</p>
              <p class="font-bold text-gray-800 text-lg">${client?.name || 'Невідомий клієнт'}</p>
              ${client?.company ? `<p class="text-gray-500">${client.company}</p>` : ''}
              ${client?.address ? `<p class="text-gray-500 text-sm">${client.address}</p>` : ''}
              ${client?.taxId ? `<p class="text-gray-500 text-sm">ЄДРПОУ: ${client.taxId}</p>` : ''}
              ${client?.email ? `<p class="text-gray-500 text-sm">${client.email}</p>` : ''}
            </div>
            <div class="text-right">
              <div class="inline-block text-left space-y-1">
                <div class="flex gap-4 text-sm"><span class="text-gray-400 w-32">Дата виставлення:</span><span class="font-medium">${inv.issueDate || '—'}</span></div>
                ${inv.dueDate ? `<div class="flex gap-4 text-sm"><span class="text-gray-400 w-32">Термін оплати:</span><span class="font-medium">${inv.dueDate}</span></div>` : ''}
                <div class="flex gap-4 text-sm"><span class="text-gray-400 w-32">Валюта:</span><span class="font-medium">${inv.currency}</span></div>
              </div>
            </div>
          </div>

          <!-- Items table -->
          <table class="w-full mb-6 text-sm">
            <thead>
              <tr class="bg-indigo-600 text-white">
                <th class="px-4 py-2.5 text-left rounded-tl-lg">Опис</th>
                <th class="px-4 py-2.5 text-right w-24">К-сть</th>
                <th class="px-4 py-2.5 text-right w-32">Ціна</th>
                <th class="px-4 py-2.5 text-right w-32 rounded-tr-lg">Сума</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map((item, i) => `
                <tr class="${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}">
                  <td class="px-4 py-2.5 text-gray-700">${item.description}</td>
                  <td class="px-4 py-2.5 text-right text-gray-600">${item.qty}</td>
                  <td class="px-4 py-2.5 text-right text-gray-600">${fmtM(item.price)}</td>
                  <td class="px-4 py-2.5 text-right font-medium text-gray-700">${fmtM((parseFloat(item.qty)||0)*(parseFloat(item.price)||0))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end mb-6">
            <div class="w-72 space-y-2 text-sm">
              <div class="flex justify-between text-gray-500"><span>Підсумок:</span><span>${fmtM(inv.subtotal)}</span></div>
              ${inv.discount > 0 ? `<div class="flex justify-between text-red-500"><span>Знижка ${inv.discount}%:</span><span>−${fmtM(inv.discountAmt)}</span></div>` : ''}
              ${inv.vatRate > 0 ? `<div class="flex justify-between text-gray-500"><span>ПДВ ${inv.vatRate}%:</span><span>+${fmtM(inv.vatAmt)}</span></div>` : ''}
              <div class="flex justify-between font-bold text-xl text-gray-800 border-t-2 border-indigo-200 pt-2">
                <span>Разом до оплати:</span><span class="text-indigo-600">${fmtM(inv.total)}</span>
              </div>
            </div>
          </div>

          <!-- Bank account requisites block -->
          ${bankBlock}

          ${inv.notes ? `
            <div class="border-t border-gray-200 pt-4 mt-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Нотатки</p>
              <p class="text-gray-600 text-sm">${inv.notes}</p>
            </div>
          ` : ''}

          <div class="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Згенеровано FreelanceHub Pro Suite · ${new Date().toLocaleDateString('uk-UA')}
          </div>
        </div>
      `,
    });

    // Копіювання реквізитів
    document.getElementById('copy-requisites-btn')?.addEventListener('click', () => {
      const text = BankAccountsService.formatForCopy(bankAccount);
      navigator.clipboard?.writeText(text).then(() => {
        const btn = document.getElementById('copy-requisites-btn');
        if (btn) { btn.textContent = '✅ Скопійовано!'; setTimeout(() => { btn.textContent = '📋 Копіювати реквізити'; }, 2000); }
      });
      Notifications.add('📋 Реквізити скопійовано в буфер обміну');
    });

    // QR-код
    document.getElementById('show-qr-btn')?.addEventListener('click', () => {
      const block = document.getElementById('qr-modal-block');
      if (!block) return;
      const isHidden = block.classList.contains('hidden');
      block.classList.toggle('hidden', !isHidden);
      if (isHidden && bankAccount) {
        _renderPaymentQR(bankAccount, inv.total, `Оплата за рахунком №${inv.number}`);
      }
    });

    // Симуляція оплати (sandbox або реальна)
    document.getElementById('simulate-payment-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('simulate-payment-btn');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Обробка...'; }
      const result = await PaymentService.initiatePayment(inv, 'paid');
      if (btn) { btn.textContent = result.success ? '✅ Оплачено!' : '❌ Помилка'; }
      if (result.success) {
        setTimeout(() => { Modal.close(); render(); }, 1500);
      }
    });

    // Дані платника
    document.getElementById('preview-payer-btn')?.addEventListener('click', () => {
      Modal.close();
      _showPayerInfo(id);
    });

    // Повернення коштів
    document.getElementById('preview-refund-btn')?.addEventListener('click', () => {
      Modal.close();
      _confirmRefund(id);
    });
  }

  function _renderPaymentQR(account, amount, purpose) {
    const canvas = document.getElementById('payment-qr-canvas');
    const textEl = document.getElementById('qr-data-text');
    if (!canvas || !account) return;

    const qrData = BankAccountsService.generatePaymentQRData(account, amount, purpose);
    if (textEl) textEl.textContent = qrData;

    // Генеруємо QR через зовнішню бібліотеку (qrcode.js через CDN)
    // Якщо бібліотека не завантажена — підвантажуємо динамічно
    function drawQR() {
      if (window.QRCode) {
        canvas.width = 140; canvas.height = 140;
        // Очищуємо попередній wrapper та перестворюємо canvas
        const wrapper = document.getElementById('qr-canvas-wrapper');
        if (wrapper) {
          wrapper.innerHTML = '<div id="qr-div"></div>';
          new window.QRCode(document.getElementById('qr-div'), {
            text: qrData,
            width: 140,
            height: 140,
            colorDark: '#312e81',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M,
          });
        }
      } else {
        // Fallback: показуємо текстовий URI
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, 140, 140);
        ctx.fillStyle = '#6366f1';
        ctx.font = '10px monospace';
        ctx.fillText('QR-бібліотека', 10, 65);
        ctx.fillText('завантажується...', 10, 80);
      }
    }

    if (!window.QRCode) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      script.onload = drawQR;
      document.head.appendChild(script);
    } else {
      drawQR();
    }
  }

  function _confirmDelete(id) {
    const inv = Store.getById('invoices', id);
    if (!inv) return;
    Modal.open({
      title: 'Видалити інвойс?',
      content: `<div class="text-center py-4"><div class="text-5xl mb-4">🗑️</div><p class="text-gray-700 dark:text-gray-300">Видалити інвойс <strong>#${inv.number}</strong> на суму <strong>${_fmt(inv.total)}</strong>?</p></div>`,
      confirmText: 'Видалити',
      onConfirm: () => {
        Store.remove('invoices', id);
        Modal.close();
        EventBus.emit('data:changed');
        render();
      },
    });
  }

  function _fmt(n) { return new Intl.NumberFormat('uk-UA', { style:'currency', currency:'UAH', maximumFractionDigits:0 }).format(n||0); }
  function _fmtNum(n) { return Number(n || 0).toFixed(2); }

  /**
   * Відображає дані платника для оплаченого інвойсу.
   */
  function _showPayerInfo(id) {
    const inv = Store.getById('invoices', id);
    if (!inv) return;
    const client = Store.getById('clients', inv.clientId);

    // Генеруємо/отримуємо дані платника (масковані)
    const payerData = inv.payerInfo || _generatePayerInfo(inv, client);

    Modal.open({
      title: `💳 Дані платника — Інвойс #${inv.number}`,
      size: 'md',
      hideFooter: true,
      content: `
        <div class="space-y-4">
          ${inv.isRefunded ? `
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 text-center">
              <p class="text-sm font-semibold text-yellow-700 dark:text-yellow-400">↩️ Повернення коштів здійснено</p>
              <p class="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5">${inv.refundedAt ? new Date(inv.refundedAt).toLocaleString('uk-UA') : ''}</p>
            </div>
          ` : ''}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p class="text-xs text-gray-400 uppercase font-medium">ПІБ платника</p>
              <p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5 font-medium">${payerData.name || client?.name || '—'}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p class="text-xs text-gray-400 uppercase font-medium">Маскована картка</p>
              <p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5 font-mono">${payerData.maskedCard || '—'}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p class="text-xs text-gray-400 uppercase font-medium">Сума платежу</p>
              <p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5 font-semibold">${inv.currency} ${Number(inv.total).toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p class="text-xs text-gray-400 uppercase font-medium">Дата оплати</p>
              <p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5">${inv.paidAt ? new Date(inv.paidAt).toLocaleString('uk-UA') : '—'}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p class="text-xs text-gray-400 uppercase font-medium">Транзакція ID</p>
              <p class="text-xs text-gray-700 dark:text-gray-200 mt-0.5 font-mono break-all">${payerData.transactionId || '—'}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p class="text-xs text-gray-400 uppercase font-medium">Платіжна система</p>
              <p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5">${payerData.cardType || '—'}</p>
            </div>
          </div>
          <div class="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-xs text-gray-400 text-center">
            🔒 Дані картки масковані — зберігаються лише перші 6 та останні 4 цифри. Секретні дані не зберігаються.
          </div>
        </div>
      `,
    });
  }

  /**
   * Генерує масковані дані платника при оплаті (зберігаються в інвойсі).
   */
  function _generatePayerInfo(inv, client) {
    // Генеруємо псевдо-дані платника (у production — з платіжного шлюзу)
    const cardBin = String(Math.floor(400000 + Math.random() * 99999));
    const cardLast4 = String(Math.floor(1000 + Math.random() * 8999));
    const maskedCard = `**** **** **** ${cardLast4}`;
    const cardType = CardDetector.detect(cardBin + '0000000000')?.name || 'Visa';
    const transactionId = `TXN-${inv.number}-${Date.now().toString(36).toUpperCase()}`;

    const payerInfo = {
      name: client?.name || '—',
      maskedCard,
      cardType,
      transactionId,
    };

    // Зберігаємо в інвойс
    Store.update('invoices', inv.id, { payerInfo, paidAt: inv.paidAt || new Date().toISOString() });
    return payerInfo;
  }

  /**
   * Підтвердження повернення коштів.
   */
  function _confirmRefund(id) {
    const inv = Store.getById('invoices', id);
    if (!inv) return;
    const client = Store.getById('clients', inv.clientId);

    Modal.open({
      title: '↩️ Повернути кошти?',
      content: `
        <div class="text-center py-4">
          <div class="text-5xl mb-4">↩️</div>
          <p class="text-gray-700 dark:text-gray-300">Ви впевнені, що хочете повернути кошти за інвойс <strong>#${inv.number}</strong>?</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Сума: <strong>${inv.currency} ${Number(inv.total).toFixed(2)}</strong></p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Клієнт: ${client?.name || '—'}</p>
          <div class="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
            ⚠️ Після повернення інвойс позначається бейджем «Повернення здійснено». Статус зміниться на «refunded».
          </div>
        </div>
      `,
      confirmText: '↩️ Так, повернути кошти',
      onConfirm: () => {
        Store.update('invoices', id, {
          status: 'refunded',
          isRefunded: true,
          refundedAt: new Date().toISOString(),
        });

        // Запис у транзакції платежів
        Store.save('payment_transactions', {
          invoiceId: id,
          invoiceNumber: inv.number,
          amount: -(parseFloat(inv.total) || 0),
          currency: inv.currency,
          provider: PaymentService.getProviderName(),
          sandboxMode: PaymentService.isSandbox(),
          transactionId: `RFND-${inv.number}-${Date.now().toString(36).toUpperCase()}`,
          status: 'refunded',
          completedAt: new Date().toISOString(),
        });

        Notifications.add(`↩️ Повернення коштів за інвойс #${inv.number} виконано (${inv.currency} ${Number(inv.total).toFixed(2)})`);
        EventBus.emit('data:changed');
        Modal.close();
        _renderStats();
        _renderTable();
      },
    });
  }

  /**
   * Рендерить селектор банківського рахунку у формі інвойсу.
   */
  function _renderBankAccountSelector(selectedId, currency) {
    const accounts = BankAccountsService.getByCurrency(currency || 'UAH');
    if (!accounts.length) {
      return `
        <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
          <p class="text-xs text-amber-700 dark:text-amber-400">
            💡 Реквізити для цієї валюти ще не додані.
            <a href="#settings" class="underline font-semibold">Перейдіть в Налаштування → Банківські реквізити</a>, щоб додати рахунок.
          </p>
        </div>
      `;
    }
    const primaryId = selectedId || accounts.find(a => a.isPrimary)?.id || accounts[0]?.id;
    return `
      <div>
        <label class="label">Реквізити для оплати</label>
        <select id="invoice-bank-account-select" class="input" name="bankAccountId">
          ${accounts.map(a => `
            <option value="${a.id}" ${a.id === primaryId ? 'selected' : ''}>
              ${a.bankName} · ${a.recipientName} · ${a.iban.slice(0, 10)}... (${a.currency})${a.isPrimary ? ' ⭐' : ''}
            </option>
          `).join('')}
        </select>
        <p class="text-xs text-gray-400 mt-1">Реквізити автоматично відображаються в PDF інвойсу</p>
      </div>
    `;
  }

  return { render };
})();
