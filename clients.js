/**
 * Clients page — CRM client management
 */
const ClientsPage = (() => {
  let searchQuery = '';

  function render() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">База клієнтів</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Управління контактами та відносинами з клієнтами</p>
          </div>
          <button id="add-client-btn" class="btn-primary self-start sm:self-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Додати клієнта
          </button>
        </div>

        <!-- Search -->
        <div class="relative max-w-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="client-search" type="text" placeholder="Пошук клієнтів..." value="${searchQuery}"
            class="input pl-9 w-full" />
        </div>

        <!-- Clients grid -->
        <div id="clients-grid"></div>
      </div>
    `;

    _renderClients();

    document.getElementById('add-client-btn').addEventListener('click', () => _openForm());
    document.getElementById('client-search').addEventListener('input', e => {
      searchQuery = e.target.value;
      _renderClients();
    });
  }

  function _renderClients() {
    const all = Store.getAll('clients');
    const filtered = searchQuery
      ? all.filter(c => `${c.name} ${c.email} ${c.company} ${c.phone}`.toLowerCase().includes(searchQuery.toLowerCase()))
      : all;

    const grid = document.getElementById('clients-grid');
    if (!filtered.length) {
      grid.innerHTML = `
        <div class="card text-center py-16">
          <div class="text-6xl mb-4">👥</div>
          <p class="text-gray-500 dark:text-gray-400 font-medium">${searchQuery ? 'Нічого не знайдено' : 'Немає клієнтів'}</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">${searchQuery ? 'Спробуйте інший запит' : 'Натисніть «Додати клієнта» щоб розпочати'}</p>
        </div>`;
      return;
    }

    const invoices = Store.getAll('invoices');
    const projects = Store.getAll('projects');

    grid.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        ${filtered.map(c => {
          const clientInvoices = invoices.filter(i => i.clientId === c.id);
          const clientProjects = projects.filter(p => p.clientId === c.id);
          const totalBilled = clientInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.total)||0), 0);
          return `
            <div class="card hover:shadow-lg transition-all duration-200 cursor-pointer group ${c.isRegular ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800' : ''}" data-client-id="${c.id}">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-11 h-11 rounded-2xl ${c.isRegular ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-indigo-400 to-purple-500'} flex items-center justify-center text-white font-bold text-lg shrink-0">
                    ${c.name.charAt(0).toUpperCase()}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="font-semibold text-gray-800 dark:text-gray-100 truncate">${c.name}</p>
                      ${c.isRegular ? '<span class="text-amber-500 text-sm" title="Постійний клієнт">⭐</span>' : ''}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${c.company || 'Фрілансер'}</p>
                  </div>
                </div>
                <div class="flex gap-1">
                  <button class="btn-icon toggle-regular" data-id="${c.id}" title="${c.isRegular ? 'Прибрати з постійних' : 'Позначити як постійного'}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ${c.isRegular ? 'text-amber-500 fill-amber-400' : 'text-gray-300'}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                  </button>
                  <button class="btn-icon edit-client opacity-0 group-hover:opacity-100 transition-opacity" data-id="${c.id}" title="Редагувати">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button class="btn-icon btn-icon-danger delete-client opacity-0 group-hover:opacity-100 transition-opacity" data-id="${c.id}" title="Видалити">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <div class="space-y-1.5 text-sm">
                ${c.email ? `<div class="flex items-center gap-2 text-gray-600 dark:text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg><span class="truncate">${c.email}</span></div>` : ''}
                ${c.phone ? `<div class="flex items-center gap-2 text-gray-600 dark:text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><span>${c.phone}</span></div>` : ''}
              </div>

              <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p class="text-lg font-bold text-gray-800 dark:text-gray-100">${clientInvoices.length}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">Інвойсів</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-gray-800 dark:text-gray-100">${clientProjects.length}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">Проєктів</p>
                </div>
                <div>
                  <p class="text-sm font-bold text-green-600 dark:text-green-400">${_fmt(totalBilled)}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">Оплачено</p>
                </div>
              </div>

              ${c.notes ? `<p class="mt-3 text-xs text-gray-500 dark:text-gray-500 italic border-t border-gray-100 dark:border-gray-700 pt-3">${c.notes}</p>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    grid.querySelectorAll('.edit-client').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _openForm(btn.dataset.id); });
    });
    grid.querySelectorAll('.delete-client').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _confirmDelete(btn.dataset.id); });
    });
    grid.querySelectorAll('.toggle-regular').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const client = Store.getById('clients', btn.dataset.id);
        if (!client) return;
        Store.update('clients', btn.dataset.id, { isRegular: !client.isRegular });
        Notifications.add(client.isRegular ? '⭐ Прибрано з постійних' : '⭐ Позначено як постійного клієнта');
        _renderClients();
      });
    });
    grid.querySelectorAll('[data-client-id]').forEach(card => {
      card.addEventListener('click', () => _openClientDetail(card.dataset.clientId));
    });
  }

  function _openForm(id) {
    const client = id ? Store.getById('clients', id) : null;
    Modal.open({
      title: client ? 'Редагувати клієнта' : 'Новий клієнт',
      size: 'md',
      content: `
        <form id="client-form" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Ім'я / Назва *</label>
              <input name="name" type="text" class="input" value="${client?.name || ''}" placeholder="Іван Петренко" required />
            </div>
            <div>
              <label class="label">Компанія</label>
              <input name="company" type="text" class="input" value="${client?.company || ''}" placeholder="Назва компанії" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Email</label>
              <input name="email" type="email" class="input" value="${client?.email || ''}" placeholder="email@example.com" />
            </div>
            <div>
              <label class="label">Телефон</label>
              <input name="phone" type="text" class="input" value="${client?.phone || ''}" placeholder="+380 00 000 0000" />
            </div>
          </div>
          <div>
            <label class="label">Адреса</label>
            <input name="address" type="text" class="input" value="${client?.address || ''}" placeholder="вул. Хрещатик 1, Київ" />
          </div>
          <div>
            <label class="label">ЄДРПОУ / ІПН</label>
            <input name="taxId" type="text" class="input" value="${client?.taxId || ''}" placeholder="12345678" />
          </div>
          <div>
            <label class="label">Нотатки</label>
            <textarea name="notes" rows="2" class="input resize-none" placeholder="Додаткова інформація...">${client?.notes || ''}</textarea>
          </div>
          <div class="flex items-center gap-3 pt-1">
            <input type="checkbox" name="isRegular" id="is-regular-cb" class="w-4 h-4 rounded accent-amber-500" ${client?.isRegular ? 'checked' : ''} />
            <label for="is-regular-cb" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-1">
              ⭐ Постійний клієнт
            </label>
          </div>
        </form>
      `,
      onConfirm: () => _saveClient(id),
    });
  }

  function _saveClient(id) {
    const form = document.getElementById('client-form');
    Validator.clearAllErrors(form);

    const name = form.name.value.trim();
    const email = form.email.value.trim();

    let valid = true;
    const nameErr = Validator.required(name, "Ім'я");
    if (nameErr) { Validator.showError(form.name, nameErr); valid = false; }
    const emailErr = Validator.email(email, 'Email');
    if (emailErr) { Validator.showError(form.email, emailErr); valid = false; }
    if (!valid) return;

    const data = {
      name,
      company: form.company.value.trim(),
      email,
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      taxId: form.taxId.value.trim(),
      notes: form.notes.value.trim(),
      isRegular: form.isRegular?.checked || false,
    };

    if (id) {
      Store.update('clients', id, data);
      Notifications.add(`Клієнта "${data.name}" оновлено`);
    } else {
      Store.save('clients', data);
      Notifications.add(`Нового клієнта "${data.name}" додано`);
    }

    Modal.close();
    EventBus.emit('data:changed');
    _renderClients();
  }

  function _confirmDelete(id) {
    const client = Store.getById('clients', id);
    if (!client) return;

    const linked = Store.getAll('invoices').filter(i => i.clientId === id).length
                 + Store.getAll('projects').filter(p => p.clientId === id).length;

    Modal.open({
      title: 'Видалити клієнта?',
      content: `
        <div class="text-center py-4">
          <div class="text-5xl mb-4">⚠️</div>
          <p class="text-gray-700 dark:text-gray-300">Ви впевнені, що хочете видалити клієнта <strong>${client.name}</strong>?</p>
          ${linked > 0 ? `<p class="mt-2 text-sm text-red-500">Увага: з цим клієнтом пов'язано ${linked} записів (інвойси/проєкти). Вони залишаться в системі.</p>` : ''}
        </div>
      `,
      confirmText: 'Видалити',
      onConfirm: () => {
        Store.remove('clients', id);
        Notifications.add(`Клієнта "${client.name}" видалено`);
        Modal.close();
        EventBus.emit('data:changed');
        _renderClients();
      },
    });
  }

  function _openClientDetail(id) {
    const client = Store.getById('clients', id);
    if (!client) return;

    const invoices = Store.getAll('invoices').filter(i => i.clientId === id);
    const projects = Store.getAll('projects').filter(p => p.clientId === id);

    Modal.open({
      title: `${client.name}`,
      size: 'lg',
      hideFooter: true,
      content: `
        <div class="space-y-6">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${client.email ? `<div class="col-span-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3"><p class="text-xs text-gray-400 uppercase font-medium">Email</p><p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5">${client.email}</p></div>` : ''}
            ${client.phone ? `<div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3"><p class="text-xs text-gray-400 uppercase font-medium">Телефон</p><p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5">${client.phone}</p></div>` : ''}
            ${client.company ? `<div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3"><p class="text-xs text-gray-400 uppercase font-medium">Компанія</p><p class="text-sm text-gray-700 dark:text-gray-200 mt-0.5">${client.company}</p></div>` : ''}
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Інвойси (${invoices.length})</h4>
            ${invoices.length ? `<div class="space-y-2">
              ${invoices.map(i => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <span class="text-sm text-gray-700 dark:text-gray-300">#${i.number || i.id.slice(-4)} · ${i.issueDate || '—'}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${_fmt(i.total)}</span>
                    <span class="${_statusClass(i.status)} text-xs">${_statusLabel(i.status)}</span>
                  </div>
                </div>
              `).join('')}
            </div>` : `<p class="text-sm text-gray-400">Немає інвойсів</p>`}
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Проєкти (${projects.length})</h4>
            ${projects.length ? `<div class="space-y-2">
              ${projects.map(p => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <span class="text-sm text-gray-700 dark:text-gray-300">${p.name}</span>
                  <span class="${_projectStatusClass(p.status)} text-xs">${_projectStatusLabel(p.status)}</span>
                </div>
              `).join('')}
            </div>` : `<p class="text-sm text-gray-400">Немає проєктів</p>`}
          </div>
        </div>
      `,
    });
  }

  function _statusLabel(s) { return { draft:'Чернетка', sent:'Відправлено', paid:'Оплачено', overdue:'Прострочено' }[s] || s; }
  function _statusClass(s) { return { draft:'badge-gray', sent:'badge-blue', paid:'badge-green', overdue:'badge-red' }[s] || 'badge-gray'; }
  function _projectStatusLabel(s) { return { 'in-progress':'В роботі', review:'На затвердженні', done:'Виконано', cancelled:'Скасовано' }[s] || s; }
  function _projectStatusClass(s) { return { 'in-progress':'badge-blue', review:'badge-yellow', done:'badge-green', cancelled:'badge-red' }[s] || 'badge-gray'; }
  function _fmt(n) { return new Intl.NumberFormat('uk-UA', { style:'currency', currency:'UAH', maximumFractionDigits:0 }).format(n||0); }

  return { render };
})();
