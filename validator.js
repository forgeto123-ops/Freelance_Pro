/**
 * Validator — form validation utilities
 */
const Validator = (() => {
  function required(value, fieldName) {
    if (value === null || value === undefined || String(value).trim() === '') {
      return `${fieldName} є обов'язковим полем`;
    }
    return null;
  }

  function positiveNumber(value, fieldName) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      return `${fieldName} має бути невід'ємним числом`;
    }
    return null;
  }

  function positiveNonZero(value, fieldName) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return `${fieldName} має бути більше нуля`;
    }
    return null;
  }

  function email(value, fieldName) {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${fieldName} — невірний формат email`;
    }
    return null;
  }

  function date(value, fieldName) {
    if (value && isNaN(Date.parse(value))) {
      return `${fieldName} — невірний формат дати`;
    }
    return null;
  }

  /**
   * Run multiple rules; returns array of error strings
   */
  function run(rules) {
    return rules.map(([fn, ...args]) => fn(...args)).filter(Boolean);
  }

  /**
   * Show inline error under a field
   */
  function showError(inputEl, message) {
    clearError(inputEl);
    if (!message) return;
    inputEl.classList.add('border-red-500', 'dark:border-red-500');
    const err = document.createElement('p');
    err.className = 'text-red-500 text-xs mt-1 validator-error';
    err.textContent = message;
    inputEl.parentNode.appendChild(err);
  }

  function clearError(inputEl) {
    inputEl.classList.remove('border-red-500', 'dark:border-red-500');
    const prev = inputEl.parentNode?.querySelector('.validator-error');
    if (prev) prev.remove();
  }

  function clearAllErrors(formEl) {
    formEl.querySelectorAll('.validator-error').forEach(e => e.remove());
    formEl.querySelectorAll('.border-red-500').forEach(e => {
      e.classList.remove('border-red-500', 'dark:border-red-500');
    });
  }

  return { required, positiveNumber, positiveNonZero, email, date, run, showError, clearError, clearAllErrors };
})();
