/**
 * Vercel Serverless Function — Telegram Bot Webhook
 * Route: POST /api/telegram-webhook
 *
 * Env variables required (Vercel Dashboard → Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN      — токен бота від @BotFather
 *   SUPABASE_URL            — URL вашого Supabase-проєкту
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key (не anon!) для запису в profiles
 *   TELEGRAM_CHAT_ID        — chat_id адміна для сповіщень (необов'язково)
 */

const https = require('https');

// ─── Допоміжні функції ────────────────────────────────────────────────────────

function tgRequest(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/${method}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve(JSON.parse(raw)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sendMessage(chatId, text) {
  return tgRequest('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

async function supabaseUpdate(userId, telegramChatId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');

  const data = JSON.stringify({ telegram_chat_id: String(telegramChatId) });

  return new Promise((resolve, reject) => {
    const apiUrl = new URL(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, url);
    const req = https.request(
      {
        hostname: apiUrl.hostname,
        path: apiUrl.pathname + apiUrl.search,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=representation',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(raw || '[]'));
          else reject(new Error(`Supabase error ${res.statusCode}: ${raw}`));
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─── Основний обробник ────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // Vercel викликає тільки POST — все інше ігноруємо
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const body = req.body || {};
    const message = body.message;

    // Ігноруємо не-текстові оновлення
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Обробляємо лише команду /start (з параметром або без)
    if (!text.startsWith('/start')) {
      return res.status(200).json({ ok: true });
    }

    // Витягуємо параметр після "/start " (userId)
    const parts = text.split(' ');
    const userId = parts[1]?.trim() || null;

    if (userId) {
      // Прив'язуємо telegram_chat_id до профілю користувача
      await supabaseUpdate(userId, chatId);

      await sendMessage(
        chatId,
        '✅ Вітаємо у Pro_lance!\n\nВаш акаунт успішно зареєстровано та прив\'язано до бота @mICaB_Bot. Сюди надходитимуть сповіщення про поповнення балансу та важливі події.'
      );

      // Сповіщення адміну (якщо задано TELEGRAM_CHAT_ID)
      const adminChatId = process.env.TELEGRAM_CHAT_ID;
      if (adminChatId && String(adminChatId) !== String(chatId)) {
        await sendMessage(
          adminChatId,
          `🔔 Новий Telegram прив'язаний:\nuser_id: <code>${userId}</code>\nchat_id: <code>${chatId}</code>`
        );
      }
    } else {
      // /start без параметра
      await sendMessage(
        chatId,
        '👋 Вітаємо! Щоб прив\'язати цей Telegram до вашого акаунту Pro_lance, натисніть кнопку «Підключити Telegram-сповіщення» в особистому кабінеті на сайті.'
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    // Telegram очікує 200 навіть при помилках — інакше буде ретраї
    return res.status(200).json({ ok: false, error: err.message });
  }
};
