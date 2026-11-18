/**
 * Settings page — Supabase config, profile, bank accounts, payment gateway, follow-up settings
 */
const SettingsPage = (() => {

  function render() {
    const content = document.getElementById('content');
    const sbConfig = SupabaseService.getConfig();
    const sbStatus = SupabaseService.getStatus();
    const statusColors = { connected: 'text-green-600', connecting: 'text-yellow-600', disconnected: 'text-gray-400', error: 'text-red-500' };
    const statusLabels = { connected: '✅ Підключено', connecting: '⏳ Підключення...', disconnected: '⭕ Не підключено', error: '❌ Помилка' };

    const followUpDays = localStorage.getItem('saas_followup_days') || '30';
    const userName = localStorage.getItem('saas_user_name') || '';

    content.innerHTML = `
      <div class="space-y-6 pb-8 max-w-3xl">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Налаштування</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Конфігурація застосунку, інтеграції та персональні налаштування</p>
        </div>

        <!-- Profile -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">👤 Профіль</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Ваше ім'я (для шаблонів)</label>
              <input id="profile-name" type="text" class="input" value="${userName}" placeholder="Іван Петренко" />
            </div>
            <div>
              <label class="label">Follow-up нагадування (днів)</label>
              <input id="followup-days" type="number" min="1" max="365" class="input" value="${followUpDays}" placeholder="30" />
            </div>
          </div>
          <button id="save-profile" class="btn-primary">Зберегти профіль</button>
          ${(() => {
            const session = AuthService.getSession();
            const userId = session?.userId;
            const tgLinked = !!localStorage.getItem('saas_tg_linked_' + userId);
            if (!userId || tgLinked) return '';
            return `
            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div class="flex-1">
                <p class="text-sm font-semibold text-blue-700 dark:text-blue-300">📲 Telegram-сповіщення не підключено</p>
                <p class="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Отримуйте сповіщення про поповнення балансу та важливі події в Telegram.</p>
              </div>
              <a href="https://t.me/mICaB_Bot?start=${userId}" target="_blank" rel="noopener"
                class="btn-primary text-sm py-1.5 shrink-0 bg-blue-500 hover:bg-blue-600">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Підключити @mICaB_Bot
              </a>
            </div>`;
          })()}
        </div>

        <!-- ═══ Language ═══════════════════════════════════════════════════ -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">🌐 Мова інтерфейсу</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Оберіть мову — інтерфейс перекладається миттєво без перезавантаження</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Мова</label>
              ${I18nService.renderLanguageSelector('ui-lang-select')}
            </div>
          </div>
          <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
            💡 Підтримується 10 мов: українська, англійська, польська, німецька, іспанська, французька, італійська, португальська, чеська, турецька
          </div>
          <button id="save-lang-btn" class="btn-primary">Застосувати мову</button>
        </div>

        <!-- ═══ Bank Accounts ════════════════════════════════════════════════ -->
        <div class="card space-y-4" id="bank-accounts-card">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">🏦 Банківські реквізити</h3>
            <button id="add-bank-account-btn" class="btn-primary text-sm py-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Додати рахунок
            </button>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Збережіть реквізити для автоматичного підтягування в інвойси. Можна додати кілька рахунків під різні валюти.</p>
          <div id="bank-accounts-list"></div>
        </div>

        <!-- ═══ Currency Rates ═══════════════════════════════════════════════ -->
        <div class="card space-y-4" id="currency-rates-card">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">💱 Курси валют (10 валют)</h3>
            <button id="refresh-rates-btn" class="btn-secondary text-xs py-1.5">🔄 Оновити</button>
          </div>
          <div id="currency-rates-widget">
            <p class="text-xs text-gray-400">⏳ Завантаження...</p>
          </div>
          <div>
            <label class="label">API ключ ExchangeRate-API (опціонально)</label>
            <input id="exchangerate-api-key" type="text" class="input" value="${localStorage.getItem('saas_exchangerate_api_key') || ''}"
              placeholder="Для точніших курсів — безкоштовний ключ на exchangerate-api.com" />
            <p class="text-xs text-gray-400 mt-1">Без ключа — курси НБУ. Безкоштовний ключ: <a href="https://www.exchangerate-api.com" target="_blank" class="text-indigo-500 underline">exchangerate-api.com</a></p>
          </div>
          <button id="save-exchangerate-key-btn" class="btn-secondary text-sm">Зберегти ключ</button>
        </div>

        <!-- ═══ Payment Gateway ══════════════════════════════════════════════ -->
        <div class="card space-y-4" id="payment-gateway-card">
          ${_renderPaymentGatewaySection()}
        </div>

        <!-- Supabase -->
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.280 12.636.669 13.5 1.400 13.5h9.4L10.3 23.0c.015.985 1.26 1.41 1.874.637l9.262-11.651c.484-.586.095-1.45-.635-1.45h-9.4L11.9 1.036z"/></svg>
              Supabase (PostgreSQL)
            </h3>
            <span class="text-sm font-semibold ${statusColors[sbStatus]}">${statusLabels[sbStatus]}</span>
          </div>

          <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm text-green-700 dark:text-green-300">
            <p class="font-semibold mb-1">🚀 Навіщо підключати Supabase?</p>
            <ul class="space-y-0.5 text-xs list-disc list-inside">
              <li>Дані зберігаються в PostgreSQL (не лише в браузері)</li>
              <li>Доступ з будь-якого пристрою</li>
              <li>Багатокористувацький режим (команда)</li>
              <li>Автоматичні резервні копії</li>
              <li>Безкоштовний план для старту</li>
              <li><strong>📧 Реальна email-верифікація OTP</strong> — Supabase надсилає код на пошту (без свого SMTP)</li>
            </ul>
          </div>

          <div class="space-y-3">
            <div>
              <label class="label">Project URL</label>
              <input id="sb-url" type="url" class="input" value="${sbConfig?.url || ''}" placeholder="https://xxxxxxxxxxxx.supabase.co" />
              <p class="text-xs text-gray-400 mt-1">Знайдіть у Supabase Dashboard → Settings → API</p>
            </div>
            <div>
              <label class="label">Anon Public Key</label>
              <input id="sb-key" type="password" class="input" value="${sbConfig?.key || ''}" placeholder="eyJhbGciOiJI..." />
              <p class="text-xs text-gray-400 mt-1">Використовуйте лише anon key — він безпечний для фронтенду</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button id="sb-connect-btn" class="btn-primary">
              ${sbStatus === 'connected' ? '🔄 Перепідключити' : '🔌 Підключити Supabase'}
            </button>
            ${sbStatus === 'connected' ? `<button id="sb-disconnect-btn" class="btn-secondary">Відключити</button>` : ''}
            ${sbStatus === 'connected' ? `<button id="sb-sync-btn" class="btn-secondary">📤 Синхронізувати дані</button>` : ''}
          </div>

          ${sbStatus === 'connected' ? `
          <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <p class="font-semibold mb-1">📧 Email-верифікація активна!</p>
            <p class="text-xs">Після реєстрації Supabase автоматично надсилає код підтвердження на email користувача.</p>
            <p class="text-xs mt-1 font-medium">Перевірте налаштування: Supabase Dashboard → Authentication → Providers → Email → <strong>Confirm email: ON</strong></p>
          </div>
          ` : `
          <div class="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-sm text-gray-600 dark:text-gray-400">
            <p class="font-semibold mb-1">💡 Щоб коди приходили на пошту:</p>
            <ol class="space-y-0.5 text-xs list-decimal list-inside">
              <li>Створіть безкоштовний проєкт на <a href="https://supabase.com" target="_blank" class="text-indigo-500 underline">supabase.com</a></li>
              <li>Вставте URL та Key сюди → натисніть «Підключити»</li>
              <li>У дашборді: Authentication → Providers → Email → увімкнути «Confirm email»</li>
              <li>Authentication → Email Templates → «Confirm Signup» → додайте рядок: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">Ваш код: {{ .Token }}</code></li>
            </ol>
            <p class="text-xs mt-1 text-amber-600 dark:text-amber-500">⚠️ Без кроку 4 Supabase надішле посилання замість коду — користувач не зможе ввести цифри у форму</p>
          </div>
          `}
        </div>

        <!-- SQL Schema -->
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100">📋 SQL Схема для Supabase</h3>
            <button id="copy-schema" class="btn-secondary text-xs py-1.5">📋 Копіювати SQL</button>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Виконайте цей SQL в редакторі Supabase (SQL Editor → New query) для створення всіх таблиць:</p>
          <div class="relative">
            <pre class="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-x-auto max-h-64 leading-relaxed font-mono" id="schema-preview">${SupabaseService.getSchema()}</pre>
          </div>
        </div>

        <!-- Notifications / Integrations -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">🔔 Сповіщення</h3>

          <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            В поточній версії сповіщення симулюються всередині застосунку. Для реальної інтеграції з Telegram Bot або Email (Resend/SendGrid) — потрібен серверний компонент або Supabase Edge Functions.
          </div>

          <div class="space-y-3">
            <div>
              <label class="label">Telegram Bot Token (симуляція)</label>
              <input id="tg-token" type="text" class="input" value="${localStorage.getItem('saas_tg_token') || ''}" placeholder="1234567890:AAXXXXXXXXXXXX" />
            </div>
            <div>
              <label class="label">Telegram Chat ID</label>
              <input id="tg-chat" type="text" class="input" value="${localStorage.getItem('saas_tg_chat') || ''}" placeholder="-100123456789 або @username" />
            </div>
            <button id="test-tg-btn" class="btn-secondary text-sm">📱 Тестове сповіщення</button>
          </div>
        </div>

        <!-- Data management -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">🗄️ Управління даними</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button id="export-data" class="btn-secondary justify-center">📥 Експорт всіх даних (JSON)</button>
            <label class="btn-secondary justify-center cursor-pointer">
              📤 Імпорт даних
              <input type="file" id="import-file" accept=".json" class="hidden" />
            </label>
          </div>
          <div class="border-t border-red-200 dark:border-red-800 pt-4">
            <p class="text-sm text-red-600 dark:text-red-400 font-semibold mb-2">⚠️ Небезпечна зона</p>
            <button id="reset-data" class="btn-secondary border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm">
              🗑️ Скинути всі дані
            </button>
          </div>
        </div>

        <!-- App info -->
        <div class="card">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-3">ℹ️ Про застосунок</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            ${[
              ['Версія', 'v1.0.0'],
              ['Технологія', 'Vanilla JS + Tailwind CSS'],
              ['База даних', 'localStorage (Supabase опціонально)'],
              ['PDF', 'window.print() + CSS print'],
              ['Графіки', 'Chart.js v4'],
              ['AI', 'Rule-based (локально)'],
            ].map(([k,v]) => `
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p class="text-xs text-gray-400 uppercase font-medium">${k}</p>
                <p class="text-gray-700 dark:text-gray-300 mt-0.5">${v}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // ── Bank accounts init ───────────────────────────────────────────────────
    _renderBankAccountsList();

    document.getElementById('add-bank-account-btn').addEventListener('click', () => {
      _openBankAccountForm(null);
    });

    // ── Currency rates init ──────────────────────────────────────────────────
    _initCurrencyRates();

    // ── Payment gateway init ─────────────────────────────────────────────────
    _bindPaymentGatewayEvents();

    // Events
    document.getElementById('save-profile').addEventListener('click', () => {
      localStorage.setItem('saas_user_name', document.getElementById('profile-name').value.trim());
      localStorage.setItem('saas_followup_days', document.getElementById('followup-days').value || '30');
      Notifications.add('✅ Профіль збережено');
    });

    // Language selector
    document.getElementById('save-lang-btn')?.addEventListener('click', () => {
      const lang = document.getElementById('ui-lang-select')?.value;
      if (lang) {
        I18nService.setLanguage(lang);
        Notifications.add(`🌐 Мову змінено на: ${I18nService.getLanguages()[lang]?.name || lang}`);
        // Перерендер сторінки з новою мовою
        render();
      }
    });

    document.getElementById('sb-connect-btn').addEventListener('click', async () => {
      const url = document.getElementById('sb-url').value.trim();
      const key = document.getElementById('sb-key').value.trim();
      if (!url || !key) { alert('Введіть URL та Key'); return; }
      SupabaseService.saveConfig(url, key);
      const btn = document.getElementById('sb-connect-btn');
      btn.textContent = '⏳ Підключення...';
      btn.disabled = true;
      await SupabaseService.connect();
      render();
    });

    document.getElementById('sb-disconnect-btn')?.addEventListener('click', () => {
      SupabaseService.disconnect();
      render();
    });

    document.getElementById('sb-sync-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('sb-sync-btn');
      btn.textContent = '⏳ Синхронізація...';
      btn.disabled = true;
      for (const col of ['clients', 'projects', 'invoices', 'expenses', 'deals', 'activity_logs', 'bank_accounts', 'payment_transactions']) {
        await SupabaseService.syncToSupabase(col);
      }
      btn.textContent = '✅ Синхронізовано!';
      setTimeout(() => render(), 2000);
    });

    document.getElementById('copy-schema').addEventListener('click', () => {
      navigator.clipboard?.writeText(SupabaseService.getSchema());
      document.getElementById('copy-schema').textContent = '✅ Скопійовано!';
      setTimeout(() => document.getElementById('copy-schema').textContent = '📋 Копіювати SQL', 2000);
    });

    document.getElementById('test-tg-btn').addEventListener('click', () => {
      localStorage.setItem('saas_tg_token', document.getElementById('tg-token').value.trim());
      localStorage.setItem('saas_tg_chat', document.getElementById('tg-chat').value.trim());
      Notifications.add('🧪 Тестове сповіщення успішно відправлено (симуляція)', 'telegram');
    });

    document.getElementById('export-data').addEventListener('click', () => {
      const data = {};
      ['clients', 'projects', 'invoices', 'expenses', 'deals', 'activity_logs', 'notifications'].forEach(col => {
        data[col] = Store.getAll(col);
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `freelancehub-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Notifications.add('📥 Дані успішно експортовано в JSON');
    });

    document.getElementById('import-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const data = JSON.parse(evt.target.result);
          Object.entries(data).forEach(([col, items]) => {
            if (Array.isArray(items)) {
              localStorage.setItem('saas_' + col, JSON.stringify(items));
            }
          });
          Notifications.add('📤 Дані успішно імпортовано!');
          EventBus.emit('data:changed');
          render();
        } catch {
          alert('Помилка при читанні файлу. Перевірте формат JSON.');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('reset-data').addEventListener('click', () => {
      Modal.open({
        title: '⚠️ Скинути всі дані?',
        content: `<div class="text-center py-4"><div class="text-5xl mb-4">🗑️</div><p class="text-gray-700 dark:text-gray-300 font-medium">Це видалить <strong>всі</strong> клієнти, проєкти, інвойси, витрати та угоди.</p><p class="mt-2 text-sm text-red-500">Цю дію неможливо скасувати!</p></div>`,
        confirmText: '🗑️ Так, скинути все',
        onConfirm: () => {
          ['clients','projects','invoices','expenses','deals','activity_logs','notifications','ai_history'].forEach(c => Store.clear(c));
          localStorage.removeItem('saas_seeded');
          Modal.close();
          Notifications.add('🗑️ Всі дані скинуто. Демо-дані завантажено знову.');
          location.reload();
        },
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // БАНКІВСЬКІ РЕКВІЗИТИ
  // ═══════════════════════════════════════════════════════════════════════════

  function _renderBankAccountsList() {
    const container = document.getElementById('bank-accounts-list');
    if (!container) return;

    const accounts = BankAccountsService.getAll();

    if (!accounts.length) {
      container.innerHTML = `
        <div class="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <div class="text-4xl mb-2">🏦</div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">Реквізити ще не додані</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Натисніть «Додати рахунок» щоб зберегти банківські реквізити</p>
        </div>
      `;
      return;
    }

    const currencyGroups = { UAH: [], USD: [], EUR: [], GBP: [], PLN: [], CHF: [], CAD: [], AUD: [], JPY: [], CZK: [] };
    accounts.forEach(a => { if (currencyGroups[a.currency] !== undefined) currencyGroups[a.currency].push(a); });

    const allCurrencies = CurrencyService.getAll();
    const currencyFlags = {};
    const currencyNames = {};
    Object.values(allCurrencies).forEach(c => {
      currencyFlags[c.code] = c.flag;
      currencyNames[c.code] = `${c.name} (${c.code})`;
    });

    container.innerHTML = Object.entries(currencyGroups)
      .filter(([, arr]) => arr.length > 0)
      .map(([currency, arr]) => `
        <div class="mb-4">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">${currencyFlags[currency]} ${currencyNames[currency]}</p>
          <div class="space-y-2">
            ${arr.map(acc => `
              <div class="border ${acc.isPrimary ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700'} rounded-xl p-4 transition-all">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-gray-800 dark:text-gray-100 text-sm">${acc.bankName}</span>
                      ${acc.isPrimary ? '<span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">Основний</span>' : ''}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${acc.recipientName}</p>
                    <p class="text-xs font-mono text-gray-600 dark:text-gray-300 mt-1">${_formatIBANDisplay(acc.iban)}</p>
                    ${acc.cardNumber ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Картка: ${acc.cardNumber}</p>` : ''}
                    ${acc.swiftBic ? `<p class="text-xs text-gray-500 dark:text-gray-400">SWIFT: ${acc.swiftBic}</p>` : ''}
                    ${acc.paymentPurpose ? `<p class="text-xs text-gray-400 dark:text-gray-500 mt-1 italic truncate">«${acc.paymentPurpose}»</p>` : ''}
                  </div>
                  <div class="flex gap-1 shrink-0">
                    <button class="btn-icon copy-account-btn" data-id="${acc.id}" title="Копіювати реквізити">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </button>
                    ${!acc.isPrimary ? `
                    <button class="btn-icon set-primary-btn text-yellow-500" data-id="${acc.id}" data-currency="${acc.currency}" title="Зробити основним">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                    </button>` : ''}
                    <button class="btn-icon edit-account-btn" data-id="${acc.id}" title="Редагувати">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon-danger delete-account-btn" data-id="${acc.id}" title="Видалити">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

    // Events
    container.querySelectorAll('.copy-account-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const acc = BankAccountsService.getById(btn.dataset.id);
        const text = BankAccountsService.formatForCopy(acc);
        navigator.clipboard?.writeText(text).then(() => {
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
          setTimeout(() => { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'; }, 2000);
        });
        Notifications.add('📋 Реквізити скопійовано в буфер обміну');
      });
    });

    container.querySelectorAll('.set-primary-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        BankAccountsService.setPrimary(btn.dataset.id);
        _renderBankAccountsList();
        Notifications.add('⭐ Основний рахунок змінено');
      });
    });

    container.querySelectorAll('.edit-account-btn').forEach(btn => {
      btn.addEventListener('click', () => _openBankAccountForm(btn.dataset.id));
    });

    container.querySelectorAll('.delete-account-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const acc = BankAccountsService.getById(btn.dataset.id);
        Modal.open({
          title: 'Видалити рахунок?',
          content: `<div class="text-center py-4"><div class="text-4xl mb-3">🏦</div><p class="text-gray-700 dark:text-gray-300">Видалити рахунок <strong>${acc?.bankName}</strong> (${acc?.currency})?</p></div>`,
          confirmText: 'Видалити',
          onConfirm: () => {
            BankAccountsService.remove(btn.dataset.id);
            Modal.close();
            _renderBankAccountsList();
            Notifications.add('🗑️ Рахунок видалено');
          },
        });
      });
    });
  }

  function _openBankAccountForm(id) {
    const account = id ? BankAccountsService.getById(id) : null;

    Modal.open({
      title: account ? 'Редагувати реквізити' : 'Новий банківський рахунок',
      size: 'lg',
      content: `
        <form id="bank-account-form" class="space-y-4" novalidate>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Назва банку -->
            <div class="sm:col-span-2">
              <label class="label">Назва банку *</label>
              <input name="bankName" type="text" class="input" value="${account?.bankName || ''}"
                placeholder="ПриватБанк / Монобанк / ПУМБ..." />
              <p class="validator-hint text-xs text-red-500 mt-1 hidden" id="err-bankName"></p>
            </div>

            <!-- Ім'я отримувача -->
            <div class="sm:col-span-2">
              <label class="label">Отримувач (ім'я ФОП або назва компанії) *</label>
              <input name="recipientName" type="text" class="input" value="${account?.recipientName || ''}"
                placeholder="Петренко Іван Олексійович / Petrenko Ivan" />
              <p class="text-xs text-gray-400 mt-0.5">Можна вводити кирилицею або латиницею</p>
              <p class="validator-hint text-xs text-red-500 mt-1 hidden" id="err-recipientName"></p>
            </div>

            <!-- IBAN -->
            <div class="sm:col-span-2">
              <label class="label">IBAN *</label>
              <input name="iban" type="text" class="input font-mono" value="${account ? _formatIBANDisplay(account.iban) : ''}"
                placeholder="UA21 3220 0100 0026 2010 0493 0000 00"
                maxlength="40" id="iban-input" />
              <div class="flex items-center justify-between mt-1">
                <p class="text-xs text-gray-400">Формат: UA + 2 цифри + 25 символів (разом 29 для України)</p>
                <span id="iban-status" class="text-xs font-medium"></span>
              </div>
              <p class="validator-hint text-xs text-red-500 mt-0.5 hidden" id="err-iban"></p>
            </div>

            <!-- Номер картки (опціонально) -->
            <div>
              <label class="label">Номер картки <span class="font-normal lowercase text-gray-400">(опціонально)</span></label>
              <input name="cardNumber" type="text" class="input font-mono" value="${account?.cardNumber || ''}"
                placeholder="5168 7450 •••• 1234" maxlength="23" id="card-input" />
              <div class="flex items-center justify-between mt-1">
                <p class="text-xs text-gray-400">Перевіряється алгоритмом Луна</p>
                <span id="card-status" class="text-xs font-medium"></span>
              </div>
              <p class="validator-hint text-xs text-red-500 mt-0.5 hidden" id="err-cardNumber"></p>
            </div>

            <!-- SWIFT/BIC -->
            <div>
              <label class="label">SWIFT / BIC <span class="font-normal lowercase text-gray-400">(для валютних переказів)</span></label>
              <input name="swiftBic" type="text" class="input font-mono" value="${account?.swiftBic || ''}"
                placeholder="PBANUA2X" maxlength="11" id="swift-input" />
              <div class="flex items-center justify-between mt-1">
                <p class="text-xs text-gray-400">8 або 11 символів</p>
                <span id="swift-status" class="text-xs font-medium"></span>
              </div>
              <p class="validator-hint text-xs text-red-500 mt-0.5 hidden" id="err-swiftBic"></p>
            </div>

            <!-- Валюта -->
            <div>
              <label class="label">Валюта рахунку *</label>
              <select name="currency" class="input">
                ${CurrencyService.getSelectOptions(account?.currency || 'UAH')}
              </select>
            </div>

            <!-- Основний рахунок -->
            <div class="flex items-center gap-3 pt-5">
              <input type="checkbox" name="isPrimary" id="is-primary-cb" class="w-4 h-4 rounded accent-indigo-600"
                ${account?.isPrimary ? 'checked' : ''} />
              <label for="is-primary-cb" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Основний рахунок для цієї валюти
              </label>
            </div>

            <!-- Призначення платежу -->
            <div class="sm:col-span-2">
              <label class="label">Призначення платежу за замовчуванням</label>
              <input name="paymentPurpose" type="text" class="input" value="${account?.paymentPurpose || ''}"
                placeholder="Оплата послуг за договором №... від..." />
              <p class="text-xs text-gray-400 mt-0.5">Буде автоматично підставлятись в інвойси</p>
            </div>
          </div>
        </form>
      `,
      confirmText: account ? 'Зберегти зміни' : 'Додати рахунок',
      onConfirm: () => _saveBankAccount(id),
    });

    // Live-валідація IBAN
    document.getElementById('iban-input')?.addEventListener('input', e => {
      const val = e.target.value.trim();
      if (!val) { document.getElementById('iban-status').textContent = ''; return; }
      const result = BankAccountsService.validateIBAN(val);
      const el = document.getElementById('iban-status');
      el.textContent = result.valid ? '✅ Валідний' : '❌ ' + (result.error || 'Невірний');
      el.className = `text-xs font-medium ${result.valid ? 'text-green-600' : 'text-red-500'}`;
    });

    // Live-валідація картки
    document.getElementById('card-input')?.addEventListener('input', e => {
      const digits = e.target.value.replace(/\D/g, '');
      const el = document.getElementById('card-status');
      if (!digits) { el.textContent = ''; return; }
      // Не перевіряємо маскований номер повторно
      if (e.target.value.includes('•')) { el.textContent = ''; return; }
      if (digits.length < 13) { el.textContent = ''; return; }
      const valid = BankAccountsService.luhnCheck(digits);
      el.textContent = valid ? '✅ Валідна' : '❌ Невірна картка';
      el.className = `text-xs font-medium ${valid ? 'text-green-600' : 'text-red-500'}`;
    });

    // Live-валідація SWIFT
    document.getElementById('swift-input')?.addEventListener('input', e => {
      const val = e.target.value.trim();
      const el = document.getElementById('swift-status');
      if (!val) { el.textContent = ''; return; }
      const result = BankAccountsService.validateSWIFT(val);
      el.textContent = result.valid ? '✅ Валідний' : '❌ Невірний формат';
      el.className = `text-xs font-medium ${result.valid ? 'text-green-600' : 'text-red-500'}`;
    });
  }

  function _saveBankAccount(id) {
    const form = document.getElementById('bank-account-form');
    if (!form) return;

    // Збираємо дані
    const data = {
      bankName:       form.bankName.value,
      recipientName:  form.recipientName.value,
      iban:           form.iban.value,
      cardNumber:     form.cardNumber.value,
      swiftBic:       form.swiftBic.value,
      currency:       form.currency.value,
      isPrimary:      form.isPrimary.checked,
      paymentPurpose: form.paymentPurpose.value,
    };

    // Скидаємо попередні помилки
    ['bankName','recipientName','iban','cardNumber','swiftBic'].forEach(f => {
      const el = document.getElementById(`err-${f}`);
      if (el) { el.textContent = ''; el.classList.add('hidden'); }
    });

    const result = id
      ? BankAccountsService.update(id, data)
      : BankAccountsService.save(data);

    if (!result.success) {
      // Показуємо помилки
      Object.entries(result.errors || {}).forEach(([field, msg]) => {
        const el = document.getElementById(`err-${field}`);
        if (el) { el.textContent = msg; el.classList.remove('hidden'); }
      });
      return; // Не закриваємо модальне вікно
    }

    Modal.close();
    _renderBankAccountsList();
    Notifications.add(id ? '✅ Реквізити оновлено' : '✅ Рахунок додано');
  }

  function _formatIBANDisplay(iban) {
    if (!iban) return '';
    return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ПЛАТІЖНИЙ ШЛЮЗ
  // ═══════════════════════════════════════════════════════════════════════════

  function _renderPaymentGatewaySection() {
    const cfg = PaymentService.getConfig();
    const isSandbox = PaymentService.isSandbox();
    const providers = PaymentService.getProviders();

    return `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">💳 Платіжний шлюз</h3>
        ${isSandbox ? `
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            🧪 SANDBOX / ТЕСТОВИЙ РЕЖИМ
          </span>
        ` : `
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
            🟢 PRODUCTION РЕЖИМ
          </span>
        `}
      </div>

      ${isSandbox ? `
        <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <p class="font-semibold mb-1">🧪 Увага: активний тестовий (sandbox) режим</p>
          <p class="text-xs">Платежі симулюються локально — реальні гроші не списуються. Для активації реальних платежів додайте API-ключі провайдера нижче.</p>
        </div>
      ` : ''}

      <div class="space-y-3">
        <div>
          <label class="label">Провайдер</label>
          <select id="payment-provider-select" class="input">
            ${Object.entries(providers).map(([key, p]) =>
              `<option value="${key}" ${cfg.provider === key ? 'selected' : ''}>${p.name} (${p.currencies.join(', ')})</option>`
            ).join('')}
          </select>
        </div>

        <div>
          <label class="label">API Key / Merchant Account</label>
          <input id="payment-api-key" type="password" class="input" value="${cfg.apiKey || ''}" placeholder="Введіть ключ для активації реальних платежів" />
          <p class="text-xs text-gray-400 mt-1">Поки поле порожнє — активний sandbox-режим. Знайдіть ключ в особистому кабінеті провайдера.</p>
        </div>

        <div>
          <label class="label">Secret Key</label>
          <input id="payment-secret-key" type="password" class="input" value="${cfg.secretKey || ''}" placeholder="Секретний ключ (для підпису запитів)" />
        </div>

        <div>
          <label class="label">Merchant ID (для WayForPay)</label>
          <input id="payment-merchant-id" type="text" class="input" value="${cfg.merchantId || ''}" placeholder="test_merchant_id" />
        </div>

        <div>
          <label class="label">Webhook URL (для підтверджень оплати)</label>
          <input id="payment-webhook-url" type="url" class="input" value="${cfg.webhookUrl || ''}" placeholder="https://your-domain.com/api/webhook/payment" />
          <p class="text-xs text-gray-400 mt-1">Потрібен серверний компонент або Supabase Edge Function для обробки webhook.</p>
        </div>

        <div class="flex items-center gap-3">
          <input type="checkbox" id="payment-sandbox-cb" class="w-4 h-4 rounded accent-indigo-600" ${cfg.sandboxMode ? 'checked' : ''} />
          <label for="payment-sandbox-cb" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            Sandbox (тестовий) режим — навіть якщо ключі вказані
          </label>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button id="save-payment-config-btn" class="btn-primary">Зберегти налаштування</button>
        ${isSandbox ? `
          <button id="test-sandbox-payment-btn" class="btn-secondary text-sm">
            🧪 Симулювати платіж
          </button>
        ` : ''}
      </div>

      <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
        <p class="text-xs text-gray-400 dark:text-gray-500 font-medium mb-2">📋 Шаблон змінних (.env.example):</p>
        <pre class="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">WAYFORPAY_MERCHANT_ACCOUNT=your_merchant
WAYFORPAY_MERCHANT_SECRET_KEY=your_secret
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
PAYMENT_SANDBOX_MODE=true</pre>
      </div>
    `;
  }

  function _bindPaymentGatewayEvents() {
    document.getElementById('save-payment-config-btn')?.addEventListener('click', () => {
      PaymentService.saveConfig({
        provider:     document.getElementById('payment-provider-select')?.value,
        apiKey:       document.getElementById('payment-api-key')?.value.trim(),
        secretKey:    document.getElementById('payment-secret-key')?.value.trim(),
        merchantId:   document.getElementById('payment-merchant-id')?.value.trim(),
        webhookUrl:   document.getElementById('payment-webhook-url')?.value.trim(),
        sandboxMode:  document.getElementById('payment-sandbox-cb')?.checked,
      });
      Notifications.add('✅ Налаштування платіжного шлюзу збережено');
      // Перемальовуємо секцію щоб оновити статус-бейдж
      const card = document.getElementById('payment-gateway-card');
      if (card) {
        card.innerHTML = _renderPaymentGatewaySection();
        _bindPaymentGatewayEvents();
      }
    });

    document.getElementById('test-sandbox-payment-btn')?.addEventListener('click', () => {
      const invoices = Store.getAll('invoices');
      const testInvoice = invoices[0];
      if (!testInvoice) {
        Notifications.add('⚠️ Спочатку створіть хоча б один інвойс для тестування');
        return;
      }
      Notifications.add(`🧪 [SANDBOX] Симулюємо оплату інвойсу #${testInvoice.number}...`);
      PaymentService.initiatePayment(testInvoice, 'paid').then(result => {
        Notifications.add(result.message);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // КУРСИ ВАЛЮТ
  // ═══════════════════════════════════════════════════════════════════════════

  function _initCurrencyRates() {
    const widget = document.getElementById('currency-rates-widget');
    if (!widget) return;

    CurrencyService.renderRatesWidget().then(html => {
      widget.innerHTML = html;
    });

    document.getElementById('refresh-rates-btn')?.addEventListener('click', () => {
      // Скидаємо кеш та перезавантажуємо
      localStorage.removeItem('saas_exchange_rates');
      widget.innerHTML = '<p class="text-xs text-gray-400">⏳ Оновлення курсів...</p>';
      CurrencyService.renderRatesWidget().then(html => {
        widget.innerHTML = html;
        Notifications.add('💱 Курси валют оновлено');
      });
    });

    document.getElementById('save-exchangerate-key-btn')?.addEventListener('click', () => {
      const key = document.getElementById('exchangerate-api-key')?.value.trim();
      if (key) {
        localStorage.setItem('saas_exchangerate_api_key', key);
        localStorage.removeItem('saas_exchange_rates'); // скидаємо кеш
        Notifications.add('✅ API ключ збережено. Курси будуть оновлені при наступному запиті.');
      } else {
        localStorage.removeItem('saas_exchangerate_api_key');
        Notifications.add('🗑️ API ключ видалено — буде використовуватись НБУ');
      }
    });
  }

  return { render };
})();
