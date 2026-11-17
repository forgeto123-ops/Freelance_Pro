/**
 * KorolikyService — внутрішня валюта «Королики» 👑
 *
 * Логіка:
 *  - Баланс зберігається в записі користувача (AuthService)
 *  - Щоденний бонус: +500 Короликів раз на 24 год (автоматично при вході або вручну)
 *  - Таймер зворотного відліку до наступного бонусу
 *  - Атомарне списання: перевірка балансу → списання → збереження (синхронно в localStorage)
 *  - Історія транзакцій (колекція 'koroliky_transactions')
 *
 * У production — списання захищається серверною транзакцією (Supabase RPC або Edge Function).
 */
const KorolikyService = (() => {

  const DAILY_BONUS     = 500;
  const BONUS_INTERVAL  = 24 * 60 * 60 * 1000; // 24 год в мс
  const AI_TOOL_COST    = 50;

  // ─── Supabase helpers ────────────────────────────────────────────────────

  function _getSupabaseClient() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isConnected()) {
      return SupabaseService.getClient();
    }
    return null;
  }

  /**
   * Завантажує баланс з таблиці profiles у Supabase та оновлює локальний кеш.
   * Викликається після входу та при завантаженні сторінки.
   */
  async function syncFromSupabase() {
    const sb = _getSupabaseClient();
    if (!sb) return;

    const session = AuthService.getSession();
    if (!session) return;

    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const { data, error } = await sb.from('profiles').select('balance').eq('id', user.id).single();
      if (error) { console.warn('Koroliky sync (from Supabase):', error.message); return; }

      if (data && typeof data.balance === 'number') {
        const users = JSON.parse(localStorage.getItem('saas_users') || '[]');
        const idx = users.findIndex(u => u.email === session.email);
        if (idx !== -1) {
          users[idx].koroliky = Math.round(data.balance);
          users[idx].updatedAt = new Date().toISOString();
          localStorage.setItem('saas_users', JSON.stringify(users));
          EventBus.emit('koroliky:changed', { balance: users[idx].koroliky });
        }
      }
    } catch (e) {
      console.warn('Koroliky sync error:', e);
    }
  }

  /**
   * Записує баланс у таблицю profiles у Supabase (фоново, без блокування UI).
   */
  async function _syncBalanceToSupabase(newBalance) {
    const sb = _getSupabaseClient();
    if (!sb) return;

    const session = AuthService.getSession();
    if (!session) return;

    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const { error } = await sb.from('profiles')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) console.warn('Koroliky sync (to Supabase):', error.message);
    } catch (e) {
      console.warn('Koroliky sync to Supabase error:', e);
    }
  }

  // ─── Баланс ───────────────────────────────────────────────────────────────

  function getBalance() {
    const user = AuthService.getCurrentUser();
    return user ? (user.koroliky || 0) : 0;
  }

  /**
   * Атомарне списання — повертає false якщо балансу недостатньо.
   * Перевірка та зміна виконуються в одній синхронній операції.
   */
  function deduct(amount, reason = '') {
    const session = AuthService.getSession();
    if (!session) return { success: false, error: 'Не авторизовано' };

    const users = JSON.parse(localStorage.getItem('saas_users') || '[]');
    const idx = users.findIndex(u => u.email === session.email);
    if (idx === -1) return { success: false, error: 'Користувач не знайдений' };

    const current = users[idx].koroliky || 0;
    if (current < amount) {
      return { success: false, error: `Недостатньо Короликів. Потрібно: ${amount}, є: ${current}`, balance: current };
    }

    // Атомарна операція
    users[idx].koroliky = current - amount;
    users[idx].updatedAt = new Date().toISOString();
    localStorage.setItem('saas_users', JSON.stringify(users));

    // Запис транзакції
    _saveTransaction({ type: 'deduct', amount, reason, balanceAfter: users[idx].koroliky });

    // Синхронізуємо баланс з Supabase (таблиця profiles)
    _syncBalanceToSupabase(users[idx].koroliky);

    EventBus.emit('koroliky:changed', { balance: users[idx].koroliky });
    return { success: true, balance: users[idx].koroliky };
  }

  function add(amount, reason = '') {
    const session = AuthService.getSession();
    if (!session) return { success: false };

    const users = JSON.parse(localStorage.getItem('saas_users') || '[]');
    const idx = users.findIndex(u => u.email === session.email);
    if (idx === -1) return { success: false };

    users[idx].koroliky = (users[idx].koroliky || 0) + amount;
    users[idx].updatedAt = new Date().toISOString();
    localStorage.setItem('saas_users', JSON.stringify(users));

    _saveTransaction({ type: 'add', amount, reason, balanceAfter: users[idx].koroliky });

    // Синхронізуємо баланс з Supabase (таблиця profiles)
    _syncBalanceToSupabase(users[idx].koroliky);

    EventBus.emit('koroliky:changed', { balance: users[idx].koroliky });
    return { success: true, balance: users[idx].koroliky };
  }

  // ─── Щоденний бонус ──────────────────────────────────────────────────────

  /**
   * Перевіряє чи можна отримати бонус та нараховує якщо так.
   * Викликається автоматично при кожному вході/завантаженні.
   */
  function checkAndClaimDailyBonus() {
    const session = AuthService.getSession();
    if (!session) return { claimed: false };

    const users = JSON.parse(localStorage.getItem('saas_users') || '[]');
    const idx = users.findIndex(u => u.email === session.email);
    if (idx === -1) return { claimed: false };

    const lastClaimed = users[idx].lastBonusClaimedAt;
    const canClaim = !lastClaimed || (Date.now() - new Date(lastClaimed).getTime() >= BONUS_INTERVAL);

    if (!canClaim) {
      return { claimed: false, nextIn: _timeUntilNext(lastClaimed) };
    }

    users[idx].koroliky = (users[idx].koroliky || 0) + DAILY_BONUS;
    users[idx].lastBonusClaimedAt = new Date().toISOString();
    users[idx].updatedAt = new Date().toISOString();
    localStorage.setItem('saas_users', JSON.stringify(users));

    _saveTransaction({ type: 'daily_bonus', amount: DAILY_BONUS, reason: 'Щоденний бонус', balanceAfter: users[idx].koroliky });

    // Синхронізуємо баланс з Supabase (таблиця profiles)
    _syncBalanceToSupabase(users[idx].koroliky);

    EventBus.emit('koroliky:changed', { balance: users[idx].koroliky });
    EventBus.emit('koroliky:bonus_claimed', { amount: DAILY_BONUS });

    return { claimed: true, amount: DAILY_BONUS, balance: users[idx].koroliky };
  }

  /**
   * Статус щоденного бонусу для відображення таймера.
   */
  function getDailyBonusStatus() {
    const user = AuthService.getCurrentUser();
    if (!user) return { canClaim: false, timeLeft: null };

    const lastClaimed = user.lastBonusClaimedAt;
    if (!lastClaimed) return { canClaim: true, timeLeft: null };

    const elapsed = Date.now() - new Date(lastClaimed).getTime();
    const canClaim = elapsed >= BONUS_INTERVAL;

    if (canClaim) return { canClaim: true, timeLeft: null };

    return { canClaim: false, timeLeft: _timeUntilNext(lastClaimed), msLeft: BONUS_INTERVAL - elapsed };
  }

  function _timeUntilNext(lastClaimed) {
    const msLeft = BONUS_INTERVAL - (Date.now() - new Date(lastClaimed).getTime());
    if (msLeft <= 0) return '00:00:00';
    const h = Math.floor(msLeft / 3600000);
    const m = Math.floor((msLeft % 3600000) / 60000);
    const s = Math.floor((msLeft % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ─── AI-інструменти (50 Короликів) ───────────────────────────────────────

  /**
   * Перевіряє баланс та списує 50 Короликів за AI-інструмент.
   * @param {string} toolName — назва інструменту
   * @returns {{ success: boolean, error?: string, balance?: number, timeLeft?: string }}
   */
  function chargeForAITool(toolName) {
    const balance = getBalance();
    if (balance < AI_TOOL_COST) {
      const status = getDailyBonusStatus();
      return {
        success: false,
        error: `Недостатньо Короликів 👑 Потрібно ${AI_TOOL_COST}, є ${balance}.`,
        balance,
        timeLeft: status.timeLeft,
        canClaimBonus: status.canClaim,
      };
    }
    return deduct(AI_TOOL_COST, `AI-інструмент: ${toolName}`);
  }

  // ─── Транзакції ───────────────────────────────────────────────────────────

  function _saveTransaction(data) {
    const session = AuthService.getSession();
    Store.save('koroliky_transactions', {
      userId: session?.userId || 'unknown',
      ...data,
    });
  }

  function getTransactions() {
    const session = AuthService.getSession();
    if (!session) return [];
    return Store.getAll('koroliky_transactions')
      .filter(t => t.userId === session.userId)
      .slice()
      .reverse()
      .slice(0, 50);
  }

  /**
   * Рендерить міні-віджет балансу для topbar/sidebar.
   */
  function renderBadge() {
    const balance = getBalance();
    const status = getDailyBonusStatus();
    const title = status.canClaim
      ? 'Натисніть щоб отримати +500 Короликів!'
      : `Наступний бонус через: ${status.timeLeft}`;

    return `
      <button id="koroliky-badge-btn" title="${title}"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-sm transition-all
        ${status.canClaim
          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50 animate-pulse cursor-pointer'
          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 cursor-default'}">
        👑 <span id="koroliky-balance-val">${balance.toLocaleString('uk-UA')}</span>
        ${status.canClaim ? '<span class="text-xs">+500 🎁</span>' : ''}
      </button>
    `;
  }

  return {
    getBalance,
    deduct,
    add,
    checkAndClaimDailyBonus,
    getDailyBonusStatus,
    chargeForAITool,
    getTransactions,
    renderBadge,
    syncFromSupabase,
    AI_TOOL_COST,
    DAILY_BONUS,
  };
})();
