/**
 * Client Portal page — Generate shareable status pages for clients
 */
const PortalPage = (() => {

  function render() {
    const content = document.getElementById('content');
    const clients = Store.getAll('clients');

    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Клієнтський портал</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Генеруйте персональні посилання для клієнтів — вони бачать свої проєкти, рахунки та статуси</p>
          </div>
          <button id="open-booking-btn" class="btn-primary self-start sm:self-auto">
            📅 Форма запису
          </button>
        </div>

        <!-- Info banner -->
        <div class="card border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 p-4">
          <div class="flex gap-3">
            <span class="text-2xl shrink-0">💡</span>
            <div>
              <p class="font-semibold text-indigo-800 dark:text-indigo-200 text-sm">Як це працює</p>
              <p class="text-sm text-indigo-700 dark:text-indigo-300 mt-1">Оберіть клієнта → Система генерує унікальне посилання → Поділіться з клієнтом → Він бачить свої проєкти, інвойси та може залишити заявку. Дані зберігаються локально (симуляція).</p>
            </div>
          </div>
        </div>

        <!-- Client portal cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          ${clients.map(c => _clientPortalCard(c)).join('')}
          ${!clients.length ? `<div class="col-span-3 card text-center py-16"><div class="text-6xl mb-4">🔗</div><p class="text-gray-500 dark:text-gray-400">Спершу додайте клієнтів у розділі "Клієнти"</p></div>` : ''}
        </div>

        <!-- Booking form section -->
        <div class="card" id="booking-section">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-2xl">📅</span>
            <div>
              <h3 class="font-semibold text-gray-800 dark:text-gray-100">Відкрита форма для заявок</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Вбудований виджет — клієнт заповнює форму, заявка відразу потрапляє в CRM</p>
            </div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Form preview -->
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Форма запису (прев'ю)</p>
              <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-5 bg-gray-50 dark:bg-gray-700/30">
                <form id="booking-form" class="space-y-3">
                  <div>
                    <label class="label text-xs">Ваше ім'я *</label>
                    <input name="name" type="text" class="input py-2" placeholder="Іван Петренко" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="label text-xs">Телефон</label>
                      <input name="phone" type="tel" class="input py-2" placeholder="+380..." />
                    </div>
                    <div>
                      <label class="label text-xs">Email</label>
                      <input name="email" type="email" class="input py-2" placeholder="email@..." />
                    </div>
                  </div>
                  <div>
                    <label class="label text-xs">Тип послуги</label>
                    <select name="service" class="input py-2">
                      <option>Веб-розробка</option>
                      <option>Дизайн</option>
                      <option>Консалтинг</option>
                      <option>SEO/Маркетинг</option>
                      <option>Інше</option>
                    </select>
                  </div>
                  <div>
                    <label class="label text-xs">Опис задачі</label>
                    <textarea name="message" rows="2" class="input py-2 resize-none" placeholder="Розкажіть про свій проєкт..."></textarea>
                  </div>
                  <div>
                    <label class="label text-xs">Бажаний час зустрічі</label>
                    <input name="meetingDate" type="datetime-local" class="input py-2" />
                  </div>
                  <button type="button" id="submit-booking" class="btn-primary w-full justify-center">
                    📩 Надіслати заявку
                  </button>
                </form>
              </div>
            </div>
            <!-- Incoming leads -->
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Вхідні заявки</p>
              <div id="incoming-leads"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    _renderIncomingLeads();

    document.getElementById('submit-booking').addEventListener('click', () => _submitBooking());
    document.getElementById('open-booking-btn').addEventListener('click', () => {
      document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelectorAll('.generate-link-btn').forEach(btn => {
      btn.addEventListener('click', () => _showPortalLink(btn.dataset.clientId));
    });

    document.querySelectorAll('.view-portal-btn').forEach(btn => {
      btn.addEventListener('click', () => _openPortalPreview(btn.dataset.clientId));
    });
  }

  function _clientPortalCard(client) {
    const projects = Store.getAll('projects').filter(p => p.clientId === client.id);
    const invoices = Store.getAll('invoices').filter(i => i.clientId === client.id);
    const hasPortal = localStorage.getItem(`portal_token_${client.id}`);
    const token = hasPortal || _generateToken(client.id);

    return `
      <div class="card hover:shadow-lg transition-shadow">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            ${client.name.charAt(0).toUpperCase()}
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-gray-800 dark:text-gray-100 truncate">${client.name}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${client.company || 'Фрілансер'}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-4 text-center">
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2">
            <p class="text-lg font-bold text-gray-800 dark:text-gray-100">${projects.length}</p>
            <p class="text-xs text-gray-400">Проєктів</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2">
            <p class="text-lg font-bold text-gray-800 dark:text-gray-100">${invoices.length}</p>
            <p class="text-xs text-gray-400">Рахунків</p>
          </div>
        </div>

        <div class="mb-3 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl flex items-center gap-2">
          <span class="text-xs text-gray-400 font-mono truncate flex-1">🔗 portal/${token}</span>
          <button class="text-indigo-500 hover:text-indigo-700 text-xs font-semibold shrink-0 copy-token" data-token="${token}">Копіювати</button>
        </div>

        <div class="flex gap-2">
          <button class="btn-primary flex-1 justify-center text-sm py-2 view-portal-btn" data-client-id="${client.id}">
            👁 Перегляд
          </button>
          <button class="btn-secondary flex-1 justify-center text-sm py-2 generate-link-btn" data-client-id="${client.id}">
            🔄 Новий токен
          </button>
        </div>
      </div>
    `;
  }

  function _generateToken(clientId) {
    const token = `${clientId.slice(-6)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(`portal_token_${clientId}`, token);
    return token;
  }

  function _showPortalLink(clientId) {
    const client = Store.getById('clients', clientId);
    const token = _generateToken(clientId);
    const fakeUrl = `https://freelancehub.app/portal/${token}`;
    Modal.open({
      title: `Посилання для ${client?.name}`,
      size: 'sm',
      content: `
        <div class="space-y-4 text-center py-2">
          <div class="text-5xl">🔗</div>
          <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl font-mono text-sm text-gray-700 dark:text-gray-300 break-all">${fakeUrl}</div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Поділіться цим посиланням з клієнтом. Він зможе бачити свої проєкти та рахунки.</p>
        </div>
      `,
      confirmText: '📋 Копіювати посилання',
      onConfirm: () => {
        navigator.clipboard?.writeText(fakeUrl);
        Notifications.add(`Посилання для ${client?.name} скопійовано`, 'telegram');
        Modal.close();
        render();
      },
    });
  }

  function _openPortalPreview(clientId) {
    const client = Store.getById('clients', clientId);
    if (!client) return;

    const projects = Store.getAll('projects').filter(p => p.clientId === clientId);
    const invoices = Store.getAll('invoices').filter(i => i.clientId === clientId);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s,i) => s+(parseFloat(i.total)||0), 0);
    const totalDue = invoices.filter(i => i.status === 'sent').reduce((s,i) => s+(parseFloat(i.total)||0), 0);

    const STATUS_ICONS = { 'in-progress': '🔵', 'review': '🟡', 'done': '✅', 'cancelled': '🔴' };
    const STATUS_LABELS = { 'in-progress': 'В роботі', 'review': 'На перевірці', 'done': 'Виконано', 'cancelled': 'Скасовано' };
    const INV_STATUS = { draft: '⚪ Чернетка', sent: '🔵 Відправлено', paid: '✅ Оплачено', overdue: '🔴 Прострочено' };

    Modal.open({
      title: `Портал клієнта: ${client.name}`,
      size: 'xl',
      hideFooter: true,
      content: `
        <div class="space-y-5" style="font-family:Inter,sans-serif">
          <!-- Client header -->
          <div class="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white">
            <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">${client.name.charAt(0)}</div>
            <div>
              <p class="text-xl font-bold">${client.name}</p>
              <p class="text-indigo-200 text-sm">${client.company || ''} ${client.email ? `· ${client.email}` : ''}</p>
            </div>
          </div>

          <!-- Balance -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
              <p class="text-xs text-green-600 dark:text-green-400 font-semibold uppercase">✅ Оплачено</p>
              <p class="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">${_fmt(totalPaid)}</p>
            </div>
            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
              <p class="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">🕐 До оплати</p>
              <p class="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">${_fmt(totalDue)}</p>
            </div>
          </div>

          <!-- Projects -->
          <div>
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">📁 Мої проєкти (${projects.length})</p>
            ${projects.length ? projects.map(p => `
              <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 mb-2">
                <div>
                  <p class="font-medium text-gray-800 dark:text-gray-100 text-sm">${p.name}</p>
                  ${p.deadline ? `<p class="text-xs text-gray-400">📅 Дедлайн: ${p.deadline}</p>` : ''}
                </div>
                <span class="text-sm">${STATUS_ICONS[p.status] || '⚪'} ${STATUS_LABELS[p.status] || p.status}</span>
              </div>
            `).join('') : '<p class="text-sm text-gray-400">Немає проєктів</p>'}
          </div>

          <!-- Invoices -->
          <div>
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">🧾 Рахунки (${invoices.length})</p>
            ${invoices.length ? invoices.map(inv => `
              <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 mb-2">
                <div>
                  <p class="font-medium text-gray-800 dark:text-gray-100 text-sm">#${inv.number}</p>
                  <p class="text-xs text-gray-400">${inv.issueDate || '—'} ${inv.dueDate ? `→ ${inv.dueDate}` : ''}</p>
                </div>
                <div class="text-right">
                  <p class="font-bold text-gray-800 dark:text-gray-100 text-sm">${_fmt(inv.total)}</p>
                  <p class="text-xs">${INV_STATUS[inv.status] || inv.status}</p>
                </div>
              </div>
            `).join('') : '<p class="text-sm text-gray-400">Немає рахунків</p>'}
          </div>

          <div class="text-center text-xs text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            Powered by FreelanceHub Pro · Це симуляція клієнтського порталу
          </div>
        </div>
      `,
    });
  }

  function _submitBooking() {
    const form = document.getElementById('booking-form');
    Validator.clearAllErrors(form);

    const name = form.name.value.trim();
    const nameErr = Validator.required(name, "Ім'я");
    if (nameErr) { Validator.showError(form.name, nameErr); return; }

    // Create lead as a new client
    const existingClients = Store.getAll('clients');
    const existing = existingClients.find(c => c.phone === form.phone.value.trim() || c.email === form.email.value.trim());

    let clientId;
    if (!existing) {
      const newClient = Store.save('clients', {
        name,
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        status: 'lead',
        notes: `Заявка зі форми. Послуга: ${form.service.value}. ${form.message.value.trim()}`,
      });
      clientId = newClient.id;
    } else {
      clientId = existing.id;
    }

    // Create deal
    const deal = Store.save('deals', {
      title: `Заявка: ${form.service.value}`,
      clientId,
      stage: 'new',
      probability: 10,
      notes: form.message.value.trim(),
      expectedClose: form.meetingDate.value ? form.meetingDate.value.slice(0, 10) : null,
    });

    // Activity log
    Store.save('activity_logs', {
      clientId,
      dealId: deal.id,
      type: 'note',
      title: `Нова заявка зі форми запису`,
      body: `Клієнт: ${name}. Послуга: ${form.service.value}. ${form.message.value.trim()}`,
    });

    Notifications.add(`🆕 Нова заявка від ${name} (${form.service.value})! Перевірте воронку.`, 'telegram');
    EventBus.emit('data:changed');

    // Reset form
    form.reset();
    _renderIncomingLeads();

    // Success message
    const btn = document.getElementById('submit-booking');
    const orig = btn.textContent;
    btn.textContent = '✅ Заявку надіслано!';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
  }

  function _renderIncomingLeads() {
    const el = document.getElementById('incoming-leads');
    if (!el) return;
    const leads = Store.getAll('clients').filter(c => c.status === 'lead').slice().reverse().slice(0, 10);
    if (!leads.length) {
      el.innerHTML = `<div class="text-center py-8 text-sm text-gray-400">Нових заявок немає.<br>Вони з'являться тут після заповнення форми зліва.</div>`;
      return;
    }
    el.innerHTML = `<div class="space-y-2">
      ${leads.map(l => `
        <div class="flex items-start justify-between gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white text-sm font-bold shrink-0">${l.name.charAt(0)}</div>
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">${l.name}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${l.phone || l.email || '—'}</p>
            </div>
          </div>
          <span class="badge-green text-xs shrink-0">Новий лід</span>
        </div>
      `).join('')}
    </div>`;
  }

  function _fmt(n) { return new Intl.NumberFormat('uk-UA', { style:'currency', currency:'UAH', maximumFractionDigits:0 }).format(n||0); }

  return { render };
})();
