/**
 * AuthService — повна система автентифікації
 *
 * Режими роботи:
 *  A) SUPABASE AUTH (рекомендовано) — якщо в налаштуваннях вказано Supabase URL + Key,
 *     всі операції делегуються supabase.auth.*  Supabase сам надсилає OTP на email
 *     зі своїх серверів (безкоштовно, без власного SMTP).
 *
 *  B) SANDBOX (локально) — якщо Supabase не підключено, OTP зберігається в
 *     localStorage і відображається у тості та консолі (тільки для розробки).
 *
 * Налаштування Supabase Auth (одноразово):
 *  1. supabase.com → Authentication → Providers → Email — увімкнути "Confirm email"
 *  2. Authentication → Email Templates — можна кастомізувати лист
 *  3. Authentication → URL Configuration → Site URL = URL вашого застосунку
 *  4. Вставте Project URL + anon key у Налаштування → Supabase в застосунку
 *
 * Решта логіки (хешування паролів, Koroliky, сесія) — без змін.
 */
const AuthService = (() => {

  const USERS_KEY     = 'saas_users';
  const SESSION_KEY   = 'saas_session';
  const OTP_KEY       = 'saas_otp_pending';

  // EmailJS config
  const EMAILJS_SERVICE_ID = 'service_nbyuig6';
  const EMAILJS_TEMPLATE_ID = 'template_rvowgat';

  // Pending registration data (email, password, displayName, code)
  let _pendingRegistration = null;

  // Initialize EmailJS with Public Key
  if (typeof emailjs !== 'undefined') {
    emailjs.init('dWvgK6UO2kZx0RUxE');
  }

  // Одноразові поштові домени (базовий список)
  const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
    'yopmail.com','sharklasers.com','guerrillamailblock.com','grr.la',
    'guerrillamail.info','guerrillamail.biz','guerrillamail.de','guerrillamail.net',
    'guerrillamail.org','spam4.me','trashmail.com','trashmail.me','trashmail.net',
    'dispostable.com','mailnull.com','spamgourmet.com','getairmail.com',
    'filzmail.com','throwam.com','maildrop.cc','discard.email','fakeinbox.com',
    'mailnesia.com','spamex.com','temp-mail.org','tempr.email','10minutemail.com',
    'tempinbox.com','mailtemp.info','mt2015.com','spamfree24.org','bugmenot.com',
  ]);

  // ─── Визначення режиму ────────────────────────────────────────────────────

  /**
   * Повертає Supabase client якщо він підключений і підтримує Auth.
   * @returns {object|null}
   */
  function _getSupabaseClient() {
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isConnected()) {
      return SupabaseService.getClient();
    }
    return null;
  }

  function _isSupabaseMode() {
    return _getSupabaseClient() !== null;
  }

  // ─── Утиліти хешування (Web Crypto API, для sandbox-режиму) ─────────────

  async function _hashPassword(password, salt = null) {
    const enc = new TextEncoder();
    if (!salt) {
      const arr = crypto.getRandomValues(new Uint8Array(16));
      salt = Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('');
    return { hash, salt };
  }

  async function _verifyPassword(password, storedHash, storedSalt) {
    const { hash } = await _hashPassword(password, storedSalt);
    return hash === storedHash;
  }

  function _generateOTP() {
    return String(Math.floor(10000 + Math.random() * 90000));
  }

  // ─── Валідація email ─────────────────────────────────────────────────────

  function validateEmail(email) {
    if (!email) return { valid: false, error: 'Email не може бути порожнім' };
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      return { valid: false, error: 'Невірний формат email' };
    }
    const domain = trimmed.split('@')[1];
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return { valid: false, error: `Одноразова пошта (${domain}) не допускається. Використайте реальну адресу.` };
    }
    return { valid: true, email: trimmed };
  }

  // ─── Зберігання користувачів (sandbox) ───────────────────────────────────

  function _getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function _saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function _findUserByEmail(email) {
    return _getUsers().find(u => u.email === email.toLowerCase()) || null;
  }

  // ════════════════════════════════════════════════════════════════════════
  // РЕЄСТРАЦІЯ
  // ════════════════════════════════════════════════════════════════════════

  async function register(email, password, displayName = '') {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return { success: false, error: emailCheck.error };

    if (password.length < 8) return { success: false, error: 'Пароль має містити щонайменше 8 символів' };
    if (!/[A-Z]/.test(password)) return { success: false, error: 'Пароль має містити щонайменше одну велику літеру' };
    if (!/[0-9]/.test(password)) return { success: false, error: 'Пароль має містити щонайменше одну цифру' };

    // ── РЕЖИМ A: Supabase Auth ─────────────────────────────────────────
    if (_isSupabaseMode()) {
      return await _supabaseRegister(emailCheck.email, password, displayName);
    }

    // ── РЕЖИМ B: Sandbox (localStorage) ───────────────────────────────
    return await _sandboxRegister(emailCheck.email, password, displayName);
  }

  // ════════════════════════════════════════════════════════════════════════
  // РЕЄСТРАЦІЯ З ПІДТВЕРДЖЕННЯМ ПОШТИ ЧЕРЕЗ EMAILJS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Крок 1: Валідація, генерація 5-значного коду, відправка через EmailJS.
   * Дані форми зберігаються в пам'яті до підтвердження коду.
   */
  async function startRegistration(email, password, displayName = '') {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return { success: false, error: emailCheck.error };

    if (password.length < 8) return { success: false, error: 'Пароль має містити щонайменше 8 символів' };
    if (!/[A-Z]/.test(password)) return { success: false, error: 'Пароль має містити щонайменше одну велику літеру' };
    if (!/[0-9]/.test(password)) return { success: false, error: 'Пароль має містити щонайменше одну цифру' };

    // Перевірка чи email вже не зареєстрований локально
    const existingLocal = _findUserByEmail(emailCheck.email);
    if (existingLocal && existingLocal.status === 'active') {
      return { success: false, error: 'Користувач з таким email вже зареєстрований. Увійдіть у свій акаунт.', alreadyRegistered: true };
    }

    // Генеруємо 5-значний числовий код
    const code = String(Math.floor(10000 + Math.random() * 90000));

    // Зберігаємо дані форми + код у пам'яті
    _pendingRegistration = { email: emailCheck.email, password, displayName: displayName.trim(), code };

    // Відправляємо код через EmailJS
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: emailCheck.email,
        code,
      });
    } catch (e) {
      _pendingRegistration = null;
      return { success: false, error: 'Не вдалося надіслати код. Спробуйте ще раз.' };
    }

    return { success: true, email: emailCheck.email };
  }

  /**
   * Крок 2: Перевірка коду. Якщо вірний — створює акаунт у Supabase
   * (Confirm email вимкнено → акаунт створюється миттєво з сесією).
   */
  async function verifyCodeAndRegister(enteredCode) {
    if (!_pendingRegistration) {
      return { success: false, error: 'Дані реєстрації не знайдені. Почніть спочатку.' };
    }

    if (String(enteredCode).trim() !== _pendingRegistration.code) {
      return { success: false, error: 'Невірний 5-значний код, перевірте пошту та спробуйте ще раз' };
    }

    // Код вірний — створюємо акаунт
    const { email, password, displayName } = _pendingRegistration;
    _pendingRegistration = null;

    return await register(email, password, displayName);
  }

  /**
   * Повторне відправлення коду через EmailJS (з новим кодом).
   */
  async function resendRegistrationCode() {
    if (!_pendingRegistration) {
      return { success: false, error: 'Дані реєстрації не знайдені.' };
    }

    // Генеруємо новий код
    const newCode = String(Math.floor(10000 + Math.random() * 90000));
    _pendingRegistration.code = newCode;

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: _pendingRegistration.email,
        code: newCode,
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Не вдалося надіслати код.' };
    }
  }

  // ── Supabase реєстрація ───────────────────────────────────────────────────

  async function _supabaseRegister(email, password, displayName) {
    const sb = _getSupabaseClient();
    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) {
        // Supabase повертає помилку якщо email вже зареєстровано
        if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
          return { success: false, error: 'Користувач з таким email вже зареєстрований. Увійдіть у свій акаунт.', alreadyRegistered: true };
        }
        return { success: false, error: error.message };
      }

      // Supabase повертає user=null з порожнім identities, коли email вже зареєстрований
      // (при увімкненому Confirm email)
      if (!data.user && Array.isArray(data.identities) && data.identities.length === 0) {
        return { success: false, error: 'Користувач з таким email вже зареєстрований. Увійдіть у свій акаунт.', alreadyRegistered: true };
      }

      // Confirm email вимкнено — акаунт створюється миттєво з сесією
      const sbUser = data.user;
      const userId = sbUser?.id;
      const displayNameFinal = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.display_name || displayName || email.split('@')[0];

      await _ensureLocalProfile(email, displayNameFinal, userId);
      await _activateLocalProfile(email, userId);

      // Починаємо локальну сесію (signUp з Confirm email OFF повертає сесію)
      const localUser = _findUserByEmail(email);
      _startSession(localUser || { id: userId, email, displayName: displayNameFinal });

      // Синхронізуємо баланс Короликів з таблицею profiles у Supabase
      if (typeof KorolikyService !== 'undefined' && KorolikyService.syncFromSupabase) {
        await KorolikyService.syncFromSupabase();
      }

      return { success: true, userId, user: _publicUser(localUser || { id: userId, email, displayName: displayNameFinal, status: 'active', koroliky: 0 }) };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ── Sandbox реєстрація ────────────────────────────────────────────────────

  async function _sandboxRegister(email, password, displayName) {
    const existing = _findUserByEmail(email);
    if (existing) return { success: false, error: 'Користувач з таким email вже існує' };

    const { hash, salt } = await _hashPassword(password);
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

    const user = {
      id, email,
      displayName: displayName.trim() || email.split('@')[0],
      passwordHash: hash, passwordSalt: salt,
      status: 'unverified',
      koroliky: 0, lastBonusClaimedAt: null,
      createdAt: new Date().toISOString(),
    };

    const users = _getUsers();
    users.push(user);
    _saveUsers(users);

    const otpResult = await _sandboxSendOTP(email, id);
    return { success: true, userId: id, otpSent: otpResult.sent, sandbox: true };
  }

  // ════════════════════════════════════════════════════════════════════════
  // OTP / ПІДТВЕРДЖЕННЯ EMAIL
  // ════════════════════════════════════════════════════════════════════════

  async function resendOTP(email) {
    // ── РЕЖИМ A: Supabase ──────────────────────────────────────────────
    if (_isSupabaseMode()) {
      return await _supabaseResendOTP(email);
    }

    // ── РЕЖИМ B: Sandbox ───────────────────────────────────────────────
    const key = OTP_KEY + '_' + email;
    const existing = JSON.parse(localStorage.getItem(key) || 'null');
    if (existing) {
      const secondsSinceSent = (Date.now() - existing.sentAt) / 1000;
      if (secondsSinceSent < 60) {
        return { success: false, error: `Зачекайте ще ${Math.ceil(60 - secondsSinceSent)} сек перед повторною відправкою` };
      }
    }
    const user = _findUserByEmail(email);
    if (!user) return { success: false, error: 'Користувач не знайдений' };
    const result = await _sandboxSendOTP(email, user.id);
    return { success: true, sandbox: result.sandbox };
  }

  async function _supabaseResendOTP(email) {
    const sb = _getSupabaseClient();
    try {
      // Supabase: повторно надсилає лист підтвердження
      const { error } = await sb.auth.resend({ type: 'signup', email });
      if (error) return { success: false, error: error.message };
      return { success: true, sandbox: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function verifyOTP(email, enteredCode) {
    // ── РЕЖИМ A: Supabase ──────────────────────────────────────────────
    if (_isSupabaseMode()) {
      return await _supabaseVerifyOTP(email, enteredCode);
    }

    // ── РЕЖИМ B: Sandbox ───────────────────────────────────────────────
    return await _sandboxVerifyOTP(email, enteredCode);
  }

  async function _supabaseVerifyOTP(email, token) {
    const sb = _getSupabaseClient();
    try {
      const { data, error } = await sb.auth.verifyOtp({
        email,
        token: String(token).trim(),
        type: 'signup',
      });

      if (error) {
        return { success: false, error: 'Невірний код, спробуйте ще раз' };
      }

      const sbUser = data.user;
      const userId = sbUser?.id;
      const displayName = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.display_name || email.split('@')[0];

      await _activateLocalProfile(email, userId);

      // Починаємо локальну сесію — verifyOtp вже створив сесію у Supabase
      const localUser = _findUserByEmail(email);
      _startSession(localUser || { id: userId, email, displayName });

      // Синхронізуємо баланс Короликів з таблицею profiles у Supabase
      if (typeof KorolikyService !== 'undefined' && KorolikyService.syncFromSupabase) {
        await KorolikyService.syncFromSupabase();
      }

      return { success: true, userId, user: _publicUser(localUser || { id: userId, email, displayName, status: 'active', koroliky: 0 }) };

    } catch (e) {
      return { success: false, error: 'Невірний код, спробуйте ще раз' };
    }
  }

  async function _sandboxVerifyOTP(email, enteredCode) {
    const key = OTP_KEY + '_' + email;
    const data = JSON.parse(localStorage.getItem(key) || 'null');

    if (!data) return { success: false, error: 'Код верифікації не знайдений. Запросіть новий.' };
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(key);
      return { success: false, error: 'Код верифікації застарів (10 хвилин). Запросіть новий.' };
    }
    if (data.attempts >= 5) {
      localStorage.removeItem(key);
      return { success: false, error: 'Забагато невірних спроб. Запросіть новий код.' };
    }
    if (String(enteredCode).trim() !== data.otp) {
      data.attempts++;
      localStorage.setItem(key, JSON.stringify(data));
      return { success: false, error: `Невірний код. Залишилось спроб: ${5 - data.attempts}` };
    }

    localStorage.removeItem(key);
    await _activateLocalProfile(email, data.userId);
    return { success: true, userId: data.userId };
  }

  // ── Sandbox OTP відправка ─────────────────────────────────────────────────

  async function _sandboxSendOTP(email, userId) {
    const otp = _generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const sentAt = Date.now();
    localStorage.setItem(OTP_KEY + '_' + email, JSON.stringify({ email, userId, otp, expiresAt, sentAt, attempts: 0 }));
    console.log(`[AuthService Sandbox] OTP для ${email}: ${otp}`);
    EventBus.emit('auth:otp_sandbox', { email, otp });
    return { sent: true, sandbox: true };
  }

  // ── Локальний профіль (Koroliky, displayName) ─────────────────────────────

  async function _ensureLocalProfile(email, displayName, supabaseUserId) {
    const existing = _findUserByEmail(email);
    if (existing) return;
    const users = _getUsers();
    users.push({
      id: supabaseUserId || `usr_${Date.now()}`,
      email,
      displayName: displayName || email.split('@')[0],
      status: 'unverified',
      koroliky: 0, lastBonusClaimedAt: null,
      createdAt: new Date().toISOString(),
    });
    _saveUsers(users);
  }

  async function _activateLocalProfile(email, supabaseUserId) {
    const users = _getUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) {
      users[idx].status = 'active';
      users[idx].verifiedAt = new Date().toISOString();
      if (!users[idx].koroliky) {
        users[idx].koroliky = 500; // Бонус за реєстрацію
        users[idx].lastBonusClaimedAt = new Date().toISOString();
      }
      if (supabaseUserId) users[idx].id = supabaseUserId;
      _saveUsers(users);
    } else {
      // Профіль ще не створено (наприклад, перший вхід після підтвердження на іншому пристрої)
      const users2 = _getUsers();
      users2.push({
        id: supabaseUserId || `usr_${Date.now()}`,
        email, displayName: email.split('@')[0],
        status: 'active', verifiedAt: new Date().toISOString(),
        koroliky: 500, lastBonusClaimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      _saveUsers(users2);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // ВХІД
  // ════════════════════════════════════════════════════════════════════════

  async function login(email, password) {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return { success: false, error: emailCheck.error };

    // ── РЕЖИМ A: Supabase ──────────────────────────────────────────────
    if (_isSupabaseMode()) {
      return await _supabaseLogin(emailCheck.email, password);
    }

    // ── РЕЖИМ B: Sandbox ───────────────────────────────────────────────
    return await _sandboxLogin(emailCheck.email, password);
  }

  async function _supabaseLogin(email, password) {
    const sb = _getSupabaseClient();
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message?.includes('Email not confirmed')) {
          return { success: false, needVerification: true, email, error: 'Підтвердіть email перед входом' };
        }
        if (error.message?.includes('Invalid login credentials')) {
          return { success: false, error: 'Невірний email або пароль' };
        }
        return { success: false, error: error.message };
      }

      const sbUser = data.user;

      // Не пускаємо в кабінет, доки пошта не підтверджена
      if (!sbUser.email_confirmed_at) {
        return { success: false, needVerification: true, email, error: 'Підтвердіть email перед входом' };
      }

      const displayName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.display_name || email.split('@')[0];
      await _ensureLocalProfile(email, displayName, sbUser.id);
      await _activateLocalProfile(email, sbUser.id);

      const localUser = _findUserByEmail(email);
      _startSession(localUser || { id: sbUser.id, email, displayName });

      // Синхронізуємо баланс Короликів з таблицею profiles у Supabase
      if (typeof KorolikyService !== 'undefined' && KorolikyService.syncFromSupabase) {
        await KorolikyService.syncFromSupabase();
      }

      return { success: true, user: _publicUser(localUser || { id: sbUser.id, email, displayName, status: 'active', koroliky: 0 }) };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function _sandboxLogin(email, password) {
    const user = _findUserByEmail(email);
    if (!user) return { success: false, error: 'Невірний email або пароль' };

    const passwordOk = await _verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!passwordOk) return { success: false, error: 'Невірний email або пароль' };

    if (user.status === 'unverified') {
      return { success: false, needVerification: true, email, error: 'Підтвердіть email перед входом' };
    }
    if (user.status === 'suspended') {
      return { success: false, error: 'Акаунт заблоковано. Зверніться до підтримки.' };
    }

    _startSession(user);
    return { success: true, user: _publicUser(user) };
  }

  // ════════════════════════════════════════════════════════════════════════
  // СЕСІЯ
  // ════════════════════════════════════════════════════════════════════════

  function _startSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      startedAt: new Date().toISOString(),
    }));
  }

  function logout() {
    // Supabase logout
    const sb = _getSupabaseClient();
    if (sb) sb.auth.signOut().catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    EventBus.emit('auth:logout');
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const user = _findUserByEmail(session.email);
    return user ? _publicUser(user) : null;
  }

  function _publicUser(user) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      koroliky: user.koroliky || 0,
      lastBonusClaimedAt: user.lastBonusClaimedAt,
      createdAt: user.createdAt,
      verifiedAt: user.verifiedAt,
    };
  }

  function updateUser(userId, patch) {
    const users = _getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch, updatedAt: new Date().toISOString() };
    _saveUsers(users);
    return _publicUser(users[idx]);
  }

  function getUserById(id) {
    const user = _getUsers().find(u => u.id === id);
    return user ? _publicUser(user) : null;
  }

  function getOTPStatus(email) {
    // У Supabase-режимі нема локального OTP — показуємо лише що лист відправлено
    if (_isSupabaseMode()) {
      return { exists: true, secondsLeft: 600, resendIn: 60, expired: false, sandbox: false };
    }
    const data = JSON.parse(localStorage.getItem(OTP_KEY + '_' + email) || 'null');
    if (!data) return { exists: false };
    const secondsLeft = Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000));
    const resendIn = Math.max(0, Math.ceil(60 - (Date.now() - data.sentAt) / 1000));
    return { exists: true, secondsLeft, resendIn, expired: secondsLeft === 0, sandbox: true };
  }

  return {
    register,
    startRegistration,
    verifyCodeAndRegister,
    resendRegistrationCode,
    login,
    logout,
    verifyOTP,
    resendOTP,
    getSession,
    isLoggedIn,
    getCurrentUser,
    updateUser,
    getUserById,
    validateEmail,
    getOTPStatus,
    isSupabaseMode: _isSupabaseMode,
  };
})();
