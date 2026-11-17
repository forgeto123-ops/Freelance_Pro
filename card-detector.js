/**
 * CardDetector — визначення платіжної системи за BIN-кодом
 *
 * Підтримувані типи (10+):
 *  1. Visa
 *  2. Mastercard
 *  3. Maestro
 *  4. American Express (Amex)
 *  5. UnionPay
 *  6. Discover
 *  7. JCB
 *  8. Diners Club
 *  9. Простір (NPS Prostir, Україна)
 * 10. Google Pay / Apple Pay (токенізовані)
 * 11. МИР (Росія — блокується з повідомленням)
 */
const CardDetector = (() => {

  // Іконки у SVG / Unicode (мінімалістичні)
  const ICONS = {
    visa:        `<svg viewBox="0 0 48 16" class="h-5" fill="none"><text x="0" y="13" font-size="14" font-weight="bold" font-family="Arial" fill="#1A1F71">VISA</text></svg>`,
    mastercard:  `<svg viewBox="0 0 38 24" class="h-5"><circle cx="13" cy="12" r="12" fill="#EB001B"/><circle cx="25" cy="12" r="12" fill="#F79E1B"/><path d="M19 4.9A12 12 0 0119 19.1 12 12 0 0119 4.9z" fill="#FF5F00"/></svg>`,
    maestro:     `<svg viewBox="0 0 38 24" class="h-5"><circle cx="13" cy="12" r="12" fill="#6F6F6F"/><circle cx="25" cy="12" r="12" fill="#E20025" opacity=".8"/></svg>`,
    amex:        `<svg viewBox="0 0 48 16" class="h-5" fill="none"><rect width="48" height="16" rx="3" fill="#2E77BC"/><text x="4" y="12" font-size="9" font-weight="bold" font-family="Arial" fill="white">AMEX</text></svg>`,
    unionpay:    `<svg viewBox="0 0 48 16" class="h-5"><rect width="48" height="16" rx="3" fill="#E21836"/><text x="4" y="12" font-size="8" font-weight="bold" font-family="Arial" fill="white">UnionPay</text></svg>`,
    discover:    `<svg viewBox="0 0 48 16" class="h-5"><rect width="48" height="16" rx="3" fill="#FF6600"/><text x="4" y="12" font-size="8" font-weight="bold" font-family="Arial" fill="white">Discover</text></svg>`,
    jcb:         `<svg viewBox="0 0 48 16" class="h-5"><rect width="48" height="16" rx="3" fill="#003087"/><text x="4" y="12" font-size="10" font-weight="bold" font-family="Arial" fill="white">JCB</text></svg>`,
    diners:      `<svg viewBox="0 0 48 16" class="h-5"><rect width="48" height="16" rx="3" fill="#2B2B2B"/><text x="4" y="12" font-size="7" font-weight="bold" font-family="Arial" fill="white">Diners Club</text></svg>`,
    prostir:     `<svg viewBox="0 0 48 16" class="h-5"><rect width="48" height="16" rx="3" fill="#005BBB"/><text x="4" y="12" font-size="8" font-weight="bold" font-family="Arial" fill="#FFD500">ПРОСТІР</text></svg>`,
    googlepay:   `<svg viewBox="0 0 48 16" class="h-5" fill="none"><text x="0" y="12" font-size="10" font-family="Arial">G Pay</text></svg>`,
    applepay:    `<svg viewBox="0 0 48 16" class="h-5" fill="none"><text x="0" y="12" font-size="10" font-family="Arial"> Pay</text></svg>`,
    mir:         `<svg viewBox="0 0 48 16" class="h-5"><rect width="48" height="16" rx="3" fill="#4CAF50"/><text x="4" y="12" font-size="10" font-weight="bold" font-family="Arial" fill="white">МИР</text></svg>`,
    unknown:     `<svg viewBox="0 0 48 16" class="h-5" fill="none"><rect width="48" height="16" rx="3" fill="#E5E7EB"/></svg>`,
  };

  /**
   * BIN-правила (перевіряються у порядку специфічності — від більш специфічного до менш).
   * Кожне правило: { type, name, patterns: RegExp[], lengths: number[], icon }
   */
  const RULES = [
    {
      type: 'amex',
      name: 'American Express',
      patterns: [/^3[47]/],
      lengths: [15],
      cvvLength: 4,
      icon: ICONS.amex,
    },
    {
      type: 'diners',
      name: 'Diners Club',
      patterns: [/^3(?:0[0-5]|[68])/],
      lengths: [14, 16, 19],
      cvvLength: 3,
      icon: ICONS.diners,
    },
    {
      type: 'jcb',
      name: 'JCB',
      patterns: [/^(?:2131|1800|35\d{3})/],
      lengths: [16, 17, 18, 19],
      cvvLength: 3,
      icon: ICONS.jcb,
    },
    {
      type: 'discover',
      name: 'Discover',
      patterns: [/^6(?:011|22(?:1(?:2[6-9]|[3-9]\d)|[2-8]\d{2}|9(?:[01]\d|2[0-5]))|4[4-9]\d|5\d{2})/],
      lengths: [16, 17, 18, 19],
      cvvLength: 3,
      icon: ICONS.discover,
    },
    {
      type: 'maestro',
      name: 'Maestro',
      // Maestro перед Mastercard (більш специфічні BIN)
      patterns: [/^(?:5018|5020|5038|5893|6304|6759|676[1-3])/],
      lengths: [12, 13, 14, 15, 16, 17, 18, 19],
      cvvLength: 3,
      icon: ICONS.maestro,
    },
    {
      type: 'mastercard',
      name: 'Mastercard',
      patterns: [/^(?:5[1-5]\d{4}|2(?:2[2-9][1-9]|2[3-9]\d\d|[3-6]\d{3}|7[01]\d\d|720\d))/],
      lengths: [16],
      cvvLength: 3,
      icon: ICONS.mastercard,
    },
    {
      type: 'unionpay',
      name: 'UnionPay',
      patterns: [/^62/, /^81/],
      lengths: [16, 17, 18, 19],
      cvvLength: 3,
      icon: ICONS.unionpay,
    },
    {
      type: 'prostir',
      name: 'Простір (NPS)',
      // Простір: BIN-діапазони українських карток, що не є Visa/MC
      patterns: [/^9[0-9]/, /^60400[1-9]/, /^60401/, /^604018/, /^604020/],
      lengths: [16],
      cvvLength: 3,
      icon: ICONS.prostir,
    },
    {
      type: 'mir',
      name: 'МИР (заблоковано)',
      patterns: [/^220[0-4]/],
      lengths: [16],
      cvvLength: 3,
      icon: ICONS.mir,
      blocked: true,
    },
    {
      type: 'visa',
      name: 'Visa',
      patterns: [/^4/],
      lengths: [13, 16, 19],
      cvvLength: 3,
      icon: ICONS.visa,
    },
    {
      type: 'googlepay',
      name: 'Google Pay',
      patterns: [], // Визначається за токеном, не BIN
      lengths: [],
      cvvLength: 0,
      icon: ICONS.googlepay,
      tokenized: true,
    },
    {
      type: 'applepay',
      name: 'Apple Pay',
      patterns: [],
      lengths: [],
      cvvLength: 0,
      icon: ICONS.applepay,
      tokenized: true,
    },
  ];

  /**
   * Визначає тип картки за BIN-кодом.
   * @param {string} number — номер картки (може містити пробіли)
   * @returns {{ type, name, icon, cvvLength, blocked, lengths } | null}
   */
  function detect(number) {
    const digits = String(number).replace(/\D/g, '');
    if (!digits) return null;

    for (const rule of RULES) {
      if (rule.tokenized) continue;
      for (const pattern of rule.patterns) {
        if (pattern.test(digits)) {
          return {
            type:      rule.type,
            name:      rule.name,
            icon:      rule.icon,
            cvvLength: rule.cvvLength,
            lengths:   rule.lengths,
            blocked:   rule.blocked || false,
          };
        }
      }
    }

    return { type: 'unknown', name: 'Невідома картка', icon: ICONS.unknown, cvvLength: 3, lengths: [16], blocked: false };
  }

  /**
   * Алгоритм Луна.
   */
  function luhnCheck(number) {
    const digits = String(number).replace(/\D/g, '');
    if (!digits || digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i]);
      if (shouldDouble) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  /**
   * Форматує номер картки з пробілами (Amex: 4-6-5, решта: 4-4-4-4).
   */
  function format(number) {
    const digits = String(number).replace(/\D/g, '');
    const card = detect(digits);
    if (card?.type === 'amex') {
      return digits.replace(/(\d{4})(\d{1,6})?(\d{1,5})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
    }
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  /**
   * Маскування: показує перші 6 та останні 4 цифри.
   */
  function mask(number) {
    const digits = String(number).replace(/\D/g, '');
    if (digits.length < 10) return number;
    const first6 = digits.slice(0, 6);
    const last4  = digits.slice(-4);
    const mid    = '•'.repeat(digits.length - 10);
    return (first6 + mid + last4).replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Рендерить UI-поле номера картки з автовизначенням типу.
   */
  function renderCardInput(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="relative">
        <input
          id="card-number-input"
          type="text"
          inputmode="numeric"
          autocomplete="cc-number"
          maxlength="23"
          class="input font-mono pr-20"
          placeholder="0000 0000 0000 0000"
        />
        <div id="card-type-badge" class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          ${ICONS.unknown}
        </div>
      </div>
      <div id="card-error" class="text-xs text-red-500 mt-1 hidden"></div>
      <div id="card-blocked-msg" class="text-xs text-red-600 font-semibold mt-1 hidden">
        ⛔ Картки МИР не приймаються
      </div>
    `;

    const input = document.getElementById('card-number-input');
    const badge = document.getElementById('card-type-badge');
    const errEl = document.getElementById('card-error');
    const blockedEl = document.getElementById('card-blocked-msg');

    input.addEventListener('input', e => {
      let val = e.target.value.replace(/\D/g, '');
      const card = detect(val);

      // Форматування
      e.target.value = format(val);

      // Оновлюємо бейдж
      badge.innerHTML = card ? card.icon : ICONS.unknown;

      // Заблокована картка
      if (card?.blocked) {
        blockedEl.classList.remove('hidden');
        errEl.classList.add('hidden');
        return;
      } else {
        blockedEl.classList.add('hidden');
      }

      // Луна-валідація (тільки якщо номер повний)
      if (card?.lengths?.includes(val.length)) {
        const valid = luhnCheck(val);
        if (!valid) {
          errEl.textContent = '❌ Невірний номер картки';
          errEl.classList.remove('hidden');
        } else {
          errEl.classList.add('hidden');
          if (options.onValid) options.onValid({ number: val, card });
        }
      } else {
        errEl.classList.add('hidden');
      }

      if (options.onChange) options.onChange({ number: val, card, formatted: e.target.value });
    });
  }

  return {
    detect,
    luhnCheck,
    format,
    mask,
    renderCardInput,
    ICONS,
  };
})();
