/**
 * CurrencyService — мультивалютність (10 валют) + курси НБУ / ExchangeRate API
 *
 * Підтримувані валюти: UAH, USD, EUR, GBP, PLN, CHF, CAD, AUD, JPY, CZK
 * Кешування курсів: 1 година (localStorage)
 * Джерело: api.exchangerate-api.com (безкоштовний план) або НБУ
 */
const CurrencyService = (() => {

  const CURRENCIES = {
    UAH: { code: 'UAH', symbol: '₴',    name: 'Українська гривня',    flag: '🇺🇦', decimals: 2 },
    USD: { code: 'USD', symbol: '$',    name: 'Долар США',             flag: '🇺🇸', decimals: 2 },
    EUR: { code: 'EUR', symbol: '€',    name: 'Євро',                  flag: '🇪🇺', decimals: 2 },
    GBP: { code: 'GBP', symbol: '£',    name: 'Британський фунт',      flag: '🇬🇧', decimals: 2 },
    PLN: { code: 'PLN', symbol: 'zł',   name: 'Польський злотий',      flag: '🇵🇱', decimals: 2 },
    CHF: { code: 'CHF', symbol: 'CHF',  name: 'Швейцарський франк',    flag: '🇨🇭', decimals: 2 },
    CAD: { code: 'CAD', symbol: 'C$',   name: 'Канадський долар',      flag: '🇨🇦', decimals: 2 },
    AUD: { code: 'AUD', symbol: 'A$',   name: 'Австралійський долар',  flag: '🇦🇺', decimals: 2 },
    JPY: { code: 'JPY', symbol: '¥',    name: 'Японська єна',          flag: '🇯🇵', decimals: 0 },
    CZK: { code: 'CZK', symbol: 'Kč',   name: 'Чеська крона',          flag: '🇨🇿', decimals: 2 },
  };

  const CACHE_KEY    = 'saas_exchange_rates';
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 година

  // Fallback-курси відносно UAH (оновлені вручну, використовуються при відсутності мережі)
  const FALLBACK_RATES_TO_UAH = {
    UAH: 1,
    USD: 41.5,
    EUR: 44.8,
    GBP: 52.3,
    PLN: 10.4,
    CHF: 46.2,
    CAD: 30.5,
    AUD: 27.1,
    JPY: 0.275,
    CZK: 1.85,
  };

  // ─── Курси валют ──────────────────────────────────────────────────────────

  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { rates, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > CACHE_TTL_MS) return null;
      return rates;
    } catch { return null; }
  }

  function _saveCache(rates) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
  }

  /**
   * Завантажує актуальні курси. Намагається НБУ API, потім ExchangeRate API, потім fallback.
   * @returns {Promise<{ rates: object, source: string }>}
   */
  async function fetchRates() {
    const cached = getCached();
    if (cached) return { rates: cached, source: 'cache' };

    // 1. НБУ API (безкоштовно, без ключа, тільки UAH-based)
    try {
      const resp = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json', {
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const rates = { UAH: 1 };
        data.forEach(item => {
          const code = item.cc;
          if (CURRENCIES[code]) {
            rates[code] = parseFloat((item.rate / (item.units || 1)).toFixed(6));
          }
        });
        // JPY у НБУ може бути за 100 одиниць — вже враховано через units
        _saveCache(rates);
        return { rates, source: 'nbu' };
      }
    } catch { /* fallthrough */ }

    // 2. ExchangeRate-API (потрібен ключ у .env, але є free tier)
    const apiKey = localStorage.getItem('saas_exchangerate_api_key');
    if (apiKey) {
      try {
        const resp = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/UAH`, {
          signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.result === 'success') {
            const rates = { UAH: 1 };
            Object.keys(CURRENCIES).forEach(code => {
              if (data.conversion_rates[code]) {
                rates[code] = parseFloat((1 / data.conversion_rates[code]).toFixed(6));
              }
            });
            _saveCache(rates);
            return { rates, source: 'exchangerate-api' };
          }
        }
      } catch { /* fallthrough */ }
    }

    // 3. Fallback
    _saveCache(FALLBACK_RATES_TO_UAH);
    return { rates: FALLBACK_RATES_TO_UAH, source: 'fallback' };
  }

  /**
   * Конвертує суму з однієї валюти в іншу (через UAH як базову).
   */
  async function convert(amount, fromCode, toCode) {
    if (fromCode === toCode) return amount;
    const { rates } = await fetchRates();
    const fromRate = rates[fromCode] || FALLBACK_RATES_TO_UAH[fromCode] || 1;
    const toRate   = rates[toCode]   || FALLBACK_RATES_TO_UAH[toCode]   || 1;
    return parseFloat((amount * fromRate / toRate).toFixed(CURRENCIES[toCode]?.decimals ?? 2));
  }

  /**
   * Форматує суму з символом валюти.
   */
  function format(amount, currencyCode) {
    const cur = CURRENCIES[currencyCode];
    if (!cur) return String(amount);
    const num = Number(amount).toFixed(cur.decimals);
    // JPY без десяткових
    if (cur.decimals === 0) return `${cur.symbol}${Math.round(amount)}`;
    return `${cur.symbol}${num}`;
  }

  function getAll() { return CURRENCIES; }
  function getByCode(code) { return CURRENCIES[code] || null; }
  function getCodes() { return Object.keys(CURRENCIES); }

  /**
   * Рядок для select-поля: "🇺🇦 UAH — Українська гривня"
   */
  function getSelectOptions(selectedCode = 'UAH') {
    return Object.values(CURRENCIES).map(c =>
      `<option value="${c.code}" ${c.code === selectedCode ? 'selected' : ''}>${c.flag} ${c.code} — ${c.name}</option>`
    ).join('');
  }

  /**
   * Рендерить мінітаблицю курсів (для відображення у налаштуваннях / інвойсах).
   * @returns {Promise<string>} HTML
   */
  async function renderRatesWidget() {
    const { rates, source } = await fetchRates();
    const sourceLabels = { nbu: '🏦 НБУ', 'exchangerate-api': '🌐 ExchangeRate API', cache: '📋 Кеш', fallback: '⚠️ Резервні курси' };
    const sourceLabel = sourceLabels[source] || source;

    const rows = Object.values(CURRENCIES)
      .filter(c => c.code !== 'UAH')
      .map(c => {
        const rate = rates[c.code];
        return `
          <tr class="border-b border-gray-100 dark:border-gray-700 last:border-0">
            <td class="py-2 pr-3 text-sm">${c.flag} <span class="font-semibold">${c.code}</span></td>
            <td class="py-2 pr-3 text-sm text-gray-500 dark:text-gray-400">${c.name}</td>
            <td class="py-2 text-right font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              ${rate ? `₴ ${rate.toFixed(c.code === 'JPY' ? 3 : 2)}` : '—'}
            </td>
            <td class="py-2 pl-3 text-right text-xs text-gray-400">${c.symbol}</td>
          </tr>
        `;
      }).join('');

    return `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Курс до UAH</span>
          <span class="text-xs text-gray-400">${sourceLabel}</span>
        </div>
        <table class="w-full">${rows}</table>
        <p class="text-xs text-gray-400 mt-2">Оновлено: ${new Date().toLocaleTimeString('uk-UA')}</p>
      </div>
    `;
  }

  return {
    getAll,
    getByCode,
    getCodes,
    getSelectOptions,
    fetchRates,
    convert,
    format,
    renderRatesWidget,
  };
})();
