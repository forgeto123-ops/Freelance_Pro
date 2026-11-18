# FreelanceHub Pro — Система оплати через Monobank Банку

## 1. Задіяні сервіси та архітектура

| Сервіс | Роль |
|---|---|
| **Monobank Personal API** | Отримання платежів на особисту Банку. Вебхук надсилається автоматично після кожного надходження. |
| **Vercel** | Serverless-функція `/api/mono-jar-webhook` — обробляє вхідний вебхук від Monobank. |
| **Supabase** | Таблиця `pending_payments` — зберігає трекінг-коди та їх статус. Таблиця `profiles` — зберігає баланс Короликів користувачів. |
| **QRserver API** | `https://api.qrserver.com/v1/create-qr-code/` — генерує QR-код із посиланням на оплату на стороні фронтенду, без бекенду. |

**Схема:**
```
Фронтенд → Supabase (pending_payments: pending)
         → QRserver (генерація QR)

Користувач → Monobank (оплата з коментарем PLxxxx)

Monobank → Vercel /api/mono-jar-webhook
         → Supabase (pending_payments: paid)
         → Supabase (profiles.balance += coins)
         → Telegram Bot (сповіщення користувачу)

Фронтенд (polling 3s) → Supabase → статус paid → закрити модалку, оновити баланс
```

---

## 2. Процес оплати

1. Користувач натискає на баланс Короликів → «💳 Поповнити Королики» → обирає тариф:

   | Тариф | Монети | Сума |
   |---|---|---|
   | ⚡ Старт | 500 👑 | 1 грн |
   | 🔥 Стандарт | 1 000 👑 | 2 грн |
   | 👑 Максимум | 3 000 👑 | 3 грн |

2. Сайт генерує унікальний код `PLxxxx` (наприклад, `PL8392`), записує в `pending_payments` зі статусом `pending`, формує посилання виду:
   ```
   https://send.monobank.ua/jar/2aiC2pNaQ1?a=1&t=PL8392
   ```
   та показує QR-код і кнопку «Відкрити в Monobank».

3. Користувач сканує QR або відкриває посилання — в додатку Monobank вже підставлені сума та коментар `PL8392`. Підтверджує оплату.

4. Monobank надсилає вебхук на Vercel за 1–2 секунди. Функція:
   - знаходить код `PLxxxx` у коментарі транзакції,
   - перевіряє збіг суми,
   - оновлює статус у `pending_payments` → `paid`,
   - додає монети до `profiles.balance` користувача,
   - якщо підключений Telegram — надсилає сповіщення.

5. Фронтенд кожні 3 секунди перевіряє статус коду в Supabase. Щойно бачить `paid` — закриває модалку, оновлює баланс у шапці, показує сповіщення.

---

## 3. Чого НЕ можна робити

- **Змінювати або видаляти коментар `PLxxxx` під час оплати** в додатку Monobank. Без точного збігу коду вебхук не зможе прив'язати платіж до акаунту — Королики не нарахуються.

- **Змінювати структуру таблиці `pending_payments`** у Supabase: назви полів `code`, `user_id`, `coins`, `amount_uah`, `status` використовуються напряму у вебхуку та фронтенді.

- **Видаляти або перейменовувати змінні середовища на Vercel** без відповідного оновлення коду:

  | Змінна | Використання |
  |---|---|
  | `MONO_JAR_ACCOUNT_ID` | Фільтр: ігнорує вебхуки від інших рахунків |
  | `SUPABASE_URL` | Підключення до бази |
  | `SUPABASE_SERVICE_ROLE_KEY` | Запис у `profiles` та `pending_payments` (service role, не anon) |
  | `TELEGRAM_BOT_TOKEN` | Відправка сповіщень користувачам |
  | `TELEGRAM_CHAT_ID` | Сповіщення адміну при кожному поповненні |

---

## 4. Одноразове налаштування після деплою

**Крок 1.** Дізнатися `MONO_JAR_ACCOUNT_ID`:
```bash
curl https://api.monobank.ua/personal/client-info \
  -H "X-Token: ВАШ_MONOBANK_PERSONAL_TOKEN"
```
Знайти в масиві `jars` банку за назвою → скопіювати поле `id`.

**Крок 2.** Зареєструвати вебхук у Monobank:
```bash
curl -X POST https://api.monobank.ua/personal/webhook \
  -H "X-Token: ВАШ_MONOBANK_PERSONAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webHookUrl":"https://ВАШ_ДОМЕН.vercel.app/api/mono-jar-webhook"}'
```
Відповідь `{}` без помилок — вебхук активний.

**Крок 3.** Запустити SQL з `profiles.sql` у Supabase SQL Editor (якщо ще не виконано).
