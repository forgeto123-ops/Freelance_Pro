/**
 * Topbar — top navigation bar with theme toggle and notifications
 */
const Topbar = (() => {
  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    invoices: 'Інвойси',
    expenses: 'Витрати',
    clients: 'Клієнти',
    projects: 'Проєкти',
    deals: 'Воронка продажів',
    activity: 'Журнал активностей',
    'ai-assistant': 'AI Помічник',
    portal: 'Клієнтський портал',
    settings: 'Налаштування',
  };

  function render() {
    const topbarEl = document.getElementById('topbar');
    if (!topbarEl) return;
    const current = Router.getCurrent();
    const title = PAGE_TITLES[current] || 'FreelanceHub';
    const unread = Notifications.getUnreadCount();
    const isDark = document.documentElement.classList.contains('dark');

    topbarEl.innerHTML = `
      <div class="flex items-center gap-3">
        <!-- Mobile hamburger -->
        <button id="sidebar-toggle" class="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">${title}</h1>
          <p class="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">${new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Koroliky balance badge -->
        ${AuthService.isLoggedIn() ? KorolikyService.renderBadge() : ''}

        <!-- Notifications bell -->
        <div class="relative">
          <button id="notif-btn" class="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            ${unread > 0 ? `<span class="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">${unread > 9 ? '9+' : unread}</span>` : ''}
          </button>
          <!-- Dropdown -->
          <div id="notif-dropdown" class="hidden absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span class="font-semibold text-sm text-gray-700 dark:text-gray-200">Сповіщення</span>
              <button id="notif-read-all" class="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">Всі прочитані</button>
            </div>
            <div class="max-h-72 overflow-y-auto" id="notif-list">
              ${_renderNotifications()}
            </div>
          </div>
        </div>

        <!-- Supabase status dot -->
        ${SupabaseService.isConnected() ? `
          <div class="relative group">
            <div class="w-2 h-2 rounded-full bg-green-500 cursor-default" title="Supabase підключено"></div>
            <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 px-2 py-1 rounded-lg bg-gray-800 text-white text-xs whitespace-nowrap">Supabase ✅</div>
          </div>
        ` : ''}

        <!-- Theme toggle -->
        <button id="theme-toggle" class="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Змінити тему">
          ${isDark
            ? `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`
          }
        </button>

        <!-- Logout button -->
        ${AuthService.isLoggedIn() ? `
          <button id="logout-btn" class="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors" title="Вийти">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;

    // Events
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const html = document.documentElement;
      const isDarkNow = html.classList.toggle('dark');
      localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
      render();
    });

    document.getElementById('notif-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('notif-dropdown').classList.toggle('hidden');
    });

    document.getElementById('notif-read-all').addEventListener('click', () => {
      Notifications.markAllRead();
      render();
    });

    document.addEventListener('click', e => {
      const dd = document.getElementById('notif-dropdown');
      if (dd && !dd.contains(e.target) && e.target.id !== 'notif-btn') {
        dd.classList.add('hidden');
      }
    }, { once: false });

    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      sidebar.classList.toggle('-translate-x-full');
      overlay.classList.toggle('hidden');
    });

    // Koroliky badge — щоденний бонус
    document.getElementById('koroliky-badge-btn')?.addEventListener('click', () => {
      const status = KorolikyService.getDailyBonusStatus();
      if (status.canClaim) {
        const result = KorolikyService.checkAndClaimDailyBonus();
        if (result.claimed) {
          Notifications.add(`👑 +${result.amount} Короликів! Баланс: ${result.balance}`);
          render();
        }
      } else {
        // Показуємо попап з балансом і таймером
        _showKorolikyPopup();
      }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      if (confirm('Вийти з системи?')) {
        AuthService.logout();
      }
    });
  }

  function _renderNotifications() {
    const notes = Store.getAll('notifications').slice().reverse().slice(0, 20);
    if (!notes.length) return `<p class="p-4 text-sm text-gray-400 text-center">Немає сповіщень</p>`;
    return notes.map(n => `
      <div class="flex items-start gap-3 px-4 py-3 ${n.read ? 'opacity-60' : 'bg-indigo-50/50 dark:bg-indigo-900/20'} border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <span class="text-lg mt-0.5">${n.channel === 'telegram' ? '📨' : '✉️'}</span>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-indigo-500 uppercase">${n.channelLabel}</p>
          <p class="text-sm text-gray-700 dark:text-gray-300 leading-snug">${n.message}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${_timeAgo(n.createdAt)}</p>
        </div>
        ${!n.read ? `<div class="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>` : ''}
      </div>
    `).join('');
  }

  function _timeAgo(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'щойно';
    if (mins < 60) return `${mins} хв тому`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} год тому`;
    return `${Math.floor(hrs / 24)} дн тому`;
  }

  function _showKorolikyPopup() {
    const balance = KorolikyService.getBalance();
    const status = KorolikyService.getDailyBonusStatus();
    const transactions = KorolikyService.getTransactions().slice(0, 8);

    const typeIcons = { daily_bonus: '🎁', add: '➕', deduct: '➖' };
    const typeLabels = { daily_bonus: 'Щоденний бонус', add: 'Нарахування', deduct: 'Списання' };

    Modal.open({
      title: '👑 Королики',
      size: 'md',
      hideFooter: true,
      content: `
        <div class="space-y-5">
          <!-- Balance -->
          <div class="text-center py-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 rounded-2xl border border-amber-200 dark:border-amber-800">
            <p class="text-5xl font-bold text-amber-600 dark:text-amber-400">${balance.toLocaleString('uk-UA')}</p>
            <p class="text-sm text-amber-500 dark:text-amber-500 mt-1">👑 Королики на балансі</p>
          </div>

          <!-- Top-up button -->
          <button id="koroliky-topup-btn"
            class="btn-primary w-full justify-center bg-green-600 hover:bg-green-700">
            💳 Поповнити Королики
          </button>

          <!-- Daily bonus status -->
          <div class="p-3 rounded-xl ${status.canClaim ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50'}">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold ${status.canClaim ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}">
                  ${status.canClaim ? '🎁 Щоденний бонус доступний!' : '⏳ До наступного бонусу:'}
                </p>
                ${!status.canClaim && status.timeLeft ? `<p id="koroliky-timer" class="text-xl font-mono font-bold text-gray-700 dark:text-gray-300">${status.timeLeft}</p>` : ''}
              </div>
              <p class="text-2xl font-bold text-amber-500">+500</p>
            </div>
            ${status.canClaim ? `
              <button id="claim-bonus-btn" class="btn-primary w-full mt-3 justify-center">
                🎁 Отримати +500 Короликів
              </button>
            ` : ''}
          </div>

          <!-- AI tools cost info -->
          <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">🤖 Вартість AI-інструментів</p>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">🎙️ Voice-to-Text (розпізнавання голосу)</span>
              <span class="font-semibold text-indigo-600">50 👑</span>
            </div>
            <div class="flex justify-between text-sm mt-1">
              <span class="text-gray-600 dark:text-gray-400">📷 OCR документа (розпізнавання фото)</span>
              <span class="font-semibold text-indigo-600">50 👑</span>
            </div>
          </div>

          <!-- Transaction history -->
          ${transactions.length ? `
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Останні транзакції</p>
              <div class="space-y-1.5 max-h-40 overflow-y-auto">
                ${transactions.map(t => `
                  <div class="flex items-center justify-between py-1.5 px-2 rounded-lg ${t.type === 'deduct' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'}">
                    <div class="flex items-center gap-2">
                      <span>${typeIcons[t.type] || '•'}</span>
                      <span class="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[180px]">${t.reason || typeLabels[t.type] || t.type}</span>
                    </div>
                    <span class="text-sm font-semibold ml-2 shrink-0 ${t.type === 'deduct' ? 'text-red-600' : 'text-green-600'}">
                      ${t.type === 'deduct' ? '-' : '+'}${t.amount}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `,
    });

    // Top-up
    document.getElementById('koroliky-topup-btn')?.addEventListener('click', () => {
      KorolikyService.topUpBalance();
    });

    // Claim bonus
    document.getElementById('claim-bonus-btn')?.addEventListener('click', () => {
      const result = KorolikyService.checkAndClaimDailyBonus();
      if (result.claimed) {
        Notifications.add(`👑 +${result.amount} Короликів! Баланс: ${result.balance}`);
        Modal.close();
        render();
      }
    });

    // Live-таймер у попапі
    if (!status.canClaim && status.msLeft) {
      const timerEl = document.getElementById('koroliky-timer');
      const timerInterval = setInterval(() => {
        const st = KorolikyService.getDailyBonusStatus();
        if (!timerEl || !document.contains(timerEl)) { clearInterval(timerInterval); return; }
        if (st.canClaim) {
          clearInterval(timerInterval);
          if (timerEl) timerEl.textContent = '00:00:00';
        } else {
          if (timerEl) timerEl.textContent = st.timeLeft;
        }
      }, 1000);
    }
  }

  return { render };
})();
