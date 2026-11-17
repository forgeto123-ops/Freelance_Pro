/**
 * BankAccountsService
 * Управління банківськими реквізитами: CRUD, валідація, основний рахунок.
 *
 * Зберігання: localStorage через Store (колекція 'bank_accounts').
 * При підключеному Supabase — синхронізується автоматично через SupabaseService.
 *
 * Структура запису:
 * {
 *   id, bankName, recipientName, iban, cardNumber (masked),
 *   swiftBic, currency, paymentPurpose, isPrimary, createdAt, updatedAt
 * }
 */
const BankAccountsService = (() => {
  const COLLECTION = 'bank_accounts';

  // ─── Валідація ─────────────────────────────────────────────────────────────

  /**
   * Валідує IBAN (базовий ISO 13616 формат + mod-97 check).
   * Підтримує UAH (UA, 29 символів), EUR/USD (міжнародні формати).
   * @param {string} iban
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateIBAN(iban) {
    if (!iban) return { valid: false, error: 'IBAN не може бути порожнім' };

    const cleaned = iban.replace(/\s+/g, '').toUpperCase();

    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
      return { valid: false, error: 'Невірний формат IBAN (має починатися з коду країни, наприклад UA29…)' };
    }

    // Довжини за країнами (неповний список, основні для UA, EU)
    const lengthMap = {
      UA: 29, DE: 22, GB: 22, PL: 28, CZ: 24, SK: 24,
      AT: 20, FR: 27, IT: 27, NL: 18, BE: 16, SE: 24,
      CH: 21, US: 0, // US не має IBAN
    };
    const country = cleaned.slice(0, 2);
    const expectedLen = lengthMap[country];
    if (expectedLen && cleaned.length !== expectedLen) {
      return { valid: false, error: `IBAN для ${country} має містити ${expectedLen} символів (зараз ${cleaned.length})` };
    }

    // MOD-97 перевірка
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    const numericStr = rearranged.split('').map(c => {
      const code = c.charCodeAt(0);
      return code >= 65 ? String(code - 55) : c;
    }).join('');

    let remainder = 0;
    for (let i = 0; i < numericStr.length; i++) {
      remainder = (remainder * 10 + parseInt(numericStr[i])) % 97;
    }

    if (remainder !== 1) {
      return { valid: false, error: 'IBAN не пройшов перевірку контрольної суми (mod-97)' };
    }

    return { valid: true };
  }

  /**
   * Алгоритм Луна для перевірки номера картки.
   * @param {string} number — лише цифри (без пробілів)
   * @returns {boolean}
   */
  function luhnCheck(number) {
    const digits = String(number).replace(/\D/g, '');
    if (!digits || digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i]);
      if (shouldDouble) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  /**
   * Маскує номер картки: показує перші 6 та останні 4 цифри.
   * @param {string} number
   * @returns {string}  "1234 56•• •••• 7890"
   */
  function maskCardNumber(number) {
    const digits = String(number).replace(/\D/g, '');
    if (digits.length < 13) return number;
    const first6 = digits.slice(0, 6);
    const last4 = digits.slice(-4);
    const masked = first6 + '•'.repeat(digits.length - 10) + last4;
    // Розбиваємо по 4
    return masked.match(/.{1,4}/g).join(' ');
  }

  /**
   * Валідує SWIFT/BIC код (8 або 11 символів).
   * @param {string} swift
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateSWIFT(swift) {
    if (!swift) return { valid: true }; // SWIFT необов'язковий
    const cleaned = swift.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
      return { valid: false, error: 'Невірний формат SWIFT/BIC (наприклад: PBANUA2X або PBANUA2XXXX)' };
    }
    return { valid: true };
  }

  /**
   * Валідує всі поля реквізиту.
   * @param {object} data
   * @returns {{ valid: boolean, errors: object }}
   */
  function validateAccount(data) {
    const errors = {};

    if (!data.bankName?.trim()) errors.bankName = 'Назва банку обов\'язкова';
    if (!data.recipientName?.trim()) errors.recipientName = 'Ім\'я отримувача обов\'язкове';

    const ibanResult = validateIBAN(data.iban);
    if (!ibanResult.valid) errors.iban = ibanResult.error;

    if (data.cardNumber?.replace(/\D/g, '')) {
      const digits = data.cardNumber.replace(/\D/g, '');
      if (!luhnCheck(digits)) errors.cardNumber = 'Невірний номер картки (алгоритм Луна)';
    }

    const swiftResult = validateSWIFT(data.swiftBic);
    if (!swiftResult.valid) errors.swiftBic = swiftResult.error;

    if (!['UAH', 'USD', 'EUR', 'GBP', 'PLN', 'CHF', 'CAD', 'AUD', 'JPY', 'CZK'].includes(data.currency)) {
      errors.currency = 'Оберіть валюту рахунку';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  function getAll() {
    return Store.getAll(COLLECTION);
  }

  function getById(id) {
    return Store.getById(COLLECTION, id);
  }

  /**
   * Повертає рахунки за валютою.
   * @param {string} currency — 'UAH' | 'USD' | 'EUR'
   */
  function getByCurrency(currency) {
    return getAll().filter(a => a.currency === currency);
  }

  /**
   * Повертає основний рахунок для валюти.
   * @param {string} currency
   * @returns {object|null}
   */
  function getPrimary(currency) {
    const accounts = getByCurrency(currency);
    return accounts.find(a => a.isPrimary) || accounts[0] || null;
  }

  /**
   * Зберігає новий рахунок.
   * @param {object} data
   * @returns {{ success: boolean, item?: object, errors?: object }}
   */
  function save(data) {
    const { valid, errors } = validateAccount(data);
    if (!valid) return { success: false, errors };

    const ibanClean = data.iban.replace(/\s+/g, '').toUpperCase();
    const cardDigits = data.cardNumber ? data.cardNumber.replace(/\D/g, '') : '';

    const item = {
      bankName: data.bankName.trim(),
      recipientName: data.recipientName.trim(),
      iban: ibanClean,
      cardNumber: cardDigits ? maskCardNumber(cardDigits) : '',
      cardNumberRaw: cardDigits ? (cardDigits.slice(0, 6) + '******' + cardDigits.slice(-4)) : '', // безпечне зберігання
      swiftBic: data.swiftBic ? data.swiftBic.replace(/\s+/g, '').toUpperCase() : '',
      currency: data.currency,
      paymentPurpose: data.paymentPurpose?.trim() || '',
      isPrimary: data.isPrimary || false,
    };

    // Якщо встановлено як основний — знімаємо прапор з інших тієї ж валюти
    if (item.isPrimary) {
      _clearPrimaryForCurrency(item.currency);
    } else {
      // Якщо це перший рахунок цієї валюти — автоматично робимо основним
      const existing = getByCurrency(item.currency);
      if (existing.length === 0) item.isPrimary = true;
    }

    const saved = Store.save(COLLECTION, item);

    // Синхронізація з Supabase якщо підключено
    if (typeof SupabaseService !== 'undefined' && SupabaseService.isConnected()) {
      SupabaseService.syncToSupabase(COLLECTION).catch(() => {});
    }

    return { success: true, item: saved };
  }

  /**
   * Оновлює існуючий рахунок.
   */
  function update(id, data) {
    const { valid, errors } = validateAccount(data);
    if (!valid) return { success: false, errors };

    const ibanClean = data.iban.replace(/\s+/g, '').toUpperCase();
    const cardDigits = data.cardNumber ? data.cardNumber.replace(/\D/g, '') : '';

    // Не оновлюємо вже маскований номер якщо не змінився
    const existing = getById(id);
    const isNewCard = cardDigits && !data.cardNumber.includes('•');

    const patch = {
      bankName: data.bankName.trim(),
      recipientName: data.recipientName.trim(),
      iban: ibanClean,
      cardNumber: isNewCard ? maskCardNumber(cardDigits) : (existing?.cardNumber || ''),
      cardNumberRaw: isNewCard ? (cardDigits.slice(0, 6) + '******' + cardDigits.slice(-4)) : (existing?.cardNumberRaw || ''),
      swiftBic: data.swiftBic ? data.swiftBic.replace(/\s+/g, '').toUpperCase() : '',
      currency: data.currency,
      paymentPurpose: data.paymentPurpose?.trim() || '',
      isPrimary: data.isPrimary || false,
    };

    if (patch.isPrimary) {
      _clearPrimaryForCurrency(patch.currency, id);
    }

    const updated = Store.update(COLLECTION, id, patch);

    if (typeof SupabaseService !== 'undefined' && SupabaseService.isConnected()) {
      SupabaseService.syncToSupabase(COLLECTION).catch(() => {});
    }

    return { success: true, item: updated };
  }

  function remove(id) {
    Store.remove(COLLECTION, id);
  }

  /**
   * Встановлює рахунок як основний для своєї валюти.
   */
  function setPrimary(id) {
    const account = getById(id);
    if (!account) return;
    _clearPrimaryForCurrency(account.currency, id);
    Store.update(COLLECTION, id, { isPrimary: true });
  }

  function _clearPrimaryForCurrency(currency, exceptId = null) {
    getByCurrency(currency).forEach(a => {
      if (a.id !== exceptId && a.isPrimary) {
        Store.update(COLLECTION, a.id, { isPrimary: false });
      }
    });
  }

  // ─── Формат для відображення / копіювання ──────────────────────────────────

  /**
   * Форматує реквізити у текстовий блок для копіювання.
   * @param {object} account
   * @returns {string}
   */
  function formatForCopy(account) {
    if (!account) return '';
    const lines = [
      `Банк: ${account.bankName}`,
      `Отримувач: ${account.recipientName}`,
      `IBAN: ${_formatIBAN(account.iban)}`,
    ];
    if (account.cardNumber) lines.push(`Картка: ${account.cardNumber}`);
    if (account.swiftBic) lines.push(`SWIFT/BIC: ${account.swiftBic}`);
    lines.push(`Валюта: ${account.currency}`);
    if (account.paymentPurpose) lines.push(`Призначення: ${account.paymentPurpose}`);
    return lines.join('\n');
  }

  /**
   * Форматує IBAN з пробілами кожні 4 символи.
   * @param {string} iban
   * @returns {string}
   */
  function _formatIBAN(iban) {
    return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Генерує URI для QR-коду оплати (спрощений BCD формат).
   * @param {object} account
   * @param {number} amount
   * @param {string} purpose
   * @returns {string}
   */
  function generatePaymentQRData(account, amount = 0, purpose = '') {
    if (!account) return '';
    // BCD (EPC QR) формат для EUR/UAH переказів
    const lines = [
      'BCD',          // Service Tag
      '002',          // Version
      '1',            // Encoding: UTF-8
      'SCT',          // Identification
      account.swiftBic || '',       // BIC
      account.recipientName,        // Name
      account.iban,                 // IBAN
      `${account.currency}${amount > 0 ? amount.toFixed(2) : ''}`, // Amount
      '',             // Purpose
      '',             // Remittance (reference)
      purpose || account.paymentPurpose || '', // Unstructured remittance
    ];
    return lines.join('\n');
  }

  return {
    getAll,
    getById,
    getByCurrency,
    getPrimary,
    save,
    update,
    remove,
    setPrimary,
    validateIBAN,
    validateSWIFT,
    luhnCheck,
    maskCardNumber,
    validateAccount,
    formatForCopy,
    generatePaymentQRData,
  };
})();
