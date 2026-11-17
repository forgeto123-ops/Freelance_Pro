/**
 * Deals page — Sales pipeline / Funnel management
 * Manages deals through stages with probability and revenue forecasting
 */
const DealsPage = (() => {
  const STAGES = {
    new:         { label: 'Нові ліди',       color: '#6366f1', cls: 'badge-gray',   prob: 10 },
    contacted:   { label: 'Контакт встановлено', color: '#3b82f6', cls: 'badge-blue',   prob: 25 },
    proposal:    { label: 'КП надіслано',    color: '#f59e0b', cls: 'badge-yellow', prob: 50 },
    negotiation: { label: 'Переговори',      color: '#8b5cf6', cls: 'badge-purple', prob: 75 },
    won:         { label: 'Виграно ✓',       color: '#10b981', cls: 'badge-green',  prob: 100 },
    lost:        { label: 'Програно ✗',      color: '#ef4444', cls: 'badge-red',    prob: 0 },
  };

  // Extra badge colors
  const BADGE_PURPLE = `display:inline-block;padding:0.125rem 0.625rem;border-radius:9999px;background:#ede9fe;color:#6d28d9;font-weight:600;`;

  let viewMode = 'kanban'; // 'kanban' | 'list'

  function render() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Воронка продажів</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Відстежуйте угоди на всіх етапах від ліда до оплати</p>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <!-- View toggle -->
            <div class="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <button id="view-kanban" class="px-3 py-2 text-sm font-medium transition-colors ${viewMode==='kanban' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}">
                ⊞ Канбан
              </button>
              <button id="view-list" class="px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${viewMode==='list' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}">
                ☰ Список
              </button>
            </div>
            <button id="add-deal-btn" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Нова угода
            </button>
          </div>
        </div>

        <!-- Pipeline summary -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="pipeline-summary"></div>

        <!-- Forecast bar -->
        <div class="card" id="forecast-bar"></div>

        <!-- Main view -->
        <div id="deals-view"></div>

        <!-- Smart Follow-ups -->
        <div id="followup-section"></div>
      </div>
    `;

    _renderSummary();
    _renderForecast();
    _renderView();
    _renderFollowUps();

    document.getElementById('add-deal-btn').addEventListener('click', () => _openForm());
    document.getElementById('view-kanban').addEventListener('click', () => { viewMode = 'kanban'; render(); });
    document.getElementById('view-list').addEventListener('click', () => { viewMode = 'list'; render(); });
  }

  function _renderSummary() {
    const all = Store.getAll('deals');
    const active = all.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const won = all.filter(d => d.stage === 'won');
    const totalPipeline = active.reduce((s, d) => s + (parseFloat(d.amount)||0), 0);
    const totalWon = won.reduce((s, d) => s + (parseFloat(d.amount)||0), 0);
    const weighted = active.reduce((s, d) => {
      const prob = parseInt(d.probability ?? STAGES[d.stage]?.prob ?? 50);
      return s + (parseFloat(d.amount)||0) * (prob / 100);
    }, 0);
    const convRate = all.length ? Math.round(won.length / all.length * 100) : 0;

    document.getElementById('pipeline-summary').innerHTML = [
      { label: 'Активні угоди', value: active.length, sub: `${all.length} всього`, icon: '🎯', color: 'indigo' },
      { label: 'Pipeline', value: _fmt(totalPipeline), sub: 'потенційна сума', icon: '💼', color: 'blue' },
      { label: 'Зважений прогноз', value: _fmt(weighted), sub: 'за ймовірністю', icon: '📊', color: 'purple' },
      { label: 'Виграно', value: _fmt(totalWon), sub: `${convRate}% конверсія`, icon: '🏆', color: 'green' },
    ].map(s => `
      <div class="card py-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">${s.icon}</span>
          <p class="text-xs text-gray-400 uppercase font-medium leading-tight">${s.label}</p>
        </div>
        <p class="text-xl font-bold ${s.color==='green'?'text-green-600 dark:text-green-400':s.color==='blue'?'text-blue-600 dark:text-blue-400':s.color==='purple'?'text-purple-600 dark:text-purple-400':'text-indigo-600 dark:text-indigo-400'}">${s.value}</p>
        <p class="text-xs text-gray-400 mt-0.5">${s.sub}</p>
      </div>
    `).join('');
  }

  function _renderForecast() {
    const all = Store.getAll('deals').filter(d => d.stage !== 'lost');
    const byStage = {};
    Object.keys(STAGES).filter(s => s !== 'lost').forEach(s => { byStage[s] = 0; });
    all.forEach(d => { byStage[d.stage] = (byStage[d.stage] || 0) + (parseFloat(d.amount)||0); });

    const total = Object.values(byStage).reduce((a,b) => a+b, 0);
    if (!total) { document.getElementById('forecast-bar').innerHTML = `<p class="text-sm text-gray-400 text-center py-2">Немає даних для прогнозу</p>`; return; }

    document.getElementById('forecast-bar').innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Прогноз доходів по воронці</h3>
        <span class="text-sm font-bold text-gray-700 dark:text-gray-300">${_fmt(total)}</span>
      </div>
      <div class="flex rounded-xl overflow-hidden h-6 gap-px">
        ${Object.entries(byStage).filter(([,v]) => v > 0).map(([stage, val]) => `
          <div class="relative group cursor-default" style="flex:${val};background:${STAGES[stage].color};" title="${STAGES[stage].label}: ${_fmt(val)}">
            <div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg text-xs font-medium text-white whitespace-nowrap z-10" style="background:${STAGES[stage].color}">
              ${STAGES[stage].label}: ${_fmt(val)}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="flex flex-wrap gap-3 mt-3">
        ${Object.entries(byStage).filter(([,v]) => v > 0).map(([stage, val]) => `
          <div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:${STAGES[stage].color}"></span>
            <span>${STAGES[stage].label}</span>
            <span class="font-semibold">${_fmt(val)}</span>
            <span class="text-gray-400">(${Math.round(val/total*100)}%)</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function _renderView() {
    if (viewMode === 'kanban') _renderKanban();
    else _renderList();
  }

  function _renderKanban() {
    const all = Store.getAll('deals');
    const clients = Store.getAll('clients');
    const cm = {}; clients.forEach(c => { cm[c.id] = c; });

    const container = document.getElementById('deals-view');
    container.innerHTML = `
      <div class="overflow-x-auto pb-2">
        <div class="flex gap-4 min-w-max">
          ${Object.entries(STAGES).map(([stage, cfg]) => {
            const cards = all.filter(d => d.stage === stage);
            const total = cards.reduce((s,d) => s+(parseFloat(d.amount)||0), 0);
            return `
              <div class="w-64 shrink-0">
                <div class="flex items-center justify-between mb-3 px-1">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full" style="background:${cfg.color}"></div>
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${cfg.label}</span>
                    <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="background:${cfg.color}22;color:${cfg.color}">${cards.length}</span>
                  </div>
                  ${total > 0 ? `<span class="text-xs font-semibold text-gray-500 dark:text-gray-400">${_fmt(total)}</span>` : ''}
                </div>
                <div class="space-y-3 min-h-24" data-stage="${stage}" id="kanban-col-${stage}">
                  ${cards.map(d => _kanbanCard(d, cm)).join('')}
                  ${cards.length === 0 ? `<div class="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center text-xs text-gray-400">Перетягніть сюди</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.deal-card').forEach(card => {
      card.querySelector('.edit-deal-btn').addEventListener('click', e => { e.stopPropagation(); _openForm(card.dataset.id); });
      card.querySelector('.delete-deal-btn').addEventListener('click', e => { e.stopPropagation(); _confirmDelete(card.dataset.id); });
      card.querySelector('.activity-deal-btn').addEventListener('click', e => { e.stopPropagation(); _openActivityForm(card.dataset.id); });
    });
  }

  function _kanbanCard(d, clientMap) {
    const client = clientMap[d.clientId];
    const stage = STAGES[d.stage] || STAGES.new;
    const prob = parseInt(d.probability ?? stage.prob);
    const daysLeft = d.expectedClose ? Math.ceil((new Date(d.expectedClose) - Date.now()) / 86400000) : null;
    return `
      <div class="deal-card bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" data-id="${d.id}">
        <div class="flex items-start justify-between gap-1 mb-2">
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug flex-1">${d.title}</p>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button class="activity-deal-btn btn-icon p-1" title="Додати активність">📝</button>
            <button class="edit-deal-btn btn-icon p-1" title="Редагувати">✏️</button>
            <button class="delete-deal-btn btn-icon btn-icon-danger p-1" title="Видалити">🗑️</button>
          </div>
        </div>
        ${client ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">👤 ${client.name}${client.company ? ` · ${client.company}` : ''}</p>` : ''}
        <div class="flex items-center justify-between mt-2">
          <span class="text-sm font-bold text-gray-700 dark:text-gray-300">${d.amount ? _fmt(d.amount) : '—'}</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:${stage.color}22;color:${stage.color}">${prob}%</span>
        </div>
        <!-- Probability bar -->
        <div class="mt-2 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div class="h-full rounded-full transition-all" style="width:${prob}%;background:${stage.color}"></div>
        </div>
        ${daysLeft !== null ? `<p class="text-xs mt-1.5 ${daysLeft < 0 ? 'text-red-500 font-semibold' : daysLeft <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}">${daysLeft < 0 ? '🔴 Прострочено' : daysLeft === 0 ? '🟡 Сьогодні' : `📅 ${daysLeft} дн.`}</p>` : ''}
      </div>
    `;
  }

  function _renderList() {
    const all = Store.getAll('deals').slice().sort((a,b) => (parseFloat(b.amount)||0) - (parseFloat(a.amount)||0));
    const clients = Store.getAll('clients');
    const cm = {}; clients.forEach(c => { cm[c.id] = c; });

    const container = document.getElementById('deals-view');
    if (!all.length) {
      container.innerHTML = `<div class="card text-center py-16"><div class="text-6xl mb-4">🎯</div><p class="text-gray-500 dark:text-gray-400 font-medium">Немає угод</p><p class="text-sm text-gray-400 mt-1">Натисніть «Нова угода» щоб розпочати</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="card overflow-hidden p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-700/50 text-left">
                <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Угода</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Клієнт</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сума</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Ймовірність</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Етап</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Закрити до</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Дії</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              ${all.map(d => {
                const client = cm[d.clientId];
                const st = STAGES[d.stage] || STAGES.new;
                const prob = parseInt(d.probability ?? st.prob);
                return `
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-800 dark:text-gray-100">${d.title}</p>
                      ${d.notes ? `<p class="text-xs text-gray-400 truncate max-w-xs">${d.notes}</p>` : ''}
                    </td>
                    <td class="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">${client?.name || '—'}</td>
                    <td class="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">${d.amount ? _fmt(d.amount) : '—'}</td>
                    <td class="px-4 py-3 hidden md:table-cell">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                          <div class="h-full rounded-full" style="width:${prob}%;background:${st.color}"></div>
                        </div>
                        <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 w-8">${prob}%</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <select data-id="${d.id}" class="deal-stage-select text-xs rounded-lg px-2 py-1 font-semibold border-0 cursor-pointer" style="background:${st.color}22;color:${st.color}">
                        ${Object.entries(STAGES).map(([v, s]) => `<option value="${v}" ${d.stage===v?'selected':''}>${s.label}</option>`).join('')}
                      </select>
                    </td>
                    <td class="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">${d.expectedClose || '—'}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn-icon activity-deal" data-id="${d.id}" title="Активність">📝</button>
                        <button class="btn-icon edit-deal" data-id="${d.id}" title="Редагувати">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="btn-icon btn-icon-danger delete-deal" data-id="${d.id}" title="Видалити">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelectorAll('.edit-deal').forEach(btn => btn.addEventListener('click', () => _openForm(btn.dataset.id)));
    container.querySelectorAll('.delete-deal').forEach(btn => btn.addEventListener('click', () => _confirmDelete(btn.dataset.id)));
    container.querySelectorAll('.activity-deal').forEach(btn => btn.addEventListener('click', () => _openActivityForm(btn.dataset.id)));
    container.querySelectorAll('.deal-stage-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const deal = Store.getById('deals', sel.dataset.id);
        Store.update('deals', sel.dataset.id, { stage: sel.value, probability: STAGES[sel.value]?.prob });
        const label = STAGES[sel.value]?.label || sel.value;
        Notifications.add(`Угода "${deal.title}": перейшла на етап «${label}»`);
        if (sel.value === 'won') Notifications.add(`🎉 Угоду "${deal.title}" закрито! Дохід: ${_fmt(deal.amount)}`, 'email');
        EventBus.emit('data:changed');
        render();
      });
    });
  }

  function _renderFollowUps() {
    const clients = Store.getAll('clients');
    const logs = Store.getAll('activity_logs');
    const deals = Store.getAll('deals');
    const followUps = [];
    const DAYS_THRESHOLD = parseInt(localStorage.getItem('saas_followup_days') || '30');

    clients.forEach(c => {
      const lastLog = logs.filter(l => l.clientId === c.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const lastDeal = deals.filter(d => d.clientId === c.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const lastActivity = lastLog || lastDeal;
      if (!lastActivity) return;
      const daysSince = Math.floor((Date.now() - new Date(lastActivity.createdAt)) / 86400000);
      if (daysSince >= DAYS_THRESHOLD) {
        followUps.push({ client: c, daysSince, lastActivity });
      }
    });

    const el = document.getElementById('followup-section');
    if (!followUps.length) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <div class="card border-l-4 border-yellow-400">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🔔</span>
          <div>
            <h3 class="font-semibold text-gray-800 dark:text-gray-100">Smart Follow-up</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Клієнти, з якими давно не було контакту (більше ${DAYS_THRESHOLD} днів)</p>
          </div>
        </div>
        <div class="space-y-2">
          ${followUps.map(f => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">${f.client.name.charAt(0)}</div>
                <div>
                  <p class="font-medium text-gray-800 dark:text-gray-100 text-sm">${f.client.name}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Останній контакт: <strong>${f.daysSince} дн. тому</strong></p>
                </div>
              </div>
              <div class="flex gap-2">
                <button class="btn-secondary text-xs py-1.5 px-3 followup-contact" data-id="${f.client.id}" data-name="${f.client.name}">
                  📨 Написати
                </button>
                <button class="btn-secondary text-xs py-1.5 px-3 followup-dismiss" data-id="${f.client.id}">
                  Відкласти
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    el.querySelectorAll('.followup-contact').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        _openFollowUpComposer(btn.dataset.id, name);
      });
    });

    el.querySelectorAll('.followup-dismiss').forEach(btn => {
      btn.addEventListener('click', () => {
        // Add a dummy log to reset follow-up timer
        Store.save('activity_logs', { clientId: btn.dataset.id, type: 'note', title: 'Follow-up відкладено', body: '' });
        _renderFollowUps();
      });
    });
  }

  function _openFollowUpComposer(clientId, clientName) {
    Modal.open({
      title: `Написати клієнту: ${clientName}`,
      size: 'md',
      content: `
        <div class="space-y-4">
          <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm text-indigo-700 dark:text-indigo-300">
            💡 AI генерує шаблон повідомлення. Відредагуйте під свій стиль.
          </div>
          <div>
            <label class="label">Канал</label>
            <div class="grid grid-cols-3 gap-2">
              ${['📱 Telegram', '✉️ Email', '📞 Viber'].map((ch, i) => `
                <label class="flex items-center justify-center gap-1 p-2 rounded-xl border-2 cursor-pointer transition-all border-gray-200 dark:border-gray-600 hover:border-indigo-300 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="radio" name="followup-channel" value="${ch}" ${i===0?'checked':''} class="sr-only" />
                  ${ch}
                </label>
              `).join('')}
            </div>
          </div>
          <div>
            <label class="label">Повідомлення</label>
            <textarea id="followup-msg" rows="5" class="input resize-none">Привіт, ${clientName}! 👋

Давно не спілкувались. Хотів нагадати про себе та дізнатись, чи є у вас нові задачі або проєкти, з якими я можу допомогти?

З повагою,
[Ваше ім'я]</textarea>
          </div>
        </div>
      `,
      confirmText: '📨 Відправити (симуляція)',
      onConfirm: () => {
        const msg = document.getElementById('followup-msg').value;
        Store.save('activity_logs', { clientId, type: 'email', title: 'Follow-up повідомлення відправлено', body: msg });
        Notifications.add(`Follow-up надіслано клієнту ${clientName}`, 'telegram');
        Modal.close();
        EventBus.emit('data:changed');
        _renderFollowUps();
      },
    });
  }

  function _openForm(id) {
    const deal = id ? Store.getById('deals', id) : null;
    const clients = Store.getAll('clients');
    const today = new Date().toISOString().slice(0, 10);

    Modal.open({
      title: deal ? 'Редагувати угоду' : 'Нова угода',
      size: 'md',
      content: `
        <form id="deal-form" class="space-y-4">
          <div>
            <label class="label">Назва угоди *</label>
            <input name="title" type="text" class="input" value="${deal?.title || ''}" placeholder="Розробка CRM системи" required />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Клієнт</label>
              <select name="clientId" class="input">
                <option value="">— Без клієнта —</option>
                ${clients.map(c => `<option value="${c.id}" ${deal?.clientId===c.id?'selected':''}>${c.name}${c.company?` (${c.company})`:''}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Сума угоди (грн)</label>
              <input name="amount" type="number" min="0" class="input" value="${deal?.amount || ''}" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Етап воронки</label>
              <select name="stage" class="input" id="deal-stage-select">
                ${Object.entries(STAGES).map(([v, s]) => `<option value="${v}" ${(deal?.stage||'new')===v?'selected':''}>${s.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Ймовірність (%)</label>
              <input name="probability" type="number" min="0" max="100" class="input" id="deal-prob-input" value="${deal?.probability ?? 50}" placeholder="50" />
            </div>
          </div>
          <div>
            <label class="label">Очікувана дата закриття</label>
            <input name="expectedClose" type="date" class="input" value="${deal?.expectedClose || ''}" />
          </div>
          <div>
            <label class="label">Нотатки</label>
            <textarea name="notes" rows="2" class="input resize-none" placeholder="Деталі угоди...">${deal?.notes || ''}</textarea>
          </div>
        </form>
      `,
      onConfirm: () => _saveDeal(id),
    });

    // Auto-fill probability when stage changes
    document.getElementById('deal-stage-select').addEventListener('change', e => {
      document.getElementById('deal-prob-input').value = STAGES[e.target.value]?.prob ?? 50;
    });
  }

  function _saveDeal(id) {
    const form = document.getElementById('deal-form');
    Validator.clearAllErrors(form);

    const title = form.title.value.trim();
    const amount = form.amount.value;
    let valid = true;

    const titleErr = Validator.required(title, 'Назва угоди');
    if (titleErr) { Validator.showError(form.title, titleErr); valid = false; }
    if (amount !== '') {
      const amtErr = Validator.positiveNumber(amount, 'Сума');
      if (amtErr) { Validator.showError(form.amount, amtErr); valid = false; }
    }
    if (!valid) return;

    const data = {
      title,
      clientId: form.clientId.value || null,
      amount: amount ? parseFloat(amount) : null,
      stage: form.stage.value,
      probability: parseInt(form.probability.value) || STAGES[form.stage.value]?.prob || 50,
      expectedClose: form.expectedClose.value || null,
      notes: form.notes.value.trim(),
    };

    if (id) {
      Store.update('deals', id, data);
      Notifications.add(`Угоду "${data.title}" оновлено`);
    } else {
      const saved = Store.save('deals', data);
      const client = data.clientId ? Store.getById('clients', data.clientId) : null;
      Notifications.add(`Нова угода "${data.title}"${client ? ` з ${client.name}` : ''} — ${_fmt(data.amount)}`, 'telegram');
      // Log activity
      Store.save('activity_logs', { clientId: data.clientId, dealId: saved.id, type: 'note', title: `Угоду "${data.title}" створено`, body: data.notes || '' });
    }

    Modal.close();
    EventBus.emit('data:changed');
    render();
  }

  function _openActivityForm(dealId) {
    const deal = Store.getById('deals', dealId);
    Modal.open({
      title: `Активність: ${deal?.title || 'Угода'}`,
      size: 'sm',
      content: `
        <form id="deal-activity-form" class="space-y-4">
          <div>
            <label class="label">Тип активності</label>
            <select name="type" class="input">
              <option value="call">📞 Дзвінок</option>
              <option value="email">✉️ Email</option>
              <option value="meeting">🤝 Зустріч</option>
              <option value="note" selected>📝 Нотатка</option>
            </select>
          </div>
          <div>
            <label class="label">Опис *</label>
            <input name="title" type="text" class="input" placeholder="Провели демо-дзвінок..." required />
          </div>
          <div>
            <label class="label">Деталі</label>
            <textarea name="body" rows="3" class="input resize-none" placeholder="Клієнт зацікавлений, потрібно надіслати КП..."></textarea>
          </div>
        </form>
      `,
      confirmText: 'Зберегти',
      onConfirm: () => {
        const form = document.getElementById('deal-activity-form');
        const title = form.title.value.trim();
        if (!title) { Validator.showError(form.title, 'Поле обов\'язкове'); return; }
        Store.save('activity_logs', { dealId, clientId: deal?.clientId, type: form.type.value, title, body: form.body.value.trim() });
        Notifications.add(`Активність "${title}" додано до угоди "${deal?.title}"`);
        Modal.close();
        EventBus.emit('data:changed');
      },
    });
  }

  function _confirmDelete(id) {
    const deal = Store.getById('deals', id);
    if (!deal) return;
    Modal.open({
      title: 'Видалити угоду?',
      content: `<div class="text-center py-4"><div class="text-5xl mb-4">🗑️</div><p class="text-gray-700 dark:text-gray-300">Видалити угоду <strong>"${deal.title}"</strong>?</p></div>`,
      confirmText: 'Видалити',
      onConfirm: () => { Store.remove('deals', id); Modal.close(); EventBus.emit('data:changed'); render(); },
    });
  }

  function _fmt(n) { return new Intl.NumberFormat('uk-UA', { style:'currency', currency:'UAH', maximumFractionDigits:0 }).format(n||0); }

  return { render };
})();
