/**
 * Expenses page — income and expense tracking with categories
 */
const ExpensesPage = (() => {
  const DEFAULT_CATEGORIES = ['Програмне забезпечення', 'Обладнання', 'Маркетинг', 'Офіс', 'Транспорт', 'Навчання', 'Комунікації', 'Інше'];
  let filterCategory = 'all';
  let filterMonth = '';
  let filterType = 'all';

  function render() {
    const content = document.getElementById('content');
    const months = _getAvailableMonths();
    const categories = _getCategories();

    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Облік витрат та доходів</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Контролюйте фінансові потоки свого бізнесу</p>
          </div>
          <button id="add-expense-btn" class="btn-primary self-start sm:self-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Додати запис
          </button>
        </div>

        <!-- Summary cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="expense-summary"></div>

        <!-- Filters -->
        <div class="card p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label class="label text-xs">Тип</label>
            <select id="filter-type" class="input py-1.5 text-sm">
              <option value="all" ${filterType==='all'?'selected':''}>Всі</option>
              <option value="expense" ${filterType==='expense'?'selected':''}>Витрати</option>
              <option value="income" ${filterType==='income'?'selected':''}>Доходи</option>
            </select>
          </div>
          <div>
            <label class="label text-xs">Категорія</label>
            <select id="filter-category" class="input py-1.5 text-sm">
              <option value="all">Всі категорії</option>
              ${categories.map(c => `<option value="${c}" ${filterCategory===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label text-xs">Місяць</label>
            <select id="filter-month" class="input py-1.5 text-sm">
              <option value="">Всі місяці</option>
              ${months.map(m => `<option value="${m.value}" ${filterMonth===m.value?'selected':''}>${m.label}</option>`).join('')}
            </select>
          </div>
          <button id="reset-filters" class="btn-secondary py-1.5 text-sm">Скинути</button>
        </div>

        <!-- Table -->
        <div class="card overflow-hidden p-0">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 text-left">
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дата</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Опис</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Категорія</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Тип</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Сума</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Дії</th>
                </tr>
              </thead>
              <tbody id="expenses-tbody" class="divide-y divide-gray-100 dark:divide-gray-700"></tbody>
            </table>
          </div>
          <div id="expenses-empty" class="hidden text-center py-16">
            <div class="text-6xl mb-4">💸</div>
            <p class="text-gray-500 dark:text-gray-400 font-medium">Немає записів</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Натисніть «Додати запис» для початку обліку</p>
          </div>
        </div>
      </div>
    `;

    _renderSummary();
    _renderTable();

    document.getElementById('add-expense-btn').addEventListener('click', () => _openForm());
    document.getElementById('filter-type').addEventListener('change', e => { filterType = e.target.value; _renderTable(); _renderSummary(); });
    document.getElementById('filter-category').addEventListener('change', e => { filterCategory = e.target.value; _renderTable(); });
    document.getElementById('filter-month').addEventListener('change', e => { filterMonth = e.target.value; _renderTable(); _renderSummary(); });
    document.getElementById('reset-filters').addEventListener('click', () => {
      filterType = 'all'; filterCategory = 'all'; filterMonth = '';
      render();
    });
  }

  function _renderSummary() {
    const all = Store.getAll('expenses');
    let subset = filterMonth ? all.filter(e => e.date?.startsWith(filterMonth)) : all;

    const totalExpenses = subset.filter(e => e.type === 'expense').reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
    const totalIncome = subset.filter(e => e.type === 'income').reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
    const balance = totalIncome - totalExpenses;
    const thisMonth = all.filter(e => e.date?.startsWith(new Date().toISOString().slice(0,7)));
    const thisMonthExpenses = thisMonth.filter(e => e.type === 'expense').reduce((s,e) => s+(parseFloat(e.amount)||0), 0);

    document.getElementById('expense-summary').innerHTML = [
      { label: 'Загальні витрати', value: _fmt(totalExpenses), color: 'red', icon: '📉' },
      { label: 'Загальні доходи', value: _fmt(totalIncome), color: 'green', icon: '📈' },
      { label: 'Баланс', value: _fmt(balance), color: balance >= 0 ? 'indigo' : 'red', icon: '⚖️' },
      { label: 'Витрати цього місяця', value: _fmt(thisMonthExpenses), color: 'yellow', icon: '📅' },
    ].map(s => `
      <div class="card py-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">${s.icon}</span>
          <p class="text-xs text-gray-400 uppercase font-medium">${s.label}</p>
        </div>
        <p class="text-xl font-bold ${s.color === 'red' ? 'text-red-600 dark:text-red-400' : s.color === 'green' ? 'text-green-600 dark:text-green-400' : s.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : 'text-indigo-600 dark:text-indigo-400'}">${s.value}</p>
      </div>
    `).join('');
  }

  function _renderTable() {
    let all = Store.getAll('expenses').slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filterType !== 'all') all = all.filter(e => e.type === filterType);
    if (filterCategory !== 'all') all = all.filter(e => e.category === filterCategory);
    if (filterMonth) all = all.filter(e => e.date?.startsWith(filterMonth));

    const tbody = document.getElementById('expenses-tbody');
    const empty = document.getElementById('expenses-empty');

    if (!all.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    tbody.innerHTML = all.map(e => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
        <td class="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">${e.date || '—'}</td>
        <td class="px-4 py-3">
          <p class="font-medium text-gray-800 dark:text-gray-100">${e.description}</p>
          ${e.note ? `<p class="text-xs text-gray-400 truncate max-w-xs">${e.note}</p>` : ''}
        </td>
        <td class="px-4 py-3 hidden sm:table-cell">
          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${e.category}</span>
        </td>
        <td class="px-4 py-3">
          <span class="${e.type === 'expense' ? 'badge-red' : 'badge-green'} text-xs">${e.type === 'expense' ? '↑ Витрата' : '↓ Дохід'}</span>
        </td>
        <td class="px-4 py-3 text-right font-semibold ${e.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
          ${e.type === 'expense' ? '−' : '+'}${_fmt(e.amount)}
        </td>
        <td class="px-4 py-3 text-right">
          <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="btn-icon edit-expense" data-id="${e.id}" title="Редагувати">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="btn-icon btn-icon-danger delete-expense" data-id="${e.id}" title="Видалити">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-expense').forEach(btn => btn.addEventListener('click', () => _openForm(btn.dataset.id)));
    tbody.querySelectorAll('.delete-expense').forEach(btn => btn.addEventListener('click', () => _confirmDelete(btn.dataset.id)));
  }

  function _openForm(id) {
    const item = id ? Store.getById('expenses', id) : null;
    const categories = _getCategories();
    const today = new Date().toISOString().slice(0, 10);

    Modal.open({
      title: item ? 'Редагувати запис' : 'Новий запис',
      size: 'md',
      content: `
        <form id="expense-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="label">Тип *</label>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${(item?.type||'expense')==='expense' ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}">
                  <input type="radio" name="type" value="expense" class="text-red-500" ${(item?.type||'expense')==='expense'?'checked':''} />
                  <span class="font-medium text-sm text-gray-700 dark:text-gray-200">📉 Витрата</span>
                </label>
                <label class="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${item?.type==='income' ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}">
                  <input type="radio" name="type" value="income" class="text-green-500" ${item?.type==='income'?'checked':''} />
                  <span class="font-medium text-sm text-gray-700 dark:text-gray-200">📈 Дохід</span>
                </label>
              </div>
            </div>
          </div>
          <div>
            <label class="label">Опис *</label>
            <input name="description" type="text" class="input" value="${item?.description || ''}" placeholder="Оплата хостингу, Отримана оплата..." required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Сума (грн) *</label>
              <input name="amount" type="number" min="0.01" step="0.01" class="input" value="${item?.amount || ''}" placeholder="0.00" required />
            </div>
            <div>
              <label class="label">Дата *</label>
              <input name="date" type="date" class="input" value="${item?.date || today}" required />
            </div>
          </div>
          <div>
            <label class="label">Категорія *</label>
            <div class="flex gap-2">
              <select name="category" id="category-select" class="input flex-1">
                ${categories.map(c => `<option value="${c}" ${item?.category===c?'selected':''}>${c}</option>`).join('')}
                <option value="__new__">+ Нова категорія...</option>
              </select>
            </div>
            <input type="text" id="new-category-input" class="input mt-2 hidden" placeholder="Введіть нову категорію" />
          </div>
          <div>
            <label class="label">Нотатка</label>
            <input name="note" type="text" class="input" value="${item?.note || ''}" placeholder="Необов'язково..." />
          </div>
        </form>
      `,
      onConfirm: () => _saveExpense(id),
    });

    document.getElementById('category-select').addEventListener('change', e => {
      const inp = document.getElementById('new-category-input');
      inp.classList.toggle('hidden', e.target.value !== '__new__');
    });
  }

  function _saveExpense(id) {
    const form = document.getElementById('expense-form');
    Validator.clearAllErrors(form);

    const description = form.description.value.trim();
    const amount = form.amount.value;
    const date = form.date.value;
    const catSelect = document.getElementById('category-select');
    let category = catSelect.value === '__new__'
      ? document.getElementById('new-category-input').value.trim()
      : catSelect.value;
    const type = form.type.value;

    let valid = true;
    const descErr = Validator.required(description, 'Опис');
    if (descErr) { Validator.showError(form.description, descErr); valid = false; }
    const amtErr = Validator.positiveNonZero(amount, 'Сума');
    if (amtErr) { Validator.showError(form.amount, amtErr); valid = false; }
    const dateErr = Validator.required(date, 'Дата');
    if (dateErr) { Validator.showError(form.date, dateErr); valid = false; }
    if (!category) {
      const inp = document.getElementById('new-category-input');
      Validator.showError(inp, 'Введіть назву категорії');
      valid = false;
    }
    if (!valid) return;

    const data = { type, description, amount: parseFloat(amount), date, category, note: form.note.value.trim() };

    if (id) {
      Store.update('expenses', id, data);
      Notifications.add(`Запис "${description}" оновлено`);
    } else {
      Store.save('expenses', data);
      Notifications.add(`${type === 'expense' ? 'Витрату' : 'Дохід'} "${description}" (${_fmt(data.amount)}) додано`);
    }

    Modal.close();
    EventBus.emit('data:changed');
    render();
  }

  function _confirmDelete(id) {
    const item = Store.getById('expenses', id);
    if (!item) return;
    Modal.open({
      title: 'Видалити запис?',
      content: `<div class="text-center py-4"><div class="text-5xl mb-4">🗑️</div><p class="text-gray-700 dark:text-gray-300">Видалити запис <strong>"${item.description}"</strong> на суму <strong>${_fmt(item.amount)}</strong>?</p></div>`,
      confirmText: 'Видалити',
      onConfirm: () => {
        Store.remove('expenses', id);
        Modal.close();
        EventBus.emit('data:changed');
        render();
      },
    });
  }

  function _getCategories() {
    const saved = Store.getAll('expenses').map(e => e.category).filter(Boolean);
    const all = [...new Set([...DEFAULT_CATEGORIES, ...saved])];
    return all.sort();
  }

  function _getAvailableMonths() {
    const all = Store.getAll('expenses');
    const months = [...new Set(all.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
    return months.map(m => {
      const [y, mo] = m.split('-');
      return { value: m, label: new Date(parseInt(y), parseInt(mo)-1, 1).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }) };
    });
  }

  function _fmt(n) { return new Intl.NumberFormat('uk-UA', { style:'currency', currency:'UAH', maximumFractionDigits:0 }).format(n||0); }

  return { render };
})();
