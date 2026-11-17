/**
 * Dashboard page — analytics overview
 */
const DashboardPage = (() => {
  let revenueChart = null;
  let expenseChart = null;

  function render() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="kpi-cards"></div>

        <!-- Charts row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 card">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Доходи та витрати (6 місяців)</h3>
            <div class="relative" style="height:260px">
              <canvas id="revenue-chart"></canvas>
            </div>
          </div>
          <div class="card">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Витрати за категоріями</h3>
            <div class="relative" style="height:220px">
              <canvas id="expense-chart"></canvas>
            </div>
            <div id="expense-legend" class="mt-3 space-y-1.5"></div>
          </div>
        </div>

        <!-- Bottom row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Active projects -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Активні проєкти</h3>
              <a href="#projects" class="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">Всі проєкти →</a>
            </div>
            <div id="active-projects-table"></div>
          </div>
          <!-- Notifications feed -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Останні сповіщення</h3>
              <span id="unread-badge" class="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full"></span>
            </div>
            <div id="notif-feed"></div>
          </div>
        </div>
      </div>
    `;

    _renderKPIs();
    _renderRevenueChart();
    _renderExpenseChart();
    _renderActiveProjects();
    _renderNotifFeed();
  }

  function _renderKPIs() {
    const invoices = Store.getAll('invoices');
    const expenses = Store.getAll('expenses');

    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

    const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const balance = totalRevenue - totalExpenses;

    const unpaidCount = invoices.filter(i => i.status !== 'paid' && i.status !== 'draft').length;
    const unpaidAmount = invoices
      .filter(i => i.status === 'sent')
      .reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

    const kpis = [
      { label: 'Загальний дохід', value: _fmt(totalRevenue), icon: '💰', color: 'green', delta: '+' },
      { label: 'Загальні витрати', value: _fmt(totalExpenses), icon: '📉', color: 'red', delta: '-' },
      { label: 'Баланс', value: _fmt(balance), icon: '⚖️', color: balance >= 0 ? 'indigo' : 'red', delta: null },
      { label: 'Очікують оплати', value: _fmt(unpaidAmount), sub: `${unpaidCount} інвойс${_plural(unpaidCount)}`, icon: '🕐', color: 'yellow', delta: null },
    ];

    const colors = {
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    };

    document.getElementById('kpi-cards').innerHTML = kpis.map(k => `
      <div class="card flex items-start gap-4 hover:shadow-lg transition-shadow">
        <div class="w-12 h-12 rounded-2xl ${colors[k.color]} flex items-center justify-center text-2xl shrink-0">${k.icon}</div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${k.label}</p>
          <p class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-0.5 truncate">${k.value}</p>
          ${k.sub ? `<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${k.sub}</p>` : ''}
        </div>
      </div>
    `).join('');
  }

  function _renderRevenueChart() {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;
    if (revenueChart) { revenueChart.destroy(); revenueChart = null; }

    const months = _last6Months();
    const invoices = Store.getAll('invoices');
    const expenses = Store.getAll('expenses');

    const revenueData = months.map(m =>
      invoices
        .filter(i => i.status === 'paid' && i.issueDate?.startsWith(m.key))
        .reduce((s, i) => s + (parseFloat(i.total) || 0), 0)
    );
    const expenseData = months.map(m =>
      expenses
        .filter(e => e.date?.startsWith(m.key))
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    );

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          {
            label: 'Доходи',
            data: revenueData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: '#6366f1',
            pointRadius: 4,
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Витрати',
            data: expenseData,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244,63,94,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#f43f5e',
            pointRadius: 4,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor, usePointStyle: true, pointStyle: 'circle' } } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, callback: v => _fmt(v) }, grid: { color: gridColor } },
        },
      },
    });
  }

  function _renderExpenseChart() {
    const ctx = document.getElementById('expense-chart');
    if (!ctx) return;
    if (expenseChart) { expenseChart.destroy(); expenseChart = null; }

    const expenses = Store.getAll('expenses');
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (parseFloat(e.amount) || 0);
    });

    const labels = Object.keys(byCategory);
    const data = Object.values(byCategory);
    const PALETTE = ['#6366f1','#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
    const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
    const total = data.reduce((a, b) => a + b, 0);

    if (!labels.length) {
      ctx.parentElement.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center pt-10">Немає даних</p>`;
      return;
    }

    expenseChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '72%',
      },
    });

    document.getElementById('expense-legend').innerHTML = labels.map((l, i) => `
      <div class="flex items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${colors[i]}"></span>
          <span class="text-gray-600 dark:text-gray-400 truncate">${l}</span>
        </div>
        <span class="font-semibold text-gray-700 dark:text-gray-300 shrink-0">${total ? Math.round(data[i]/total*100) : 0}%</span>
      </div>
    `).join('');
  }

  function _renderActiveProjects() {
    const projects = Store.getAll('projects').filter(p => p.status !== 'done' && p.status !== 'cancelled');
    const clients = Store.getAll('clients');
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c.name; });

    const el = document.getElementById('active-projects-table');
    if (!projects.length) {
      el.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Немає активних проєктів</p>`;
      return;
    }

    const STATUS = {
      'in-progress': { label: 'В роботі', cls: 'badge-blue' },
      'review': { label: 'На затвердженні', cls: 'badge-yellow' },
      'done': { label: 'Виконано', cls: 'badge-green' },
      'cancelled': { label: 'Скасовано', cls: 'badge-red' },
    };

    el.innerHTML = `
      <div class="space-y-2">
        ${projects.slice(0, 5).map(p => {
          const st = STATUS[p.status] || { label: p.status, cls: 'badge-gray' };
          const deadline = p.deadline ? new Date(p.deadline) : null;
          const daysLeft = deadline ? Math.ceil((deadline - Date.now()) / 86400000) : null;
          const isUrgent = daysLeft !== null && daysLeft <= 3;
          return `
            <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">${p.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${clientMap[p.clientId] || '—'}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${deadline ? `<span class="text-xs ${isUrgent ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'}">${isUrgent ? '⚠️ ' : ''}${deadline.toLocaleDateString('uk-UA')}</span>` : ''}
                <span class="${st.cls} text-xs">${st.label}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function _renderNotifFeed() {
    const notes = Store.getAll('notifications').slice().reverse().slice(0, 8);
    const unread = notes.filter(n => !n.read).length;
    const badge = document.getElementById('unread-badge');
    if (badge) badge.textContent = unread > 0 ? `${unread} нових` : '';

    const el = document.getElementById('notif-feed');
    if (!notes.length) {
      el.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Немає сповіщень</p>`;
      return;
    }
    el.innerHTML = `<div class="space-y-2">
      ${notes.map(n => `
        <div class="flex items-start gap-3 p-3 rounded-xl ${n.read ? 'bg-gray-50 dark:bg-gray-700/30' : 'bg-indigo-50 dark:bg-indigo-900/20'} transition-colors">
          <span class="text-lg mt-0.5">${n.channel === 'telegram' ? '📨' : '✉️'}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-indigo-500">${n.channelLabel}</p>
            <p class="text-sm text-gray-700 dark:text-gray-300 leading-snug">${n.message}</p>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  function _last6Months() {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        label: d.toLocaleDateString('uk-UA', { month: 'short', year: '2-digit' }),
      });
    }
    return result;
  }

  function _fmt(n) {
    return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(n || 0);
  }

  function _plural(n) {
    if (n % 10 === 1 && n % 100 !== 11) return '';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'и';
    return 'ів';
  }

  return { render };
})();
