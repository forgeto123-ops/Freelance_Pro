/**
 * Projects page — CRM project management with statuses
 */
const ProjectsPage = (() => {
  let filterStatus = 'all';

  const STATUSES = {
    'in-progress': { label: 'В роботі', cls: 'badge-blue' },
    'review': { label: 'На затвердженні', cls: 'badge-yellow' },
    'done': { label: 'Виконано', cls: 'badge-green' },
    'cancelled': { label: 'Скасовано', cls: 'badge-red' },
  };

  function render() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Управління проєктами</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Відстежуйте прогрес та дедлайни всіх проєктів</p>
          </div>
          <button id="add-project-btn" class="btn-primary self-start sm:self-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Новий проєкт
          </button>
        </div>

        <!-- Status filter tabs -->
        <div class="flex flex-wrap gap-2">
          ${['all', 'in-progress', 'review', 'done', 'cancelled'].map(s => `
            <button data-filter="${s}" class="filter-tab px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${filterStatus === s ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}">
              ${s === 'all' ? 'Всі' : STATUSES[s]?.label}
            </button>
          `).join('')}
        </div>

        <!-- Summary row -->
        <div id="project-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>

        <!-- Projects table -->
        <div class="card overflow-hidden p-0">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 text-left">
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Проєкт</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Клієнт</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Бюджет</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дедлайн</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Дії</th>
                </tr>
              </thead>
              <tbody id="projects-tbody" class="divide-y divide-gray-100 dark:divide-gray-700"></tbody>
            </table>
          </div>
          <div id="projects-empty" class="hidden text-center py-16">
            <div class="text-6xl mb-4">📋</div>
            <p class="text-gray-500 dark:text-gray-400 font-medium">Немає проєктів</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Натисніть «Новий проєкт» щоб розпочати</p>
          </div>
        </div>
      </div>
    `;

    _renderStats();
    _renderTable();

    document.getElementById('add-project-btn').addEventListener('click', () => _openForm());
    document.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        filterStatus = btn.dataset.filter;
        render();
      });
    });
  }

  function _renderStats() {
    const all = Store.getAll('projects');
    const stats = [
      { label: 'Всього', value: all.length, icon: '📁', color: 'indigo' },
      { label: 'В роботі', value: all.filter(p => p.status === 'in-progress').length, icon: '⚡', color: 'blue' },
      { label: 'Виконано', value: all.filter(p => p.status === 'done').length, icon: '✅', color: 'green' },
      { label: 'Прострочено', value: all.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status !== 'done' && p.status !== 'cancelled').length, icon: '⚠️', color: 'red' },
    ];
    const colorMap = { indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20', blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20', green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20', red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' };
    document.getElementById('project-stats').innerHTML = stats.map(s => `
      <div class="card flex items-center gap-3 py-3">
        <div class="w-10 h-10 rounded-xl ${colorMap[s.color]} flex items-center justify-center text-xl">${s.icon}</div>
        <div>
          <p class="text-xs text-gray-400 uppercase font-medium">${s.label}</p>
          <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">${s.value}</p>
        </div>
      </div>
    `).join('');
  }

  function _renderTable() {
    const all = Store.getAll('projects');
    const clients = Store.getAll('clients');
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c.name; });

    let filtered = filterStatus === 'all' ? all : all.filter(p => p.status === filterStatus);
    // Sort: active first, then by deadline
    filtered = filtered.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

    const tbody = document.getElementById('projects-tbody');
    const empty = document.getElementById('projects-empty');

    if (!filtered.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    tbody.innerHTML = filtered.map(p => {
      const st = STATUSES[p.status] || { label: p.status, cls: 'badge-gray' };
      const deadline = p.deadline ? new Date(p.deadline) : null;
      const daysLeft = deadline ? Math.ceil((deadline - Date.now()) / 86400000) : null;
      const isOverdue = deadline && deadline < new Date() && p.status !== 'done' && p.status !== 'cancelled';
      const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && p.status !== 'done';

      return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
          <td class="px-4 py-3">
            <div class="font-medium text-gray-800 dark:text-gray-100">${p.name}</div>
            ${p.description ? `<div class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">${p.description}</div>` : ''}
          </td>
          <td class="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">${clientMap[p.clientId] || '—'}</td>
          <td class="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">${p.budget ? _fmt(p.budget) : '—'}</td>
          <td class="px-4 py-3">
            ${deadline ? `
              <div class="${isOverdue ? 'text-red-500 font-semibold' : isUrgent ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}">
                ${isOverdue ? '🔴 ' : isUrgent ? '⚠️ ' : ''}
                ${deadline.toLocaleDateString('uk-UA')}
              </div>
              <div class="text-xs ${isOverdue ? 'text-red-400' : 'text-gray-400'}">
                ${isOverdue ? `Прострочено на ${Math.abs(daysLeft)} дн.` : daysLeft === 0 ? 'Сьогодні' : `${daysLeft} дн.`}
              </div>
            ` : '<span class="text-gray-400">—</span>'}
          </td>
          <td class="px-4 py-3">
            <select data-id="${p.id}" class="status-select text-xs rounded-lg px-2 py-1 font-medium border-0 cursor-pointer
              ${p.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                p.status === 'review' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                p.status === 'done' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}">
              ${Object.entries(STATUSES).map(([v, s]) => `<option value="${v}" ${p.status === v ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </td>
          <td class="px-4 py-3 text-right">
            <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="btn-icon edit-project" data-id="${p.id}" title="Редагувати">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="btn-icon btn-icon-danger delete-project" data-id="${p.id}" title="Видалити">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.edit-project').forEach(btn => btn.addEventListener('click', () => _openForm(btn.dataset.id)));
    tbody.querySelectorAll('.delete-project').forEach(btn => btn.addEventListener('click', () => _confirmDelete(btn.dataset.id)));
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => _changeStatus(sel.dataset.id, sel.value));
    });
  }

  function _openForm(id) {
    const project = id ? Store.getById('projects', id) : null;
    const clients = Store.getAll('clients');

    Modal.open({
      title: project ? 'Редагувати проєкт' : 'Новий проєкт',
      size: 'md',
      content: `
        <form id="project-form" class="space-y-4">
          <div>
            <label class="label">Назва проєкту *</label>
            <input name="name" type="text" class="input" value="${project?.name || ''}" placeholder="Розробка сайту" required />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Клієнт</label>
              <select name="clientId" class="input">
                <option value="">— Без клієнта —</option>
                ${clients.map(c => `<option value="${c.id}" ${project?.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Статус</label>
              <select name="status" class="input">
                ${Object.entries(STATUSES).map(([v, s]) => `<option value="${v}" ${(project?.status || 'in-progress') === v ? 'selected' : ''}>${s.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Дедлайн</label>
              <input name="deadline" type="date" class="input" value="${project?.deadline || ''}" />
            </div>
            <div>
              <label class="label">Бюджет (грн)</label>
              <input name="budget" type="number" min="0" class="input" value="${project?.budget || ''}" placeholder="0" />
            </div>
          </div>
          <div>
            <label class="label">Опис</label>
            <textarea name="description" rows="3" class="input resize-none" placeholder="Деталі проєкту...">${project?.description || ''}</textarea>
          </div>
        </form>
      `,
      onConfirm: () => _saveProject(id),
    });
  }

  function _saveProject(id) {
    const form = document.getElementById('project-form');
    Validator.clearAllErrors(form);

    const name = form.name.value.trim();
    const budget = form.budget.value;

    let valid = true;
    const nameErr = Validator.required(name, 'Назва');
    if (nameErr) { Validator.showError(form.name, nameErr); valid = false; }
    if (budget !== '') {
      const budgetErr = Validator.positiveNumber(budget, 'Бюджет');
      if (budgetErr) { Validator.showError(form.budget, budgetErr); valid = false; }
    }
    if (!valid) return;

    const data = {
      name,
      clientId: form.clientId.value || null,
      status: form.status.value,
      deadline: form.deadline.value || null,
      budget: budget ? parseFloat(budget) : null,
      description: form.description.value.trim(),
    };

    const isNew = !id;
    if (id) {
      Store.update('projects', id, data);
      Notifications.add(`Проєкт "${data.name}" оновлено`);
    } else {
      Store.save('projects', data);
      Notifications.add(`Новий проєкт "${data.name}" створено`, 'telegram');
    }

    // Check deadline
    if (data.deadline) {
      const daysLeft = Math.ceil((new Date(data.deadline) - Date.now()) / 86400000);
      if (daysLeft <= 3 && daysLeft >= 0) {
        Notifications.add(`⚠️ Проєкт "${data.name}": дедлайн через ${daysLeft} дн.`, 'telegram');
      }
    }

    Modal.close();
    EventBus.emit('data:changed');
    render();
  }

  function _changeStatus(id, newStatus) {
    const project = Store.getById('projects', id);
    if (!project) return;
    Store.update('projects', id, { status: newStatus });
    const label = STATUSES[newStatus]?.label || newStatus;
    Notifications.add(`Проєкт "${project.name}": статус змінено на «${label}»`);
    EventBus.emit('data:changed');
    _renderStats();
    _renderTable();
  }

  function _confirmDelete(id) {
    const project = Store.getById('projects', id);
    if (!project) return;
    Modal.open({
      title: 'Видалити проєкт?',
      content: `
        <div class="text-center py-4">
          <div class="text-5xl mb-4">🗑️</div>
          <p class="text-gray-700 dark:text-gray-300">Видалити проєкт <strong>"${project.name}"</strong>?</p>
          <p class="mt-2 text-sm text-gray-500">Цю дію неможливо скасувати.</p>
        </div>
      `,
      confirmText: 'Видалити',
      onConfirm: () => {
        Store.remove('projects', id);
        Notifications.add(`Проєкт "${project.name}" видалено`);
        Modal.close();
        EventBus.emit('data:changed');
        render();
      },
    });
  }

  function _fmt(n) { return new Intl.NumberFormat('uk-UA', { style:'currency', currency:'UAH', maximumFractionDigits:0 }).format(n||0); }

  return { render };
})();
