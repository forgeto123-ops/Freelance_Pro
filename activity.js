/**
 * Activity Log page — Full history of all client interactions
 */
const ActivityPage = (() => {
  const TYPES = {
    call:          { label: 'Дзвінок',    icon: '📞', color: '#3b82f6' },
    email:         { label: 'Email',      icon: '✉️', color: '#6366f1' },
    meeting:       { label: 'Зустріч',   icon: '🤝', color: '#10b981' },
    note:          { label: 'Нотатка',   icon: '📝', color: '#f59e0b' },
    status_change: { label: 'Зміна статусу', icon: '🔄', color: '#8b5cf6' },
    payment:       { label: 'Оплата',    icon: '💰', color: '#22c55e' },
  };

  const SENTIMENT = {
    positive: { label: 'Позитивний 😊', cls: 'badge-green' },
    neutral:  { label: 'Нейтральний 😐', cls: 'badge-gray' },
    negative: { label: 'Негативний 😟', cls: 'badge-red' },
  };

  let filterType = 'all';
  let filterClientId = 'all';

  function render() {
    const content = document.getElementById('content');
    const clients = Store.getAll('clients');

    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Журнал активностей</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Повна історія взаємодій з клієнтами</p>
          </div>
          <button id="add-activity-btn" class="btn-primary self-start sm:self-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Додати запис
          </button>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="activity-stats"></div>

        <!-- Filters -->
        <div class="card p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label class="label text-xs">Тип</label>
            <select id="filter-act-type" class="input py-1.5 text-sm">
              <option value="all">Всі типи</option>
              ${Object.entries(TYPES).map(([v, t]) => `<option value="${v}" ${filterType===v?'selected':''}>${t.icon} ${t.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label text-xs">Клієнт</label>
            <select id="filter-act-client" class="input py-1.5 text-sm">
              <option value="all">Всі клієнти</option>
              ${clients.map(c => `<option value="${c.id}" ${filterClientId===c.id?'selected':''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <button id="reset-act-filters" class="btn-secondary py-1.5 text-sm">Скинути</button>
        </div>

        <!-- Timeline -->
        <div id="activity-timeline"></div>
      </div>
    `;

    _renderStats();
    _renderTimeline();

    document.getElementById('add-activity-btn').addEventListener('click', () => _openForm());
    document.getElementById('filter-act-type').addEventListener('change', e => { filterType = e.target.value; _renderTimeline(); });
    document.getElementById('filter-act-client').addEventListener('change', e => { filterClientId = e.target.value; _renderTimeline(); });
    document.getElementById('reset-act-filters').addEventListener('click', () => { filterType = 'all'; filterClientId = 'all'; render(); });
  }

  function _renderStats() {
    const all = Store.getAll('activity_logs');
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = all.filter(l => l.createdAt?.startsWith(today));

    const bySentiment = { positive: 0, neutral: 0, negative: 0 };
    all.filter(l => l.sentiment).forEach(l => { bySentiment[l.sentiment] = (bySentiment[l.sentiment]||0) + 1; });

    document.getElementById('activity-stats').innerHTML = [
      { label: 'Всього записів', value: all.length, icon: '📋', color: 'indigo' },
      { label: 'Сьогодні', value: todayLogs.length, icon: '📅', color: 'blue' },
      { label: 'Позитивних', value: bySentiment.positive, icon: '😊', color: 'green' },
      { label: 'Негативних', value: bySentiment.negative, icon: '😟', color: 'red' },
    ].map(s => `
      <div class="card py-3">
        <div class="flex items-center gap-2 mb-1"><span class="text-xl">${s.icon}</span><p class="text-xs text-gray-400 uppercase font-medium">${s.label}</p></div>
        <p class="text-2xl font-bold ${s.color==='green'?'text-green-600 dark:text-green-400':s.color==='blue'?'text-blue-600 dark:text-blue-400':s.color==='red'?'text-red-600 dark:text-red-400':'text-indigo-600 dark:text-indigo-400'}">${s.value}</p>
      </div>
    `).join('');
  }

  function _renderTimeline() {
    let all = Store.getAll('activity_logs').slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const clients = Store.getAll('clients');
    const cm = {}; clients.forEach(c => { cm[c.id] = c; });
    const deals = Store.getAll('deals');
    const dm = {}; deals.forEach(d => { dm[d.id] = d; });

    if (filterType !== 'all') all = all.filter(l => l.type === filterType);
    if (filterClientId !== 'all') all = all.filter(l => l.clientId === filterClientId);

    const el = document.getElementById('activity-timeline');

    if (!all.length) {
      el.innerHTML = `<div class="card text-center py-16"><div class="text-6xl mb-4">📋</div><p class="text-gray-500 dark:text-gray-400 font-medium">Немає записів</p><p class="text-sm text-gray-400 mt-1">Натисніть «Додати запис» щоб розпочати</p></div>`;
      return;
    }

    // Group by date
    const grouped = {};
    all.forEach(l => {
      const dateKey = l.createdAt?.slice(0, 10) || 'Невідома дата';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(l);
    });

    el.innerHTML = Object.entries(grouped).map(([date, logs]) => `
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${_formatDate(date)}</span>
          <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          <span class="text-xs text-gray-400">${logs.length} запис${logs.length === 1 ? '' : 'ів'}</span>
        </div>
        <div class="space-y-3">
          ${logs.map(l => {
            const t = TYPES[l.type] || { label: l.type, icon: '📌', color: '#6b7280' };
            const client = cm[l.clientId];
            const deal = dm[l.dealId];
            const sent = l.sentiment ? SENTIMENT[l.sentiment] : null;
            return `
              <div class="flex gap-4 group">
                <!-- Timeline dot -->
                <div class="flex flex-col items-center shrink-0">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm" style="background:${t.color}22">
                    ${t.icon}
                  </div>
                  <div class="w-0.5 flex-1 mt-2 bg-gray-100 dark:bg-gray-700 min-h-4"></div>
                </div>
                <!-- Content -->
                <div class="flex-1 min-w-0 pb-3">
                  <div class="card py-3 px-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                          <span class="text-xs font-semibold uppercase tracking-wider" style="color:${t.color}">${t.label}</span>
                          ${client ? `<span class="text-xs text-gray-500 dark:text-gray-400">👤 ${client.name}</span>` : ''}
                          ${deal ? `<span class="text-xs text-gray-500 dark:text-gray-400">🎯 ${deal.title}</span>` : ''}
                          ${sent ? `<span class="${sent.cls} text-xs">${sent.label}</span>` : ''}
                        </div>
                        <p class="font-medium text-gray-800 dark:text-gray-100 text-sm">${l.title}</p>
                        ${l.body ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">${l.body}</p>` : ''}
                        ${l.summary ? `<div class="mt-2 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-xs text-indigo-700 dark:text-indigo-300"><strong>AI Summary:</strong> ${l.summary}</div>` : ''}
                      </div>
                      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button class="btn-icon edit-log" data-id="${l.id}" title="Редагувати">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="btn-icon btn-icon-danger delete-log" data-id="${l.id}" title="Видалити">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5">${new Date(l.createdAt).toLocaleTimeString('uk-UA', { hour:'2-digit', minute:'2-digit' })}</p>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.edit-log').forEach(btn => btn.addEventListener('click', () => _openForm(btn.dataset.id)));
    el.querySelectorAll('.delete-log').forEach(btn => btn.addEventListener('click', () => {
      Store.remove('activity_logs', btn.dataset.id);
      EventBus.emit('data:changed');
      render();
    }));
  }

  function _openForm(id) {
    const item = id ? Store.getById('activity_logs', id) : null;
    const clients = Store.getAll('clients');
    const deals = Store.getAll('deals');

    Modal.open({
      title: item ? 'Редагувати запис' : 'Новий запис активності',
      size: 'md',
      content: `
        <form id="activity-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Тип активності *</label>
              <select name="type" class="input">
                ${Object.entries(TYPES).map(([v, t]) => `<option value="${v}" ${(item?.type||'note')===v?'selected':''}>${t.icon} ${t.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Настрій клієнта</label>
              <select name="sentiment" class="input">
                <option value="">— Не оцінювати —</option>
                ${Object.entries(SENTIMENT).map(([v, s]) => `<option value="${v}" ${item?.sentiment===v?'selected':''}>${s.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Клієнт</label>
              <select name="clientId" class="input" id="act-client-select">
                <option value="">— Без клієнта —</option>
                ${clients.map(c => `<option value="${c.id}" ${item?.clientId===c.id?'selected':''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Угода</label>
              <select name="dealId" class="input" id="act-deal-select">
                <option value="">— Без угоди —</option>
                ${deals.map(d => `<option value="${d.id}" ${item?.dealId===d.id?'selected':''}>${d.title}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="label">Заголовок *</label>
            <input name="title" type="text" class="input" value="${item?.title || ''}" placeholder="Провели демо-дзвінок, обговорили деталі проєкту" required />
          </div>
          <div>
            <label class="label">Деталі / Нотатки</label>
            <textarea name="body" rows="4" class="input resize-none" placeholder="Опишіть результат взаємодії...">${item?.body || ''}</textarea>
          </div>
          <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <label class="label mb-0 text-indigo-700 dark:text-indigo-300">🤖 AI Summary (Vitaємо)</label>
              <button type="button" id="gen-summary-btn" class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Згенерувати</button>
            </div>
            <div id="ai-summary-output" class="text-sm text-indigo-700 dark:text-indigo-300 italic">${item?.summary || 'Натисніть «Згенерувати» для AI-підсумку нотатки'}</div>
            <input type="hidden" name="summary" id="summary-hidden" value="${item?.summary || ''}" />
          </div>
        </form>
      `,
      onConfirm: () => _saveActivity(id),
    });

    document.getElementById('gen-summary-btn').addEventListener('click', () => {
      const body = document.getElementById('activity-form').body.value.trim();
      const title = document.getElementById('activity-form').title.value.trim();
      const text = body || title || 'Немає тексту';
      const summary = AIAssistant.generateSummary(text);
      document.getElementById('ai-summary-output').textContent = summary;
      document.getElementById('summary-hidden').value = summary;
    });

    // Filter deals by selected client
    document.getElementById('act-client-select').addEventListener('change', e => {
      const clientId = e.target.value;
      const sel = document.getElementById('act-deal-select');
      sel.innerHTML = `<option value="">— Без угоди —</option>` +
        deals.filter(d => !clientId || d.clientId === clientId).map(d => `<option value="${d.id}">${d.title}</option>`).join('');
    });
  }

  function _saveActivity(id) {
    const form = document.getElementById('activity-form');
    Validator.clearAllErrors(form);
    const title = form.title.value.trim();
    const titleErr = Validator.required(title, 'Заголовок');
    if (titleErr) { Validator.showError(form.title, titleErr); return; }

    const data = {
      type: form.type.value,
      sentiment: form.sentiment.value || null,
      clientId: form.clientId.value || null,
      dealId: form.dealId.value || null,
      title,
      body: form.body.value.trim(),
      summary: document.getElementById('summary-hidden').value || null,
    };

    if (id) {
      Store.update('activity_logs', id, data);
    } else {
      Store.save('activity_logs', data);
      Notifications.add(`Активність "${data.title}" додано до журналу`);
    }

    Modal.close();
    EventBus.emit('data:changed');
    render();
  }

  function _formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return 'Сьогодні';
    if (dateStr === yesterday) return 'Вчора';
    return d.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  return { render };
})();
