/**
 * app.js — Main application entry point
 * Initializes Router, sets up event listeners, seeds demo data on first load
 */

const Router = (() => {
  const ROUTES = {
    dashboard:    () => DashboardPage.render(),
    invoices:     () => InvoicesPage.render(),
    expenses:     () => ExpensesPage.render(),
    clients:      () => ClientsPage.render(),
    projects:     () => ProjectsPage.render(),
    deals:        () => DealsPage.render(),
    activity:     () => ActivityPage.render(),
    'ai-assistant': () => AIAssistant.render(),
    portal:       () => PortalPage.render(),
    settings:     () => SettingsPage.render(),
    legal:        () => LegalPage.render(),
  };

  let _current = 'dashboard';

  function getCurrent() { return _current; }

  function navigate(route) {
    if (!ROUTES[route]) route = 'dashboard';
    _current = route;
    _updateHash(route);
    _render();
  }

  function _updateHash(route) {
    if (location.hash !== '#' + route) {
      history.replaceState(null, '', '#' + route);
    }
  }

  function _render() {
    Sidebar.render();
    Topbar.render();
    const fn = ROUTES[_current];
    if (fn) {
      try {
        fn();
        // Застосовуємо переклади після рендеру сторінки
        I18nService.applyTranslations(document.getElementById('content'));
        I18nService.applyTranslations(document.getElementById('sidebar'));
      } catch (e) { console.error('Page render error:', e); _renderError(e); }
    }
  }

  function _renderError(e) {
    document.getElementById('content').innerHTML = `
      <div class="card text-center py-16">
        <div class="text-6xl mb-4">⚠️</div>
        <p class="text-red-600 dark:text-red-400 font-medium">Помилка завантаження сторінки</p>
        <p class="text-sm text-gray-500 mt-1">${e.message}</p>
        <button onclick="Router.navigate('dashboard')" class="btn-primary mt-4">На головну</button>
      </div>
    `;
  }

  function init() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    _current = ROUTES[hash] ? hash : 'dashboard';

    window.addEventListener('hashchange', () => {
      const newRoute = location.hash.replace('#', '') || 'dashboard';
      if (ROUTES[newRoute]) {
        _current = newRoute;
        _render();
      }
    });

    // Navigation clicks
    document.addEventListener('click', e => {
      const link = e.target.closest('[data-route]');
      if (link) {
        e.preventDefault();
        navigate(link.dataset.route);
        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
          sidebar.classList.add('-translate-x-full');
          overlay?.classList.add('hidden');
        }
      }
    });

    // Overlay click closes sidebar
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.add('-translate-x-full');
      document.getElementById('sidebar-overlay')?.classList.add('hidden');
    });

    // Dashboard refresh on data change
    EventBus.on('data:changed', () => {
      Topbar.render();
      if (_current === 'dashboard') DashboardPage.render();
    });

    // Re-render UI when language changes
    EventBus.on('i18n:changed', () => {
      _render();
    });

    EventBus.on('notifications:new', () => {
      Topbar.render();
    });

    EventBus.on('supabase:status', () => {
      Topbar.render();
    });

    _render();
  }

  return { getCurrent, navigate, init };
})();

// ============================================================
// Demo data seeding — runs only once on first launch
// ============================================================
function seedDemoData() {
  if (localStorage.getItem('saas_seeded')) return;

  // Clients
  const c1 = Store.save('clients', { name: 'Олена Сидоренко', email: 'olena@example.com', phone: '+380 50 123 4567', company: 'Digital Studio', address: 'вул. Хрещатик 10, Київ', taxId: '34567890', notes: 'Постійний клієнт, платить вчасно' });
  const c2 = Store.save('clients', { name: 'Михайло Коваль', email: 'mykhailo@startup.ua', phone: '+380 67 987 6543', company: 'TechStart UA', address: 'пр. Науки 5, Харків', taxId: '78901234' });
  const c3 = Store.save('clients', { name: 'Анна Бондаренко', email: 'anna@design.com', phone: '+380 73 456 7890', company: '', notes: 'Фрілансер, дизайн проєкти' });

  // Projects
  Store.save('projects', { name: 'Редизайн сайту', clientId: c1.id, status: 'in-progress', deadline: _futureDate(14), budget: 45000, description: 'Повний редизайн корпоративного сайту' });
  Store.save('projects', { name: 'Мобільний застосунок', clientId: c2.id, status: 'review', deadline: _futureDate(5), budget: 120000, description: 'iOS та Android додаток для стартапу' });
  Store.save('projects', { name: 'Брендинг та логотип', clientId: c3.id, status: 'done', deadline: _futureDate(-10), budget: 15000, description: 'Розробка фірмового стилю' });
  Store.save('projects', { name: 'SEO оптимізація', clientId: c1.id, status: 'in-progress', deadline: _futureDate(30), budget: 8000 });

  // Invoices
  const inv1 = Store.save('invoices', { number: '0001', clientId: c1.id, issueDate: _pastDate(45), dueDate: _pastDate(15), currency: 'UAH', vatRate: 20, discount: 0, items: [{ description: 'Розробка UI/UX дизайну', qty: 1, price: 25000 }, { description: 'Верстка HTML/CSS', qty: 1, price: 15000 }], subtotal: 40000, discountAmt: 0, vatAmt: 8000, total: 48000, status: 'paid', notes: 'Дякуємо за співпрацю!' });
  const inv2 = Store.save('invoices', { number: '0002', clientId: c2.id, issueDate: _pastDate(20), dueDate: _futureDate(10), currency: 'UAH', vatRate: 0, discount: 10, items: [{ description: 'Розробка мобільного застосунку (аванс)', qty: 1, price: 60000 }], subtotal: 60000, discountAmt: 6000, vatAmt: 0, total: 54000, status: 'sent', notes: '' });
  const inv3 = Store.save('invoices', { number: '0003', clientId: c3.id, issueDate: _pastDate(60), dueDate: _pastDate(30), currency: 'UAH', vatRate: 0, discount: 0, items: [{ description: 'Розробка логотипу', qty: 1, price: 8000 }, { description: 'Брендбук', qty: 1, price: 5000 }], subtotal: 13000, discountAmt: 0, vatAmt: 0, total: 13000, status: 'paid' });
  Store.save('invoices', { number: '0004', clientId: c1.id, issueDate: _pastDate(5), dueDate: _futureDate(25), currency: 'UAH', vatRate: 20, discount: 5, items: [{ description: 'SEO аудит сайту', qty: 1, price: 5000 }, { description: 'Технічна оптимізація', qty: 3, price: 1200 }], subtotal: 8600, discountAmt: 430, vatAmt: 1634, total: 9804, status: 'draft' });

  // Expenses
  const expData = [
    { type: 'expense', description: 'Adobe Creative Cloud', amount: 1890, date: _pastDate(5), category: 'Програмне забезпечення' },
    { type: 'expense', description: 'Оренда ноутбуку MacBook Pro', amount: 3500, date: _pastDate(10), category: 'Обладнання' },
    { type: 'expense', description: 'Google Workspace', amount: 350, date: _pastDate(15), category: 'Програмне забезпечення' },
    { type: 'expense', description: 'Курс з UX Design на Coursera', amount: 2200, date: _pastDate(20), category: 'Навчання' },
    { type: 'expense', description: 'Реклама в Facebook', amount: 4500, date: _pastDate(25), category: 'Маркетинг' },
    { type: 'income', description: 'Оплата від Digital Studio', amount: 48000, date: _pastDate(14), category: 'Оплата послуг' },
    { type: 'income', description: 'Оплата від Anna Бондаренко', amount: 13000, date: _pastDate(28), category: 'Оплата послуг' },
    { type: 'expense', description: 'Мобільний зв\'язок', amount: 450, date: _pastDate(2), category: 'Комунікації' },
    { type: 'expense', description: 'Figma Professional', amount: 1200, date: _pastDate(35), category: 'Програмне забезпечення' },
    { type: 'income', description: 'Консультація з бізнес-аналітики', amount: 5000, date: _pastDate(7), category: 'Консультації' },
  ];
  expData.forEach(e => Store.save('expenses', e));

  // Notifications
  Notifications.add(`Вітаємо в FreelanceHub Pro! Демо-дані завантажено.`, 'telegram');
  Notifications.add(`Інвойс #0001 оплачено клієнтом Digital Studio`, 'email');
  Notifications.add(`Проєкт "Мобільний застосунок" на затвердженні`, 'telegram');

  // === NEW: Deals ===
  Store.save('deals', { title: 'Редизайн корпоративного порталу', clientId: c1.id, amount: 85000, stage: 'proposal', probability: 60, expectedClose: _futureDate(20), notes: 'Клієнт розглядає 2 підрядники' });
  Store.save('deals', { title: 'Мобільний застосунок v2', clientId: c2.id, amount: 150000, stage: 'negotiation', probability: 75, expectedClose: _futureDate(35), notes: 'Погодили обсяг, обговорюємо ціну' });
  Store.save('deals', { title: 'Фірмовий стиль + сайт-візитка', clientId: c3.id, amount: 22000, stage: 'won', probability: 100, expectedClose: _pastDate(5), notes: '' });
  Store.save('deals', { title: 'SEO + контент-маркетинг', clientId: c1.id, amount: 18000, stage: 'contacted', probability: 25, expectedClose: _futureDate(60), notes: 'Перший дзвінок пройшов добре' });
  Store.save('deals', { title: 'Новий лід: e-commerce', clientId: null, amount: 55000, stage: 'new', probability: 10, notes: 'Звернулись через сайт' });

  // === NEW: Activity logs ===
  Store.save('activity_logs', { clientId: c1.id, type: 'call', title: 'Вступний дзвінок — обговорили редизайн сайту', body: 'Клієнт хоче сучасний дизайн, бюджет обговорили попередньо. Слід надіслати КП до п\'ятниці.', sentiment: 'positive' });
  Store.save('activity_logs', { clientId: c2.id, type: 'email', title: 'Відправлено КП на мобільний застосунок', body: 'Надіслано детальне технічне завдання та комерційна пропозиція. Очікуємо відповіді протягом тижня.', sentiment: 'neutral' });
  Store.save('activity_logs', { clientId: c3.id, type: 'meeting', title: 'Zoom-зустріч: затвердили логотип', body: 'Клієнт схвалив 2-й варіант логотипу. Брендбук в роботі, здача наступного тижня.', sentiment: 'positive' });
  Store.save('activity_logs', { clientId: c1.id, type: 'note', title: 'Внутрішня нотатка: переговори ускладнились', body: 'Клієнт відкладає рішення через внутрішній бюджетний перегляд. Потрібно нагадати через 2 тижні.', sentiment: 'negative' });

  localStorage.setItem('saas_seeded', '1');
}

function _futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function _pastDate(days) {
  return _futureDate(-days);
}

// ============================================================
// Bootstrap
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') document.documentElement.classList.add('dark');

  // Initialize i18n (before any rendering)
  I18nService.init();

  // Sandbox OTP toast (для розробки) — реєструємо ДО перевірки авторизації,
  // щоб спрацював навіть коли користувач ще не залогінений
  EventBus.on('auth:otp_sandbox', ({ email, otp }) => {
    if (otp) {
      Notifications.add(`🧪 [Sandbox] OTP для ${email}: ${otp} (також в консолі)`);
    }
  });

  // Оновлення Koroliky badge при змінах
  EventBus.on('koroliky:changed', () => { Topbar.render(); });

  // Вихід із системи
  EventBus.on('auth:logout', () => {
    AuthPage.mount('login');
  });

  // Auto-connect Supabase if config exists — ВАЖЛИВО: ПЕРЕД перевіркою авторизації!
  // Тому що AuthService перевіряє _isSupabaseMode() при реєстрації/вході,
  // і якщо Supabase не підключений — працюватиме sandbox (OTP у консолі замість email)
  let supabaseReady = Promise.resolve();
  if (SupabaseService.getConfig()) {
    supabaseReady = SupabaseService.connect().catch(() => {});
  }

  // Чекаємо завершення підключення Supabase, потім перевіряємо авторизацію
  supabaseReady.then(() => {
    const isAuthed = AuthPage.checkAuth();
    if (!isAuthed) return; // AuthPage монтується і чекає логін

    // Seed demo data
    seedDemoData();

    // Start router
    Router.init();
  });
});
