/**
 * LegalPage — Авторські права, Політика конфіденційності, Умови використання
 */
const LegalPage = (() => {

  function render() {
    const content = document.getElementById('content');

    content.innerHTML = `
      <div class="space-y-6 pb-8 max-w-3xl">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100" data-i18n="legal.title">Авторські права та конфіденційність</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Інформація про права та захист даних користувачів</p>
        </div>

        <!-- Copyright -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2" data-i18n="legal.copyright">Авторські права</h3>
          <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>© ${new Date().getFullYear()} FreelanceHub Pro Suite. Всі права захищені.</p>
            <p>Програмне забезпечення FreelanceHub Pro, включаючи вихідний код, дизайн, інтерфейс та документацію, є об'єктом авторського права. Будь-яке відтворення, розповсюдження або модифікація без письмової згоди власника заборонена.</p>
            <p>Всі торговельні марки, логотипи та бренди, згадані у застосунку, є власністю відповідних власників.</p>
          </div>
        </div>

        <!-- Privacy Policy -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2" data-i18n="legal.privacy">Політика конфіденційності</h3>
          <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-700 dark:text-blue-300 text-xs">
              💡 Остання редакція: ${new Date().toLocaleDateString('uk-UA')}
            </div>

            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300 mb-1">1. Які дані ми зберігаємо</p>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li><strong>Дані акаунту:</strong> email, ім'я, хешований пароль (PBKDF2, 100k ітерацій)</li>
                <li><strong>Клієнти та проєкти:</strong> імена, контакти, нотатки (введені вами)</li>
                <li><strong>Фінансові дані:</strong> інвойси, витрати, банківські реквізити (захищені маскуванням)</li>
                <li><strong>Королики:</strong> баланс та історія транзакцій</li>
                <li><strong>Логи активності:</strong> дії в застосунку для зручності</li>
              </ul>
            </div>

            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300 mb-1">2. Як ми захищаємо ваші дані</p>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li>Паролі зберігаються у вигляді хешу (PBKDF2 + SHA-256) — оригінал не зберігається</li>
                <li>Номери карток маскуються (видно лише перші 6 та останні 4 цифри)</li>
                <li>При підключенні Supabase — дані шифруються при передачі (HTTPS/TLS)</li>
                <li>Row Level Security (RLS) у Supabase — користувач бачить лише свої дані</li>
                <li>Локальні дані (localStorage) не передаються третім сторонам</li>
              </ul>
            </div>

            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300 mb-1">3. Email-верифікація</p>
              <p class="text-xs">При реєстрації на ваш email надсилається лист із посиланням для підтвердження акаунту. Після переходу за посиланням акаунт активується. Листи надсилаються через Supabase Auth.</p>
            </div>

            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300 mb-1">4. Внутрішня віртуальна валюта (Королики 👑)</p>
              <p class="text-xs">На платформі використовується внутрішня віртуальна валюта «Королики», яку можна поповнювати та використовувати для розрахунків всередині застосунку (наприклад, для оплати AI-інструментів). Баланс Короликів зберігається в базі даних Supabase (таблиця <code>profiles</code>) і синхронізується з інтерфейсом користувача.</p>
              <p class="text-xs mt-1">У майбутньому на платформі можуть підключатися реальні платні сервіси та платіжні шлюзи для поповнення балансу і проведення розрахунків. Про будь-які зміни, що стосуються обробки коштів, буде повідомлено в цій Політиці.</p>
            </div>

            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300 mb-1">5. AI-інструменти (Voice-to-Text, OCR)</p>
              <p class="text-xs">При використанні AI-інструментів (50 Короликів за запуск):</p>
              <ul class="list-disc list-inside space-y-1 text-xs mt-1">
                <li><strong>Voice-to-Text:</strong> розпізнавання виконується локально (Web Speech API) — аудіо не передається на сервер</li>
                <li><strong>OCR:</strong> за замовчуванням Tesseract.js (локально в браузері). При наявності OpenAI ключа — фото передається до OpenAI Vision API</li>
                <li>Списання Короликів — атомарна операція (захищена на рівні даних)</li>
              </ul>
            </div>

            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300 mb-1">6. Передача даних третім сторонам</p>
              <p class="text-xs">Ми не продаємо та не передаємо ваші дані третім сторонам. Винятки:</p>
              <ul class="list-disc list-inside space-y-1 text-xs mt-1">
                <li>Supabase (якщо підключено) — зберігання та синхронізація даних</li>
                <li>OpenAI (тільки якщо ви додали API-ключ) — для OCR розпізнавання</li>
                <li>Платіжні шлюзи (WayForPay, LiqPay, Stripe) — при проведенні розрахунків та платежів</li>
              </ul>
            </div>

            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300 mb-1">7. Ваші права (GDPR)</p>
              <p class="text-xs">Ви маєте право: запитати видалення всіх даних (Налаштування → Скинути дані), експортувати дані (JSON), та відмовитись від використання.</p>
            </div>
          </div>
        </div>

        <!-- Terms of Use -->
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2" data-i18n="legal.terms">Умови використання</h3>
          <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p class="text-xs">Використовуючи FreelanceHub Pro, ви погоджуєтесь з наступним:</p>
            <ul class="list-disc list-inside space-y-1 text-xs">
              <li>Застосунок надається «як є» без гарантій</li>
              <li>Відповідальність за правильність фінансових даних лежить на користувачі</li>
              <li>Реєстрація з фейкових email-адрес заборонена (перевірка одноразових доменів)</li>
              <li>Королики — внутрішня віртуальна валюта, яку можна поповнювати та використовувати для розрахунків на платформі</li>
              <li>У майбутньому можуть підключатися реальні платні сервіси та платіжні шлюзи</li>
              <li>Намагання обійти списання Короликів через фронтенд — порушення умов</li>
            </ul>
          </div>
        </div>

        <!-- Quick links -->
        <div class="card">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-3">🔗 Корисні посилання</h3>
          <div class="space-y-2 text-sm">
            <a href="#settings" data-route="settings" class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Налаштування конфіденційності
            </a>
            <a href="https://gdpr.eu/" target="_blank" class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline">
              📋 GDPR — Загальне регулювання захисту даних
            </a>
          </div>
        </div>
      </div>
    `;

    // Переклад після рендеру
    I18nService.applyTranslations(content);
  }

  return { render };
})();
