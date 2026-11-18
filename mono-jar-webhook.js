/**
 * Vercel Serverless Function — Monobank Personal Jar Webhook
 * Route: POST /api/mono-jar-webhook
 *
 * Env variables required (Vercel Dashboard → Settings → Environment Variables):
 *   MONO_JAR_ACCOUNT_ID       — ідентифікатор банки (jar) з Monobank API
 *   SUPABASE_URL              — URL вашого Supabase-проєкту
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key (не anon!) для запису в profiles
 *   TELEGRAM_BOT_TOKEN        — токен бота @mICaB_Bot (необов'язково, для сповіщень)
 *   TELEGRAM_CHAT_ID          — chat_id адміна (необов'язково)
 */

const https = require('https');

// ─── Supabase helper ──────────────────────────────────────────────────────────

function supabaseRequest(method, path, body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Promise.reject(new Error('Supabase env vars not set'));

  const data = body ? JSON.stringify(body) : null;
  const apiUrl = new URL('/rest/v1' + path, url);

  return new Promise((resolve, reject) => {
    const headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(
      { hostname: apiUrl.hostname, path: apiUrl.pathname + apiUrl.search, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw || '[]') }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Telegram helper ──────────────────────────────────────────────────────────

function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return Promise.resolve();

  const data = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => { res.resume(); res.on('end', resolve); }
    );
    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

// ─── Основний обробник ────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // Monobank надсилає тільки POST
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const body = req.body || {};

    // Перевіряємо тип події
    if (body.type !== 'StatementItem') {
      return res.status(200).json({ ok: true, skipped: 'not StatementItem' });
    }

    const { account, statementItem } = body.data || {};

    // Перевіряємо що це наша банка
    const jarAccountId = process.env.MONO_JAR_ACCOUNT_ID;
    if (jarAccountId && account !== jarAccountId) {
      return res.status(200).json({ ok: true, skipped: 'wrong account' });
    }

    // Тільки позитивні суми (надходження)
    if (!statementItem || statementItem.amount <= 0) {
      return res.status(200).json({ ok: true, skipped: 'not income' });
    }

    // Шукаємо код PL\d{4} у коментарі або описі
    const comment = statementItem.comment || statementItem.description || '';
    const codeMatch = comment.match(/PL\d{4}/i);
    if (!codeMatch) {
      return res.status(200).json({ ok: true, skipped: 'no PL code in comment' });
    }
    const paymentCode = codeMatch[0].toUpperCase();
    const amountKopecks = statementItem.amount; // Monobank надсилає в копійках

    // Шукаємо запис у pending_payments
    const findResp = await supabaseRequest(
      'GET',
      `/pending_payments?code=eq.${paymentCode}&status=eq.pending&select=*`
    );

    if (!Array.isArray(findResp.body) || findResp.body.length === 0) {
      return res.status(200).json({ ok: true, skipped: 'pending payment not found' });
    }

    const payment = findResp.body[0];

    // Перевіряємо суму (amount_uah * 100 = сума в копійках)
    const expectedKopecks = Math.round(payment.amount_uah * 100);
    if (amountKopecks < expectedKopecks) {
      return res.status(200).json({ ok: true, skipped: 'amount mismatch' });
    }

    // 1) Позначаємо платіж як оплачений
    await supabaseRequest(
      'PATCH',
      `/pending_payments?code=eq.${paymentCode}&status=eq.pending`,
      { status: 'paid', paid_at: new Date().toISOString() }
    );

    // 2) Додаємо coins до балансу користувача в profiles
    // Використовуємо rpc або read-then-update (simple approach)
    const profileResp = await supabaseRequest(
      'GET',
      `/profiles?id=eq.${payment.user_id}&select=balance,telegram_chat_id`
    );

    if (Array.isArray(profileResp.body) && profileResp.body.length > 0) {
      const profile = profileResp.body[0];
      const newBalance = (profile.balance || 0) + payment.coins;

      await supabaseRequest(
        'PATCH',
        `/profiles?id=eq.${payment.user_id}`,
        { balance: newBalance, updated_at: new Date().toISOString() }
      );

      // 3) Telegram-сповіщення користувачу
      if (profile.telegram_chat_id) {
        await sendTelegram(
          profile.telegram_chat_id,
          `✅ Баланс поповнено!\n\n👑 Нараховано: <b>+${payment.coins} Короликів</b>\n💳 Сплачено: <b>${payment.amount_uah} грн</b>\n🔑 Код платежу: <code>${paymentCode}</code>`
        );
      }
    }

    // Сповіщення адміну
    const adminChatId = process.env.TELEGRAM_CHAT_ID;
    if (adminChatId) {
      await sendTelegram(
        adminChatId,
        `💰 Нове поповнення:\nКод: <code>${paymentCode}</code>\nКористувач: <code>${payment.user_id}</code>\nСума: ${payment.amount_uah} грн → +${payment.coins} 👑`
      );
    }

    return res.status(200).json({ ok: true, processed: paymentCode });
  } catch (err) {
    console.error('Mono webhook error:', err);
    // Завжди 200 — інакше Monobank буде ретраїти
    return res.status(200).json({ ok: false, error: err.message });
  }
};
