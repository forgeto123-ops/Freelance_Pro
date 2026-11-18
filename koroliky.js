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

  // ─── Поповнення балансу через Monobank банку ─────────────────────────────

  const JAR_URL   = 'https://send.monobank.ua/jar/2aiC2pNaQ1';
  const PLANS     = [
    { coins: 500,  amountUah: 1,  label: '500 Короликів',  badge: '⚡' },
    { coins: 1000, amountUah: 2,  label: '1 000 Короликів', badge: '🔥' },
    { coins: 3000, amountUah: 3,  label: '3 000 Короликів', badge: '👑' },
  ];

  function _generatePaymentCode() {
    return 'PL' + String(Math.floor(1000 + Math.random() * 9000));
  }

  /**
   * Відкриває модальне вікно вибору тарифу та оплати.
   * Після підтвердження оплати (polling Supabase) нараховує Королики.
   */
  async function topUpBalance() {
    const sb = _getSupabaseClient();
    const session = AuthService.getSession();
    if (!session) { Notifications.add('⚠️ Увійдіть в акаунт для поповнення'); return; }

    // ─ Крок 1: вибір тарифу ─────────────────────────────────────────────
    Modal.open({
      title: '👑 Поповнення Короликів',
      size: 'md',
      hideFooter: true,
      content: `
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">Оберіть тариф поповнення:</p>
          <div class="grid grid-cols-3 gap-3" id="topup-plans">
            ${PLANS.map((p, i) => `
              <button data-plan="${i}"
                class="plan-btn flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 border-gray-200
                       dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500
                       hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer">
                <span class="text-2xl">${p.badge}</span>
                <span class="font-bold text-gray-800 dark:text-gray-100 text-sm">${p.label}</span>
                <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">${p.amountUah} грн</span>
              </button>
            `).join('')}
          </div>
          <p class="text-xs text-center text-gray-400">Оплата через особисту Банку Monobank — миттєве зарахування</p>
        </div>
      `,
    });

    // обробник вибору тарифу
    document.getElementById('topup-plans')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-plan]');
      if (!btn) return;
      const plan = PLANS[Number(btn.dataset.plan)];
      await _openPaymentModal(plan, sb, session);
    });
  }

  async function _openPaymentModal(plan, sb, session) {
    const code    = _generatePaymentCode();
    const payUrl  = `${JAR_URL}?a=${plan.amountUah}&t=${code}`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payUrl)}`;

    // Зберігаємо запис у Supabase pending_payments
    if (sb) {
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from('pending_payments').insert({
            code,
            user_id: user.id,
            coins: plan.coins,
            amount_uah: plan.amountUah,
            status: 'pending',
          });
        }
      } catch (e) {
        console.warn('topUp: cannot insert pending_payment:', e.message);
      }
    }

    // ─ Крок 2: QR-модалка ───────────────────────────────────────────────
    Modal.open({
      title: `💳 Оплата — ${plan.label}`,
      size: 'md',
      hideFooter: true,
      content: `
        <div class="space-y-5">

          <!-- сума і код -->
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p class="text-xs text-gray-400 uppercase font-semibold">Сума</p>
              <p class="text-xl font-bold text-gray-800 dark:text-gray-100">${plan.amountUah} грн</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400 uppercase font-semibold">Код платежу</p>
              <p class="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">${code}</p>
            </div>
          </div>

          <!-- попередження -->
          <div class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl flex gap-2">
            <span class="text-lg shrink-0">⚠️</span>
            <p class="text-xs text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
              Не змінюйте коментар <span class="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">${code}</span> при оплаті, інакше нарахування не спрацює автоматично.
            </p>
          </div>

          <!-- QR -->
          <div class="flex flex-col items-center gap-3">
            <img src="${qrUrl}" alt="QR для оплати" class="w-48 h-48 rounded-xl border border-gray-200 dark:border-gray-600" />
            <p class="text-xs text-gray-400">Скануйте QR або натисніть кнопку нижче</p>
            <a href="${payUrl}" target="_blank" rel="noopener"
              class="btn-primary w-full justify-center bg-green-600 hover:bg-green-700">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7V2H2v9h2V4zm13 0h-7V2h9v9h-2V4zM4 20h7v2H2v-9h2v7zm13 0h-7v2h9v-9h-2v7z"/></svg>
              Відкрити в Monobank
            </a>
          </div>

          <!-- статус polling -->
          <div id="topup-status" class="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg class="w-4 h-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Очікуємо підтвердження оплати...
          </div>
        </div>
      `,
    });

    // ─ Polling кожні 3 сек ───────────────────────────────────────────────
    _pollPaymentStatus(code, plan, sb, session);
  }

  async function _pollPaymentStatus(code, plan, sb, session) {
    const MAX_ATTEMPTS = 100; // ~5 хвилин
    let attempts = 0;

    const intervalId = setInterval(async () => {
      attempts++;

      // Якщо модалка закрита — зупиняємо
      if (!document.getElementById('topup-status')) {
        clearInterval(intervalId);
        return;
      }

      // Перевіряємо статус у Supabase
      let paid = false;

      if (sb) {
        try {
          const { data } = await sb
            .from('pending_payments')
            .select('status')
            .eq('code', code)
            .single();
          if (data?.status === 'paid') paid = true;
        } catch (e) { /* ignore */ }
      }

      if (paid) {
        clearInterval(intervalId);

        // Оновлюємо локальний баланс
        const result = add(plan.coins, `Поповнення через Monobank (${code})`);

        Modal.close();
        Notifications.add(`✅ Поповнення успішне! +${plan.coins} Короликів 👑 (${code})`);
        EventBus.emit('koroliky:changed', { balance: result.balance });
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        const statusEl = document.getElementById('topup-status');
        if (statusEl) {
          statusEl.innerHTML = `<span class="text-amber-500">⏳ Час очікування вичерпано. Якщо ви оплатили — Королики будуть нараховані автоматично після підтвердження банку.</span>`;
        }
      }
    }, 3000);
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
    topUpBalance,
    PLANS,
    AI_TOOL_COST,
    DAILY_BONUS,
  };
})();
