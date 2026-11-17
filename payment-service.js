/**
 * PaymentService
 * Сервісний шар для обробки платежів.
 *
 * Підтримувані провайдери (через .env / налаштування):
 *   - Stripe
 *   - WayForPay
 *   - LiqPay
 *
 * Поки реальні API-ключі не налаштовані — працює в SANDBOX-режимі:
 * симулює статуси pending → paid | failed із затримкою.
 *
 * Webhook-підтвердження: у продакшн-режимі очікується POST /webhook/payment
 * з підписом від провайдера; у sandbox — симулюється через setTimeout.
 */
const PaymentService = (() => {
  // ─── Конфігурація ──────────────────────────────────────────────────────────

  const CONFIG_KEY = 'saas_payment_config';

  const PROVIDERS = {
    stripe:     { name: 'Stripe',     currencies: ['USD', 'EUR'], webhookEvent: 'payment_intent.succeeded' },
    wayforpay:  { name: 'WayForPay',  currencies: ['UAH', 'USD', 'EUR'], webhookEvent: 'ORDER_APPROVED' },
    liqpay:     { name: 'LiqPay',     currencies: ['UAH', 'USD', 'EUR'], webhookEvent: 'pay' },
  };

  const STATUSES = {
    PENDING:  'pending',
    PAID:     'paid',
    FAILED:   'failed',
    REFUNDED: 'refunded',
  };

  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null') || _defaultConfig();
    } catch { return _defaultConfig(); }
  }

  function _defaultConfig() {
    return {
      provider: 'wayforpay',
      sandboxMode: true,
      apiKey: '',
      secretKey: '',
      merchantId: '',
      webhookUrl: '',
    };
  }

  function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ..._defaultConfig(), ...cfg }));
  }

  function isSandbox() {
    return getConfig().sandboxMode || !getConfig().apiKey;
  }

  function getProviderName() {
    const cfg = getConfig();
    return PROVIDERS[cfg.provider]?.name || 'WayForPay';
  }

  // ─── Платежі ───────────────────────────────────────────────────────────────

  /**
   * Ініціює платіж для інвойсу.
   *
   * В sandbox-режимі — симулює затримку та повертає статус.
   * В production — викликає відповідний API провайдера (заглушка для реального підключення).
   *
   * @param {object} invoice — об'єкт інвойсу зі Store
   * @param {string} [simulatedResult] — 'paid'|'failed' для sandbox (за замовчуванням 'paid')
   * @returns {Promise<{ success: boolean, transactionId: string, status: string, message: string }>}
   */
  async function initiatePayment(invoice, simulatedResult = 'paid') {
    if (!invoice) return { success: false, status: STATUSES.FAILED, message: 'Інвойс не знайдено' };

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Зберігаємо транзакцію в Store
    const transaction = Store.save('payment_transactions', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amount: invoice.total,
      currency: invoice.currency,
      provider: getConfig().provider,
      sandboxMode: isSandbox(),
      transactionId,
      status: STATUSES.PENDING,
    });

    if (isSandbox()) {
      return _sandboxPayment(transaction.id, transactionId, invoice, simulatedResult);
    }

    // ── PRODUCTION: реальне API (заглушка — розкоментуйте при підключенні) ──
    // return _realPayment(transaction.id, transactionId, invoice);
    return { success: false, status: STATUSES.FAILED, message: 'Production API не налаштований. Додайте ключі в Налаштування → Платіжний шлюз.' };
  }

  /**
   * Sandbox-симуляція: pending → paid|failed через 1.5 сек.
   */
  async function _sandboxPayment(txStoreId, transactionId, invoice, simulatedResult) {
    // Затримка для реалістичності
    await _delay(1500);

    const success = simulatedResult === 'paid';
    const status = success ? STATUSES.PAID : STATUSES.FAILED;

    Store.update('payment_transactions', txStoreId, {
      status,
      completedAt: new Date().toISOString(),
      sandboxSimulated: true,
    });

    if (success) {
      Store.update('invoices', invoice.id, { status: 'paid', paidAt: new Date().toISOString() });
      EventBus.emit('payment:success', { invoiceId: invoice.id, transactionId });
      EventBus.emit('data:changed');
      Notifications.add(`✅ [SANDBOX] Оплата інвойсу #${invoice.number} підтверджена. Транзакція: ${transactionId}`, 'telegram');
    } else {
      EventBus.emit('payment:failed', { invoiceId: invoice.id, transactionId });
      Notifications.add(`❌ [SANDBOX] Оплата інвойсу #${invoice.number} не вдалась. Спробуйте ще раз.`, 'email');
    }

    return {
      success,
      transactionId,
      status,
      sandbox: true,
      message: success
        ? `[SANDBOX] Платіж успішний. Транзакція: ${transactionId}`
        : '[SANDBOX] Платіж відхилено (симуляція невдачі)',
    };
  }

  /**
   * Production-заглушка для реального API провайдера.
   * Розкоментуйте та налаштуйте під конкретний провайдер.
   */
  // async function _realPayment(txStoreId, transactionId, invoice) {
  //   const cfg = getConfig();
  //   if (cfg.provider === 'wayforpay') {
  //     // WayForPay API
  //     const payload = {
  //       merchantAccount: cfg.merchantId,
  //       merchantDomainName: window.location.hostname,
  //       orderReference: transactionId,
  //       orderDate: Math.floor(Date.now() / 1000),
  //       amount: invoice.total,
  //       currency: invoice.currency,
  //       productName: [`Інвойс #${invoice.number}`],
  //       productCount: [1],
  //       productPrice: [invoice.total],
  //       // merchantSignature: _hmacSignature(cfg.secretKey, ...),
  //     };
  //     const resp = await fetch('https://api.wayforpay.com/api', {
  //       method: 'POST', headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     });
  //     const data = await resp.json();
  //     // ... обробка відповіді
  //   }
  //   // Аналогічно для Stripe, LiqPay
  // }

  /**
   * Обробляє вхідний webhook від платіжного провайдера.
   * У продакшн — перевіряє підпис (HMAC) та оновлює статус.
   *
   * @param {string} provider — 'stripe'|'wayforpay'|'liqpay'
   * @param {object} payload  — тіло webhook запиту
   * @returns {{ processed: boolean, invoiceId?: string }}
   */
  function processWebhook(provider, payload) {
    if (isSandbox()) {
      console.log('[PaymentService Sandbox] Webhook отримано (симуляція):', payload);
      return { processed: true, sandbox: true };
    }

    // Production: перевірка підпису та обробка
    // const isValid = _verifyWebhookSignature(provider, payload);
    // if (!isValid) return { processed: false, error: 'Невірний підпис webhook' };

    // ... оновлення статусу інвойсу на основі payload
    return { processed: false, error: 'Production webhook не налаштований' };
  }

  // ─── Транзакції ────────────────────────────────────────────────────────────

  function getTransactions() {
    return Store.getAll('payment_transactions').slice().reverse();
  }

  function getTransactionsByInvoice(invoiceId) {
    return Store.getAll('payment_transactions').filter(t => t.invoiceId === invoiceId);
  }

  // ─── Утиліти ───────────────────────────────────────────────────────────────

  function _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getProviders() { return PROVIDERS; }
  function getStatuses() { return STATUSES; }

  /**
   * Статус-бейдж для відображення в UI.
   */
  function getStatusBadge(status) {
    const map = {
      pending:  { label: '⏳ Очікує оплати', cls: 'badge-yellow' },
      paid:     { label: '✅ Оплачено',       cls: 'badge-green' },
      failed:   { label: '❌ Помилка оплати', cls: 'badge-red' },
      refunded: { label: '↩️ Повернуто',      cls: 'badge-gray' },
    };
    return map[status] || { label: status, cls: 'badge-gray' };
  }

  return {
    getConfig,
    saveConfig,
    isSandbox,
    getProviderName,
    getProviders,
    getStatuses,
    initiatePayment,
    processWebhook,
    getTransactions,
    getTransactionsByInvoice,
    getStatusBadge,
  };
})();
