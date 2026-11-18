/**
 * AuthPage — Сторінка реєстрації / входу / верифікації email
 *
 * Режими: 'login' | 'register' | 'verify'
 * Якщо користувач не авторизований — показується ця сторінка замість основного UI.
 */
const AuthPage = (() => {

  let _mode = 'login';          // 'login' | 'register' | 'verify'
  let _pendingEmail = '';       // email очікує верифікації
  let _otpTimerInterval = null; // ID таймера для відліку OTP
  let _resendTimerInterval = null;

  // ─── Монтування / демонтування ───────────────────────────────────────────

  function mount(mode = 'login', pendingEmail = '') {
    _mode = mode;
    _pendingEmail = pendingEmail;
    _render();
  }

  function unmount() {
    _clearTimers();
    // Відновлюємо основний UI
    document.getElementById('app-shell').classList.remove('hidden');
    document.getElementById('auth-overlay').classList.add('hidden');
  }

  // ─── Відображення ────────────────────────────────────────────────────────

  function _render() {
    let overlay = document.getElementById('auth-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-overlay';
      overlay.className = 'fixed inset-0 z-[9999] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4';
      document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    document.getElementById('app-shell')?.classList.add('hidden');

    overlay.innerHTML = `
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">FreelanceHub Pro</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Smart Invoice & CRM Suite</p>
        </div>

        <!-- Card -->
        <div class="card shadow-xl border border-gray-200 dark:border-gray-700">
          <div id="auth-form-container">
            ${_mode === 'verify' ? _renderVerifyForm() : (_mode === 'register' ? _renderRegisterForm() : _renderLoginForm())}
          </div>
        </div>

        <!-- Footer -->
        <p class="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          FreelanceHub Pro v1.1 · Дані зберігаються локально
        </p>
      </div>
    `;

    _bindEvents();
  }

  function _renderLoginForm() {
    return `
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5">Вхід до системи</h2>
      <form id="auth-form" class="space-y-4" novalidate>
        <div>
          <label class="label">Email</label>
          <input name="email" type="email" class="input" placeholder="your@email.com" autocomplete="email" required />
          <p id="err-email" class="text-xs text-red-500 mt-1 hidden"></p>
        </div>
        <div>
          <label class="label">Пароль</label>
          <div class="relative">
            <input name="password" type="password" class="input pr-10" placeholder="••••••••" autocomplete="current-password" required />
            <button type="button" id="toggle-pwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
          </div>
          <p id="err-password" class="text-xs text-red-500 mt-1 hidden"></p>
        </div>
        <p id="auth-global-err" class="text-sm text-red-500 hidden"></p>
        <button type="submit" id="auth-submit-btn" class="btn-primary w-full justify-center">Увійти</button>
      </form>
      <div class="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Немає акаунту?
          <button id="switch-to-register" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-1">Зареєструватись</button>
        </p>
      </div>
    `;
  }

  function _renderRegisterForm() {
    return `
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5">Створити акаунт</h2>
      <form id="auth-form" class="space-y-4" novalidate>
        <div>
          <label class="label">Ім'я (для шаблонів)</label>
          <input name="displayName" type="text" class="input" placeholder="Іван Петренко" autocomplete="name" />
        </div>
        <div>
          <label class="label">Email *</label>
          <input name="email" type="email" class="input" placeholder="your@email.com" autocomplete="email" required />
          <p id="err-email" class="text-xs text-red-500 mt-1 hidden"></p>
        </div>
        <div>
          <label class="label">Пароль *</label>
          <div class="relative">
            <input name="password" type="password" class="input pr-10" placeholder="Мінімум 8 символів, 1 велика, 1 цифра" autocomplete="new-password" required />
            <button type="button" id="toggle-pwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
          </div>
          <p id="err-password" class="text-xs text-red-500 mt-1 hidden"></p>
        </div>
        <div>
          <label class="label">Повторіть пароль *</label>
          <input name="passwordConfirm" type="password" class="input" placeholder="••••••••" autocomplete="new-password" required />
          <p id="err-passwordConfirm" class="text-xs text-red-500 mt-1 hidden"></p>
        </div>
        <div>
          <label class="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-300 transition-all">
            <input type="checkbox" id="consent-cb" class="w-4 h-4 rounded accent-indigo-600 mt-0.5 shrink-0" />
            <span class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Я погоджуюсь з <a href="privacy.html" target="_blank" rel="noopener" class="text-indigo-600 dark:text-indigo-400 underline font-semibold">Політикою конфіденційності</a> та <a href="#legal" data-route="legal" class="text-indigo-600 dark:text-indigo-400 underline font-semibold">Умовами використання</a>. Мої дані будуть оброблятися відповідно до GDPR.
            </span>
          </label>
          <p id="err-consent" class="text-xs text-red-500 mt-1 hidden">Потрібна ваша згода для реєстрації</p>
        </div>
        <p id="auth-global-err" class="text-sm text-red-500 hidden"></p>
        <button type="submit" id="auth-submit-btn" class="btn-primary w-full justify-center">Зареєструватись</button>
      </form>
      <div class="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Вже є акаунт?
          <button id="switch-to-login" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-1">Увійти</button>
        </p>
      </div>
    `;
  }

  function _renderVerifyForm() {
    const otpStatus = AuthService.getOTPStatus(_pendingEmail);
    const isSandbox = otpStatus.sandbox;

    return `
      <div class="text-center mb-5">
        <div class="text-5xl mb-3">📧</div>
        <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">Підтвердіть email</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ми надіслали 5-значний код на вашу пошту<br/>
          <span class="font-semibold text-gray-700 dark:text-gray-300">${_pendingEmail}</span>
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Введіть його нижче:</p>
        ${isSandbox ? `
          <div class="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p class="text-xs text-amber-700 dark:text-amber-400 font-semibold">🧪 SANDBOX: код відображається в консолі браузера (F12 → Console)</p>
          </div>
        ` : ''}
      </div>
      <form id="auth-form" class="space-y-4" novalidate>
        <div>
          <label class="label">Код підтвердження з email</label>
          <input name="otp" type="text" inputmode="numeric" maxlength="5"
            class="input text-center text-2xl font-bold font-mono tracking-[0.5em] letter-spacing-widest"
            placeholder="_ _ _ _ _"
            autocomplete="one-time-code"
            required />
          <div class="flex items-center justify-between mt-1.5">
            <span id="otp-expires" class="text-xs text-gray-400"></span>
            <button type="button" id="resend-otp-btn" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40 disabled:no-underline" disabled>
              Надіслати код повторно (<span id="resend-countdown">60</span>с)
            </button>
          </div>
          <p id="err-otp" class="text-xs text-red-500 mt-1 hidden"></p>
        </div>
        <p id="auth-global-err" class="text-sm text-red-500 hidden"></p>
        <button type="submit" id="auth-submit-btn" class="btn-primary w-full justify-center">Підтвердити код</button>
      </form>
      <div class="mt-4 text-center">
        <button id="back-to-login" class="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Назад до входу</button>
      </div>
    `;
  }

  function _renderEmailSentMessage() {
    return `
      <div class="text-center py-6">
        <div class="text-5xl mb-3">📧</div>
        <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">Перевірте пошту</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Ми надіслали лист для підтвердження на<br/>
          <span class="font-semibold text-gray-700 dark:text-gray-300">${_pendingEmail}</span>
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-3 font-medium">
          Перевірте пошту та перейдіть за посиланням у листі для підтвердження акаунту.
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Після підтвердження ви зможете увійти у систему.
        </p>
      </div>
      <div class="mt-4 text-center">
        <button id="back-to-login" class="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Назад до входу</button>
      </div>
    `;
  }

  // ─── Прив'язка подій ──────────────────────────────────────────────────────

  function _bindEvents() {
    // Перемикання пароль / текст
    document.getElementById('toggle-pwd')?.addEventListener('click', () => {
      const pwd = document.querySelector('input[name="password"]');
      if (pwd) pwd.type = pwd.type === 'password' ? 'text' : 'password';
    });

    // Перемикач режимів
    document.getElementById('switch-to-register')?.addEventListener('click', () => {
      _mode = 'register';
      document.getElementById('auth-form-container').innerHTML = _renderRegisterForm();
      _bindEvents();
    });
    document.getElementById('switch-to-login')?.addEventListener('click', () => {
      _mode = 'login';
      document.getElementById('auth-form-container').innerHTML = _renderLoginForm();
      _bindEvents();
    });
    document.getElementById('back-to-login')?.addEventListener('click', () => {
      _mode = 'login';
      _clearTimers();
      document.getElementById('auth-form-container').innerHTML = _renderLoginForm();
      _bindEvents();
    });

    // Submit форми
    document.getElementById('auth-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      await _handleSubmit(e.target);
    });

    // Resend OTP
    document.getElementById('resend-otp-btn')?.addEventListener('click', async () => {
      const result = await AuthService.resendRegistrationCode();
      if (result.success) {
        _startOTPTimers();
        const errEl = document.getElementById('err-otp');
        if (errEl) { errEl.textContent = '✅ Новий код відправлено'; errEl.classList.remove('hidden', 'text-red-500'); errEl.classList.add('text-green-600'); }
      } else {
        const errEl = document.getElementById('err-otp');
        if (errEl) { errEl.textContent = result.error; errEl.classList.remove('hidden'); }
      }
    });

    // Старт OTP таймерів якщо в режимі verify
    if (_mode === 'verify') {
      _startOTPTimers();
    }
  }

  async function _handleSubmit(form) {
    const btn = document.getElementById('auth-submit-btn');
    const globalErr = document.getElementById('auth-global-err');

    // Скидаємо помилки
    form.querySelectorAll('[id^="err-"]').forEach(el => el.classList.add('hidden'));
    globalErr.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = '⏳ Зачекайте...';

    try {
      if (_mode === 'login') {
        await _doLogin(form);
      } else if (_mode === 'register') {
        await _doRegister(form);
      } else if (_mode === 'verify') {
        await _doVerify(form);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = _mode === 'login' ? 'Увійти' : _mode === 'register' ? 'Зареєструватись' : 'Підтвердити код';
    }
  }

  async function _doLogin(form) {
    const email = form.email?.value?.trim() || '';
    const password = form.password?.value || '';
    const globalErr = document.getElementById('auth-global-err');

    if (!email) { _showFieldErr('email', 'Введіть email'); return; }
    if (!password) { _showFieldErr('password', 'Введіть пароль'); return; }

    const result = await AuthService.login(email, password);

    if (result.success) {
      _onLoginSuccess(result.user);
    } else if (result.needVerification) {
      _pendingEmail = result.email;
      if (AuthService.isSupabaseMode()) {
        // Supabase: повторно надсилаємо код та показуємо форму введення
        await AuthService.resendOTP(email);
        _mode = 'verify';
        document.getElementById('auth-form-container').innerHTML = _renderVerifyForm();
        _bindEvents();
      } else {
        // Sandbox: показуємо форму введення OTP коду
        await AuthService.resendOTP(email);
        _mode = 'verify';
        document.getElementById('auth-form-container').innerHTML = _renderVerifyForm();
        _bindEvents();
      }
    } else {
      globalErr.textContent = result.error;
      globalErr.classList.remove('hidden');
    }
  }

  async function _doRegister(form) {
    const email = form.email?.value?.trim() || '';
    const password = form.password?.value || '';
    const passwordConfirm = form.passwordConfirm?.value || '';
    const displayName = form.displayName?.value?.trim() || '';
    const globalErr = document.getElementById('auth-global-err');

    if (!email) { _showFieldErr('email', 'Введіть email'); return; }
    if (!password) { _showFieldErr('password', 'Введіть пароль'); return; }
    if (password !== passwordConfirm) { _showFieldErr('passwordConfirm', 'Паролі не збігаються'); return; }

    // Перевірка згоди з правилами
    const consentCb = document.getElementById('consent-cb');
    if (!consentCb || !consentCb.checked) {
      _showFieldErr('consent', 'Потрібна ваша згода для реєстрації');
      return;
    }

    const result = await AuthService.startRegistration(email, password, displayName);

    if (result.success) {
      _pendingEmail = result.email || email;
      _mode = 'verify';
      document.getElementById('auth-form-container').innerHTML = _renderVerifyForm();
      _bindEvents();
    } else {
      if (result.alreadyRegistered) {
        globalErr.textContent = result.error;
        globalErr.classList.remove('hidden');
      } else if (result.error?.toLowerCase().includes('email')) {
        _showFieldErr('email', result.error);
      } else if (result.error?.toLowerCase().includes('пароль')) {
        _showFieldErr('password', result.error);
      } else {
        globalErr.textContent = result.error;
        globalErr.classList.remove('hidden');
      }
    }
  }

  async function _doVerify(form) {
    const otp = form.otp?.value?.replace(/\s/g, '') || '';

    if (!otp || otp.length !== 5) { _showFieldErr('otp', 'Введіть 5-значний код з пошти'); return; }

    const result = await AuthService.verifyCodeAndRegister(otp);

    if (result.success) {
      _clearTimers();
      document.getElementById('auth-form-container').innerHTML = `
        <div class="text-center py-6">
          <div class="text-5xl mb-3">🎉</div>
          <h2 class="text-lg font-bold text-green-700 dark:text-green-400">Email підтверджено!</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Ваш акаунт активовано. Нараховано <strong>+500 Короликів 👑</strong></p>
          <p class="text-sm text-gray-400 mt-1">Перенаправлення...</p>
        </div>
      `;

      const user = result.user || AuthService.getCurrentUser();
      if (user) {
        // Показуємо кнопку підключення Telegram перед переходом у кабінет
        document.getElementById('auth-form-container').innerHTML = `
          <div class="text-center py-4">
            <div class="text-5xl mb-3">🎉</div>
            <h2 class="text-lg font-bold text-green-700 dark:text-green-400">Email підтверджено!</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Ваш акаунт активовано. Нараховано <strong>+500 Короликів 👑</strong></p>
          </div>
          <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 text-center space-y-3">
            <p class="text-sm font-semibold text-blue-700 dark:text-blue-300">📲 Підключіть Telegram-сповіщення</p>
            <p class="text-xs text-blue-600 dark:text-blue-400">Отримуйте сповіщення про поповнення балансу та важливі події прямо в Telegram.</p>
            <a href="https://t.me/mICaB_Bot?start=${user.id}" target="_blank" rel="noopener"
              class="btn-primary w-full justify-center bg-blue-500 hover:bg-blue-600 inline-flex">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Підключити @mICaB_Bot
            </a>
            <button id="skip-telegram-btn" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-full">Пропустити, зайти в кабінет →</button>
          </div>
        `;
        // Прив'язуємо кнопку «Пропустити»
        document.getElementById('skip-telegram-btn').addEventListener('click', () => {
          _onLoginSuccess(user);
        });
        // Автоматичний перехід через 15 сек якщо не натиснули нічого
        setTimeout(() => {
          if (document.getElementById('skip-telegram-btn')) _onLoginSuccess(user);
        }, 15000);
      } else {
        setTimeout(() => {
          _mode = 'login';
          document.getElementById('auth-form-container').innerHTML = _renderLoginForm();
          _bindEvents();
          const ge = document.getElementById('auth-global-err');
          if (ge) { ge.textContent = '✅ Акаунт створено. Увійдіть.'; ge.classList.remove('hidden', 'text-red-500'); ge.classList.add('text-green-600'); }
        }, 2000);
      }
    } else {
      _showFieldErr('otp', result.error);
    }
  }

  function _onLoginSuccess(user) {
    _clearTimers();
    // Оновлюємо ім'я в localStorage для шаблонів
    if (user.displayName) {
      localStorage.setItem('saas_user_name', user.displayName);
    }
    // Щоденний бонус
    KorolikyService.checkAndClaimDailyBonus();
    unmount();
    // Ре-рендер UI
    Router.navigate('dashboard');
    Topbar.render();
    Notifications.add(`👋 Вітаємо, ${user.displayName}!`);

    // Бонус при вході
    EventBus.on('koroliky:bonus_claimed', ({ amount }) => {
      Notifications.add(`👑 +${amount} Короликів нараховано за вхід сьогодні!`);
    }, { once: true });
  }

  // ─── OTP таймери ─────────────────────────────────────────────────────────

  function _startOTPTimers() {
    _clearTimers();

    // Таймер закінчення дії коду
    _otpTimerInterval = setInterval(() => {
      const status = AuthService.getOTPStatus(_pendingEmail);
      const expiresEl = document.getElementById('otp-expires');
      if (expiresEl) {
        if (status.secondsLeft > 0) {
          const m = Math.floor(status.secondsLeft / 60);
          const s = status.secondsLeft % 60;
          expiresEl.textContent = `Код дійсний ще: ${m}:${String(s).padStart(2,'0')}`;
        } else {
          expiresEl.textContent = '⚠️ Код застарів — запросіть новий';
        }
      }
    }, 1000);

    // Таймер resend
    let resendLeft = AuthService.getOTPStatus(_pendingEmail).resendIn || 60;
    const resendBtn = document.getElementById('resend-otp-btn');
    const countdown = document.getElementById('resend-countdown');

    _resendTimerInterval = setInterval(() => {
      resendLeft = Math.max(0, resendLeft - 1);
      if (countdown) countdown.textContent = resendLeft;
      if (resendLeft === 0) {
        if (resendBtn) { resendBtn.disabled = false; resendBtn.innerHTML = 'Відправити повторно'; }
        clearInterval(_resendTimerInterval);
      }
    }, 1000);
  }

  function _clearTimers() {
    if (_otpTimerInterval) { clearInterval(_otpTimerInterval); _otpTimerInterval = null; }
    if (_resendTimerInterval) { clearInterval(_resendTimerInterval); _resendTimerInterval = null; }
  }

  function _showFieldErr(field, msg) {
    const el = document.getElementById(`err-${field}`);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }

  // ─── Перевірка при старті застосунку ─────────────────────────────────────

  /**
   * Якщо користувач не авторизований — показує сторінку входу.
   * Викликається з app.js перед ініціалізацією Router.
   */
  function checkAuth() {
    if (!AuthService.isLoggedIn()) {
      mount('login');
      return false;
    }
    // Спочатку синхронізуємо баланс з Supabase, потім перевіряємо щоденний бонус
    if (typeof KorolikyService !== 'undefined' && KorolikyService.syncFromSupabase) {
      KorolikyService.syncFromSupabase().then(() => _claimDailyBonusIfAvailable());
    } else {
      _claimDailyBonusIfAvailable();
    }
    return true;
  }

  function _claimDailyBonusIfAvailable() {
    const bonusResult = KorolikyService.checkAndClaimDailyBonus();
    if (bonusResult.claimed) {
      setTimeout(() => {
        Notifications.add(`👑 +${bonusResult.amount} Короликів — щоденний бонус нараховано!`);
        EventBus.emit('koroliky:changed', {});
      }, 1000);
    }
  }

  return { mount, unmount, checkAuth };
})();
