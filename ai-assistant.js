/**
 * AI Assistant page — Smart text generation, reply suggestions, sentiment analysis
 * Uses rule-based generation (no external API key needed) + optional OpenAI integration
 */
const AIAssistant = (() => {

  // =========================================================
  // Core generation logic (rule-based fallback, always works)
  // =========================================================

  const OBJECTION_RESPONSES = {
    'дорого': [
      `Розумію вашу стурбованість щодо вартості. Давайте розглянемо, яку цінність це принесе вашому бізнесу. Порівняно з альтернативами, наше рішення дозволить заощадити {time} годин на місяць та збільшити ефективність команди. Чи маєте ви 15 хвилин, щоб розглянути конкретні цифри?`,
      `Ціна — це інвестиція у результат. Наші клієнти в середньому повертають вкладені кошти вже за 2-3 місяці. Хочу поділитись кейсом схожого бізнесу — чи цікаво?`,
    ],
    'подумаю': [
      `Звичайно, важливе рішення потребує часу. Щоб ваш аналіз був повним, дозвольте надіслати вам коротке порівняння з конкурентами та відгуки наших клієнтів. Коли зручно зателефонувати, щоб відповісти на питання?`,
      `Чудово, що ви підходите до цього серйозно! Поки ви думаєте, я можу надіслати детальне КП з усіма цифрами. На яку пошту?`,
    ],
    'не зараз': [
      `Розумію, зараз може бути не найкращий момент. Коли, на вашу думку, буде більш підходящий час? Я можу зв'язатись через {days} днів — чи зручно?`,
      `Ніяких проблем! Давайте я нагадаю вам через місяць. А поки що — чи є у вас конкретні питання або сумніви, які я міг би розвіяти вже зараз?`,
    ],
    'default': [
      `Дякую за чесність! Дозвольте розглянути ваше питання детальніше та запропонувати оптимальне рішення. Чи зручно вам поговорити завтра о {time}?`,
      `Це дуже слушне зауваження. На основі нашого досвіду, найкращий підхід у такій ситуації — це {solution}. Що ви про це думаєте?`,
    ],
  };

  const PROPOSAL_TEMPLATES = {
    web: `Шановний/а {name},\n\nДякуємо за проявлений інтерес до наших послуг!\n\nПропонуємо вам наступне рішення для {project}:\n\n✅ Розробка {pages}-сторінкового сайту на сучасному стеку технологій\n✅ Адаптивний дизайн (Mobile-first)\n✅ SEO-оптимізація базова\n✅ Підключення аналітики\n✅ 3 місяці технічної підтримки\n\n💰 Вартість: {price} грн\n📅 Терміни: {duration} тижнів\n\nЦе рішення дозволить вам {benefit}.\n\nЗ повагою,\n{sender}`,
    design: `Шановний/а {name},\n\nЯк завжди, раді співпрацювати з вами!\n\nКомерційна пропозиція на дизайн {project}:\n\n🎨 Концепція бренду (3 варіанти)\n🎨 Розробка фірмового стилю\n🎨 Логотип у форматах SVG, PNG, PDF\n🎨 Брендбук (20+ сторінок)\n\n💰 Вартість: {price} грн\n📅 Терміни: {duration} тижнів\n\nОчікуваний результат: {benefit}\n\nЧекаємо на ваш відгук!\n{sender}`,
    consult: `Вітаємо, {name}!\n\nДякуємо за запит на консультацію.\n\nПрограма консультації щодо {project}:\n\n📊 Аудит поточного стану (1 год)\n📊 Аналіз конкурентів та ринку\n📊 Розробка стратегії дій\n📊 Детальний план впровадження\n📊 Q&A сесія\n\n💰 Вартість: {price} грн\n📅 Формат: {duration}\n\nПісля консультації ви отримаєте {benefit}.\n\nДо зустрічі,\n{sender}`,
  };

  const FOLLOWUP_TEMPLATES = [
    `Привіт, {name}! 👋\n\nХотів нагадати про нашу розмову щодо {topic}. Чи є у вас питання або рішення?\n\nЗ повагою, {sender}`,
    `Доброго дня, {name}!\n\nПроходить {days} днів з нашої останньої розмови. Хотів поцікавитись — чи є прогрес у вашому питанні щодо {topic}?\n\nЗавжди готовий допомогти!\n{sender}`,
    `{name}, вітаю!\n\nЯк справи з проєктом {topic}? 🚀\n\nЯкщо виникли питання або потрібна допомога — я тут. Також хочу поділитись корисним матеріалом по темі — надіслати?\n\n{sender}`,
  ];

  function generateObjectionResponse(objection, tone = 'professional') {
    const key = Object.keys(OBJECTION_RESPONSES).find(k => objection.toLowerCase().includes(k)) || 'default';
    const responses = OBJECTION_RESPONSES[key];
    let response = responses[Math.floor(Math.random() * responses.length)];
    // Replace placeholders
    response = response
      .replace('{time}', Math.floor(Math.random() * 20 + 5))
      .replace('{days}', [7, 14, 30][Math.floor(Math.random() * 3)])
      .replace('{solution}', 'поетапне впровадження з фіксованим бюджетом')
      .replace('{time}', '10:00');

    // ── Тон відповіді ──────────────────────────────────────────────────
    if (tone === 'friendly') {
      // Теплий, дружній стиль
      const warmPrefixes = ['Привіт! 😊 ', 'Доброго дня! ', 'Радий, що ви поділились! ', ''];
      const warmSuffixes = [' Буду радий допомогти! 🙌', ' Сподіваюсь на плідну співпрацю!', ''];
      response = warmPrefixes[Math.floor(Math.random() * warmPrefixes.length)]
               + response
               + warmSuffixes[Math.floor(Math.random() * warmSuffixes.length)];
    } else if (tone === 'concise') {
      // Лаконічний — обрізаємо до 1-2 речень, прибираємо зайве
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 5);
      if (sentences.length > 2) {
        response = sentences.slice(0, 2).map(s => s.trim()).join('. ') + '.';
      }
      // Прибираємо питання у кінці (непотрібні в лаконічному стилі)
      response = response.replace(/\?[^?]*$/, '.');
    }
    // professional — без змін (базовий стиль)

    return response;
  }

  function generateProposal({ type = 'web', clientName = 'Клієнт', project = 'проєкт', price = '15 000', duration = '3-4', benefit = 'залучити нових клієнтів', sender = 'Команда FreelanceHub' } = {}) {
    const tpl = PROPOSAL_TEMPLATES[type] || PROPOSAL_TEMPLATES.web;
    return tpl
      .replace(/{name}/g, clientName)
      .replace(/{project}/g, project)
      .replace(/{price}/g, price)
      .replace(/{duration}/g, duration)
      .replace(/{benefit}/g, benefit)
      .replace(/{sender}/g, sender)
      .replace(/{pages}/g, String(Math.floor(Math.random() * 5 + 5)));
  }

  function generateFollowUp({ clientName = 'Клієнт', topic = 'проєкт', days = 7, sender = 'Ваш менеджер' } = {}) {
    const tpl = FOLLOWUP_TEMPLATES[Math.floor(Math.random() * FOLLOWUP_TEMPLATES.length)];
    return tpl
      .replace(/{name}/g, clientName)
      .replace(/{topic}/g, topic)
      .replace(/{days}/g, days)
      .replace(/{sender}/g, sender);
  }

  function analyzeSentiment(text) {
    const positiveWords = ['дякую', 'чудово', 'відмінно', 'задоволен', 'класно', 'супер', 'вдячн', 'добре', 'відповідає', 'підходить', 'згоден', 'так', 'домовились'];
    const negativeWords = ['дорого', 'незадоволен', 'погано', 'проблем', 'відмовляюсь', 'не підходить', 'незрозуміло', 'довго', 'запізни', 'скарг'];
    const t = text.toLowerCase();
    const posScore = positiveWords.filter(w => t.includes(w)).length;
    const negScore = negativeWords.filter(w => t.includes(w)).length;
    if (posScore > negScore) return { sentiment: 'positive', score: posScore, label: '😊 Позитивний' };
    if (negScore > posScore) return { sentiment: 'negative', score: negScore, label: '😟 Негативний' };
    return { sentiment: 'neutral', score: 0, label: '😐 Нейтральний' };
  }

  function generateSummary(text) {
    if (!text || text.length < 20) return 'Недостатньо тексту для підсумку.';
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length <= 2) return text.slice(0, 200);
    // Take first + last + a middle sentence
    const key = [sentences[0], sentences[Math.floor(sentences.length/2)], sentences[sentences.length-1]];
    return key.map(s => s.trim()).join('. ') + '.';
  }

  // =========================================================
  // Page render
  // =========================================================

  function render() {
    const content = document.getElementById('content');
    const clients = Store.getAll('clients');
    const deals = Store.getAll('deals');

    content.innerHTML = `
      <div class="space-y-6 pb-8">
        <!-- Header -->
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl shrink-0">🤖</div>
          <div>
            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">AI-помічник для продажів</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Генерація відповідей, КП, follow-up листів та аналіз тональності</p>
          </div>
        </div>

        <!-- Tool tabs -->
        <div class="flex flex-wrap gap-2" id="ai-tabs">
          ${[
            { id: 'objection', label: '💬 Відповідь на заперечення' },
            { id: 'proposal', label: '📄 Комерційна пропозиція' },
            { id: 'followup', label: '📨 Follow-up лист' },
            { id: 'sentiment', label: '🎭 Аналіз тональності' },
            { id: 'summary', label: '📝 Підсумок діалогу' },
            { id: 'voice', label: '🎙️ Voice-to-Text · 50👑' },
            { id: 'ocr', label: '📷 OCR документа · 50👑' },
          ].map((t, i) => `
            <button data-tool="${t.id}" class="ai-tab px-4 py-2 rounded-xl text-sm font-medium transition-all border
              ${i === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300'}">
              ${t.label}
            </button>
          `).join('')}
        </div>

        <!-- Tool panels -->
        <div id="ai-panel"></div>

        <!-- Result -->
        <div id="ai-result" class="hidden"></div>

        <!-- History -->
        <div id="ai-history"></div>
      </div>
    `;

    _activateTool('objection');
    _renderHistory();

    document.querySelectorAll('.ai-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ai-tab').forEach(t => {
          t.className = t.className.replace('bg-indigo-600 text-white border-indigo-600 shadow-md', 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300');
        });
        tab.className = tab.className.replace('bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300', 'bg-indigo-600 text-white border-indigo-600 shadow-md');
        _activateTool(tab.dataset.tool);
      });
    });
  }

  function _activateTool(tool) {
    const panel = document.getElementById('ai-panel');
    const clients = Store.getAll('clients');
    const deals = Store.getAll('deals');
    document.getElementById('ai-result').classList.add('hidden');

    if (tool === 'objection') {
      panel.innerHTML = `
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">Відповідь на заперечення клієнта</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Введіть заперечення клієнта, AI згенерує переконливу відповідь</p>
          <div>
            <label class="label">Заперечення клієнта *</label>
            <textarea id="objection-input" rows="3" class="input resize-none" placeholder="Наприклад: «Це занадто дорого для нас» або «Нам потрібно подумати» або «Зараз не на часі»"></textarea>
          </div>
          <div>
            <label class="label">Тон відповіді</label>
            <div class="flex gap-2 flex-wrap" id="tone-selector">
              ${[['professional', '👔 Професійний'], ['friendly', '😊 Дружній'], ['concise', '⚡ Лаконічний']].map(([v,l], i) => `
                <button type="button" data-tone="${v}" class="tone-btn flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all ${i===0?'tone-active border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300':'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300'}">
                  ${l}
                </button>
              `).join('')}
            </div>
          </div>
          <button id="gen-objection" class="btn-primary">🤖 Згенерувати відповідь</button>
        </div>
      `;

      // Фіксована клікабельність tone-кнопок
      let selectedTone = 'professional';
      panel.querySelectorAll('.tone-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          // Знімаємо активний клас з усіх
          panel.querySelectorAll('.tone-btn').forEach(b => {
            b.classList.remove('tone-active', 'border-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/20', 'text-indigo-700', 'dark:text-indigo-300');
            b.classList.add('border-gray-200', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
          });
          // Активуємо вибрану
          btn.classList.add('tone-active', 'border-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/20', 'text-indigo-700', 'dark:text-indigo-300');
          btn.classList.remove('border-gray-200', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
          selectedTone = btn.dataset.tone;
        });
      });

      document.getElementById('gen-objection').addEventListener('click', () => {
        const objection = document.getElementById('objection-input').value.trim();
        if (!objection) return;
        const result = generateObjectionResponse(objection, selectedTone);
        _showResult('💬 Відповідь на заперечення', result, 'objection_response');
      });
    }

    else if (tool === 'proposal') {
      panel.innerHTML = `
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">Генератор комерційної пропозиції</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Клієнт *</label>
              <select id="prop-client" class="input">
                <option value="">— Введіть вручну —</option>
                ${clients.map(c => `<option value="${c.name}">${c.name}${c.company?` (${c.company})`:''}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Ім'я клієнта</label>
              <input id="prop-client-name" type="text" class="input" placeholder="Іван Петренко" />
            </div>
            <div>
              <label class="label">Тип послуги</label>
              <select id="prop-type" class="input">
                <option value="web">🌐 Веб-розробка</option>
                <option value="design">🎨 Дизайн</option>
                <option value="consult">📊 Консалтинг</option>
              </select>
            </div>
            <div>
              <label class="label">Назва проєкту</label>
              <input id="prop-project" type="text" class="input" placeholder="Корпоративний сайт" />
            </div>
            <div>
              <label class="label">Вартість (грн)</label>
              <input id="prop-price" type="number" class="input" placeholder="25000" />
            </div>
            <div>
              <label class="label">Терміни</label>
              <input id="prop-duration" type="text" class="input" placeholder="3-4 тижні" />
            </div>
          </div>
          <div>
            <label class="label">Ключова вигода для клієнта</label>
            <input id="prop-benefit" type="text" class="input" placeholder="збільшити кількість заявок на 30%" />
          </div>
          <div>
            <label class="label">Ваше ім'я / підпис</label>
            <input id="prop-sender" type="text" class="input" placeholder="Іван, Freelancer" value="${localStorage.getItem('saas_user_name') || ''}" />
          </div>
          <button id="gen-proposal" class="btn-primary">📄 Згенерувати КП</button>
        </div>
      `;
      document.getElementById('prop-client').addEventListener('change', e => {
        document.getElementById('prop-client-name').value = e.target.value;
      });
      document.getElementById('gen-proposal').addEventListener('click', () => {
        const clientName = document.getElementById('prop-client-name').value.trim() || 'Клієнт';
        const result = generateProposal({
          type: document.getElementById('prop-type').value,
          clientName,
          project: document.getElementById('prop-project').value.trim() || 'проєкт',
          price: document.getElementById('prop-price').value ? new Intl.NumberFormat('uk-UA').format(document.getElementById('prop-price').value) : '—',
          duration: document.getElementById('prop-duration').value.trim() || '2-3 тижні',
          benefit: document.getElementById('prop-benefit').value.trim() || 'досягти поставлених цілей',
          sender: document.getElementById('prop-sender').value.trim() || 'Команда FreelanceHub',
        });
        _showResult('📄 Комерційна пропозиція', result, 'proposal');
        if (document.getElementById('prop-sender').value.trim()) {
          localStorage.setItem('saas_user_name', document.getElementById('prop-sender').value.trim());
        }
      });
    }

    else if (tool === 'followup') {
      panel.innerHTML = `
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">Генератор Follow-up повідомлень</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Клієнт</label>
              <select id="fu-client" class="input">
                <option value="">— Вручну —</option>
                ${clients.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Ім'я клієнта</label>
              <input id="fu-name" type="text" class="input" placeholder="Іван" />
            </div>
            <div>
              <label class="label">Тема розмови / проєкт</label>
              <input id="fu-topic" type="text" class="input" placeholder="Редизайн сайту" />
            </div>
            <div>
              <label class="label">Пройшло днів</label>
              <input id="fu-days" type="number" min="1" class="input" value="7" />
            </div>
          </div>
          <div>
            <label class="label">Ваш підпис</label>
            <input id="fu-sender" type="text" class="input" placeholder="Іван, Freelancer" value="${localStorage.getItem('saas_user_name') || ''}" />
          </div>
          <button id="gen-followup" class="btn-primary">📨 Згенерувати повідомлення</button>
        </div>
      `;
      document.getElementById('fu-client').addEventListener('change', e => {
        document.getElementById('fu-name').value = e.target.value;
      });
      document.getElementById('gen-followup').addEventListener('click', () => {
        const result = generateFollowUp({
          clientName: document.getElementById('fu-name').value.trim() || 'Клієнт',
          topic: document.getElementById('fu-topic').value.trim() || 'проєкт',
          days: document.getElementById('fu-days').value || 7,
          sender: document.getElementById('fu-sender').value.trim() || 'Ваш менеджер',
        });
        _showResult('📨 Follow-up повідомлення', result, 'followup');
      });
    }

    else if (tool === 'sentiment') {
      panel.innerHTML = `
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">Аналіз тональності переписки</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Вставте текст переписки з клієнтом для визначення настрою</p>
          <div>
            <label class="label">Текст переписки *</label>
            <textarea id="sentiment-input" rows="6" class="input resize-none" placeholder="Вставте текст повідомлення або переписки з клієнтом..."></textarea>
          </div>
          <button id="analyze-sentiment" class="btn-primary">🎭 Проаналізувати</button>
        </div>
      `;
      document.getElementById('analyze-sentiment').addEventListener('click', () => {
        const text = document.getElementById('sentiment-input').value.trim();
        if (!text) return;
        const analysis = analyzeSentiment(text);
        const sentimentColors = { positive: '#10b981', neutral: '#6b7280', negative: '#ef4444' };
        const sentimentBg = { positive: '#f0fdf4', neutral: '#f9fafb', negative: '#fef2f2' };
        const summary = generateSummary(text);
        const resultHtml = `
          <div class="space-y-4">
            <div class="flex items-center gap-4 p-4 rounded-xl" style="background:${sentimentBg[analysis.sentiment]}">
              <div class="text-5xl">${analysis.sentiment === 'positive' ? '😊' : analysis.sentiment === 'negative' ? '😟' : '😐'}</div>
              <div>
                <p class="text-2xl font-bold" style="color:${sentimentColors[analysis.sentiment]}">${analysis.label}</p>
                <p class="text-sm text-gray-500">Аналіз завершено на основі ${text.split(' ').length} слів</p>
              </div>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Підсумок</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">${summary}</p>
            </div>
          </div>
        `;
        document.getElementById('ai-result').innerHTML = `<div class="card"><h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-4">🎭 Результат аналізу</h3>${resultHtml}</div>`;
        document.getElementById('ai-result').classList.remove('hidden');
        Store.save('ai_history', { tool: 'sentiment', input: text.slice(0, 100) + '...', output: analysis.label, createdAt: new Date().toISOString() });
        _renderHistory();
      });
    }

    else if (tool === 'summary') {
      panel.innerHTML = `
        <div class="card space-y-4">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">Підсумок діалогу</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Вставте довгу переписку або нотатку — AI стисне її до ключових тез</p>
          <div>
            <label class="label">Текст для стиснення *</label>
            <textarea id="summary-input" rows="8" class="input resize-none" placeholder="Вставте текст переговорів, нотатки після зустрічі або довгий email..."></textarea>
          </div>
          <button id="gen-summary" class="btn-primary">📝 Згенерувати підсумок</button>
        </div>
      `;
      document.getElementById('gen-summary').addEventListener('click', () => {
        const text = document.getElementById('summary-input').value.trim();
        if (!text) return;
        const result = generateSummary(text);
        _showResult('📝 Підсумок діалогу', result, 'summary');
      });
    }

    // ── Платні AI-інструменти (50 Короликів) ──────────────────────────────

    else if (tool === 'voice') {
      _renderVoiceTool(panel);
    }

    else if (tool === 'ocr') {
      _renderOCRTool(panel);
    }
  }

  function _showResult(title, text, type) {
    const el = document.getElementById('ai-result');
    el.innerHTML = `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">${title}</h3>
          <div class="flex gap-2">
            <button id="copy-result" class="btn-secondary text-xs py-1.5 px-3">📋 Копіювати</button>
            <button id="regen-result" class="btn-secondary text-xs py-1.5 px-3">🔄 Ще варіант</button>
          </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <pre id="result-text" class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">${text}</pre>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <span class="text-xs text-gray-400">Збережено в: </span>
          <select id="save-to-select" class="input py-1 text-xs w-auto">
            <option value="">— Не зберігати —</option>
            <option value="activity">Журнал активностей</option>
            <option value="deal">Угода (нотатка)</option>
          </select>
          <button id="save-result-btn" class="btn-secondary text-xs py-1.5 px-3">Зберегти</button>
        </div>
      </div>
    `;
    el.classList.remove('hidden');

    document.getElementById('copy-result').addEventListener('click', () => {
      navigator.clipboard?.writeText(text).then(() => {
        document.getElementById('copy-result').textContent = '✅ Скопійовано!';
        setTimeout(() => document.getElementById('copy-result').textContent = '📋 Копіювати', 2000);
      });
    });

    document.getElementById('save-result-btn').addEventListener('click', () => {
      const target = document.getElementById('save-to-select').value;
      if (target === 'activity') {
        Store.save('activity_logs', { type: 'note', title: `AI: ${title}`, body: text });
        Notifications.add(`AI-текст збережено в журналі активностей`);
      }
      Store.save('ai_history', { tool: type, input: title, output: text.slice(0, 150), createdAt: new Date().toISOString() });
      _renderHistory();
    });

    // Store in history
    Store.save('ai_history', { tool: type, input: title, output: text.slice(0, 100) + (text.length > 100 ? '...' : ''), createdAt: new Date().toISOString() });
    _renderHistory();
  }

  function _renderHistory() {
    const history = Store.getAll('ai_history').slice().reverse().slice(0, 8);
    const el = document.getElementById('ai-history');
    if (!history.length || !el) return;
    el.innerHTML = `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Нещодавні генерації</h3>
          <button id="clear-ai-history" class="text-xs text-gray-400 hover:text-red-500">Очистити</button>
        </div>
        <div class="space-y-2">
          ${history.map(h => `
            <div class="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
              <span class="text-lg mt-0.5">${h.tool === 'proposal' ? '📄' : h.tool === 'followup' ? '📨' : h.tool === 'sentiment' ? '🎭' : h.tool === 'summary' ? '📝' : '💬'}</span>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">${h.input}</p>
                <p class="text-sm text-gray-700 dark:text-gray-300 truncate">${h.output}</p>
              </div>
              <span class="text-xs text-gray-400 shrink-0">${_timeAgo(h.createdAt)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.getElementById('clear-ai-history')?.addEventListener('click', () => {
      Store.clear('ai_history');
      el.innerHTML = '';
    });
  }

  function _timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'щойно';
    if (mins < 60) return `${mins} хв`;
    return `${Math.floor(mins / 60)} год`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎙️ Voice-to-Text — 50 Короликів
  // ═══════════════════════════════════════════════════════════════════════

  function _renderVoiceTool(panel) {
    const balance = KorolikyService.getBalance();
    const hasEnough = balance >= KorolikyService.AI_TOOL_COST;
    const status = KorolikyService.getDailyBonusStatus();

    panel.innerHTML = `
      <div class="card space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-gray-800 dark:text-gray-100">🎙️ Voice-to-Text (AI-диктофон)</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Надиктуйте текст для договору, нотатки або угоди — розпізнається автоматично</p>
          </div>
          <span class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${hasEnough ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}">
            👑 50 Короликів
          </span>
        </div>

        <div class="p-3 ${hasEnough ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'} rounded-xl border">
          <p class="text-sm font-medium ${hasEnough ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}">
            ${hasEnough
              ? `👑 Баланс: ${balance} Короликів — достатньо для запуску`
              : `❌ Недостатньо Короликів (є ${balance}, потрібно 50)${!status.canClaim && status.timeLeft ? `. Наступний бонус через: ${status.timeLeft}` : ''}`
            }
          </p>
          ${!hasEnough && status.canClaim ? `
            <button id="claim-koroliky-voice" class="btn-secondary text-xs mt-2">🎁 Отримати щоденний бонус +500</button>
          ` : ''}
        </div>

        ${hasEnough ? `
          <div>
            <label class="label">Мова розпізнавання</label>
            <select id="voice-lang" class="input">
              <option value="uk-UA">🇺🇦 Українська</option>
              <option value="en-US">🇺🇸 English</option>
              <option value="pl-PL">🇵🇱 Polski</option>
              <option value="ru-RU" disabled>🚫 Russian (заблоковано)</option>
            </select>
          </div>

          <div>
            <label class="label">Призначення тексту</label>
            <select id="voice-target" class="input">
              <option value="note">Нотатка до клієнта</option>
              <option value="contract">Текст договору/угоди</option>
              <option value="free">Вільний текст</option>
            </select>
          </div>

          <div id="voice-status" class="hidden p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-center">
            <div id="voice-wave" class="text-2xl mb-1 animate-pulse">🎙️</div>
            <p id="voice-status-text" class="text-sm text-gray-600 dark:text-gray-400">Натисніть кнопку і говоріть...</p>
          </div>

          <div>
            <label class="label">Розпізнаний текст</label>
            <textarea id="voice-result-text" rows="5" class="input resize-none font-mono text-sm"
              placeholder="Тут з'явиться розпізнаний текст..."></textarea>
          </div>

          <div class="flex gap-2 flex-wrap">
            <button id="start-voice-btn" class="btn-primary">
              🎙️ Почати запис (−50 👑)
            </button>
            <button id="stop-voice-btn" class="btn-secondary hidden">⏹️ Зупинити</button>
            <button id="copy-voice-btn" class="btn-secondary hidden">📋 Копіювати</button>
            <button id="save-voice-btn" class="btn-secondary hidden">💾 Зберегти в нотатки</button>
          </div>
        ` : ''}
      </div>
    `;

    // Claim bonus якщо не вистачає
    document.getElementById('claim-koroliky-voice')?.addEventListener('click', () => {
      const result = KorolikyService.checkAndClaimDailyBonus();
      if (result.claimed) {
        Notifications.add(`👑 +${result.amount} Короликів!`);
        _renderVoiceTool(panel);
        Topbar.render();
      }
    });

    if (!hasEnough) return;

    let recognition = null;
    let isRecording = false;
    let charged = false;

    document.getElementById('start-voice-btn')?.addEventListener('click', () => {
      if (isRecording) return;

      // Списання ПЕРЕД запуском (захист від фронтенду)
      const charge = KorolikyService.chargeForAITool('Voice-to-Text');
      if (!charge.success) {
        Notifications.add(`❌ ${charge.error}`);
        _renderVoiceTool(panel); // Оновлюємо UI
        return;
      }
      charged = true;
      Notifications.add(`👑 Списано 50 Короликів. Баланс: ${charge.balance}`);
      Topbar.render();

      // Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        document.getElementById('voice-result-text').value =
          '⚠️ Web Speech API не підтримується у вашому браузері.\n' +
          'Спробуйте Chrome/Edge на десктопі.\n\n' +
          'У production-версії тут буде Whisper API.';
        return;
      }

      recognition = new SpeechRecognition();
      recognition.lang = document.getElementById('voice-lang')?.value || 'uk-UA';
      recognition.continuous = true;
      recognition.interimResults = true;

      const statusBlock = document.getElementById('voice-status');
      const statusText = document.getElementById('voice-status-text');
      const resultArea = document.getElementById('voice-result-text');
      statusBlock?.classList.remove('hidden');
      document.getElementById('start-voice-btn').classList.add('hidden');
      document.getElementById('stop-voice-btn').classList.remove('hidden');
      isRecording = true;
      let finalTranscript = '';

      recognition.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        resultArea.value = finalTranscript + interim;
        if (statusText) statusText.textContent = '🔴 Запис іде...';
      };

      recognition.onerror = e => {
        if (statusText) statusText.textContent = `⚠️ Помилка: ${e.error}`;
      };

      recognition.onend = () => {
        isRecording = false;
        statusBlock?.classList.add('hidden');
        document.getElementById('stop-voice-btn')?.classList.add('hidden');
        document.getElementById('start-voice-btn')?.classList.remove('hidden');
        if (finalTranscript.trim()) {
          document.getElementById('copy-voice-btn')?.classList.remove('hidden');
          document.getElementById('save-voice-btn')?.classList.remove('hidden');
        }
        if (statusText) statusText.textContent = '✅ Запис завершено';
      };

      recognition.start();
    });

    document.getElementById('stop-voice-btn')?.addEventListener('click', () => {
      recognition?.stop();
    });

    document.getElementById('copy-voice-btn')?.addEventListener('click', () => {
      const text = document.getElementById('voice-result-text')?.value;
      navigator.clipboard?.writeText(text);
      Notifications.add('📋 Текст скопійовано');
    });

    document.getElementById('save-voice-btn')?.addEventListener('click', () => {
      const text = document.getElementById('voice-result-text')?.value?.trim();
      const target = document.getElementById('voice-target')?.value;
      if (!text) return;
      Store.save('activity_logs', {
        type: 'note',
        title: `🎙️ AI Voice-to-Text: ${target === 'contract' ? 'Текст договору' : 'Нотатка'}`,
        body: text,
        sentiment: 'neutral',
      });
      Notifications.add('💾 Текст збережено в журналі активностей');
      Store.save('ai_history', { tool: 'voice', input: 'Voice-to-Text', output: text.slice(0, 100), createdAt: new Date().toISOString() });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📷 OCR документа — 50 Короликів
  // ═══════════════════════════════════════════════════════════════════════

  function _renderOCRTool(panel) {
    const balance = KorolikyService.getBalance();
    const hasEnough = balance >= KorolikyService.AI_TOOL_COST;
    const status = KorolikyService.getDailyBonusStatus();

    panel.innerHTML = `
      <div class="card space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-gray-800 dark:text-gray-100">📷 Розпізнавання документа (OCR + AI)</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Завантажте фото/скан документа — витягнемо ПІБ, ІПН, суму, реквізити</p>
          </div>
          <span class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${hasEnough ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}">
            👑 50 Короликів
          </span>
        </div>

        <div class="p-3 ${hasEnough ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'} rounded-xl border">
          <p class="text-sm font-medium ${hasEnough ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}">
            ${hasEnough
              ? `👑 Баланс: ${balance} Короликів — достатньо для запуску`
              : `❌ Недостатньо Короликів (є ${balance}, потрібно 50)${!status.canClaim && status.timeLeft ? `. Наступний бонус через: ${status.timeLeft}` : ''}`
            }
          </p>
          ${!hasEnough && status.canClaim ? `
            <button id="claim-koroliky-ocr" class="btn-secondary text-xs mt-2">🎁 Отримати щоденний бонус +500</button>
          ` : ''}
        </div>

        ${hasEnough ? `
          <!-- Завантаження файлу -->
          <div>
            <label class="label">Оберіть файл документа</label>
            <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-indigo-400 transition-colors bg-gray-50 dark:bg-gray-700/30">
              <div class="text-center">
                <span class="text-3xl">📄</span>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">JPG, PNG, PDF, WEBP до 10MB</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Натисніть або перетягніть файл</p>
              </div>
              <input type="file" id="ocr-file-input" accept="image/*,.pdf" class="hidden" />
            </label>
            <div id="ocr-preview" class="hidden mt-2"></div>
          </div>

          <button id="run-ocr-btn" class="btn-primary" disabled>
            📷 Розпізнати документ (−50 👑)
          </button>

          <!-- Результат -->
          <div id="ocr-result-block" class="hidden space-y-3">
            <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <p class="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">✅ Витягнуті поля:</p>
              <div id="ocr-fields-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm"></div>
            </div>
            <div>
              <label class="label">Повний текст документа</label>
              <textarea id="ocr-full-text" rows="6" class="input resize-none font-mono text-xs" readonly></textarea>
            </div>
            <div class="flex gap-2">
              <button id="ocr-copy-btn" class="btn-secondary text-sm">📋 Копіювати</button>
              <button id="ocr-save-client-btn" class="btn-secondary text-sm">👤 Зберегти як клієнт</button>
              <button id="ocr-save-note-btn" class="btn-secondary text-sm">💾 Зберегти в нотатки</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Claim bonus
    document.getElementById('claim-koroliky-ocr')?.addEventListener('click', () => {
      const result = KorolikyService.checkAndClaimDailyBonus();
      if (result.claimed) {
        Notifications.add(`👑 +${result.amount} Короликів!`);
        _renderOCRTool(panel);
        Topbar.render();
      }
    });

    if (!hasEnough) return;

    let selectedFile = null;

    document.getElementById('ocr-file-input')?.addEventListener('change', e => {
      selectedFile = e.target.files[0];
      if (!selectedFile) return;

      const preview = document.getElementById('ocr-preview');
      const runBtn = document.getElementById('run-ocr-btn');
      runBtn.disabled = false;

      if (selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile);
        preview.innerHTML = `<img src="${url}" class="max-h-40 rounded-xl border border-gray-200 dark:border-gray-700 object-contain" alt="Превью" />`;
        preview.classList.remove('hidden');
      } else {
        preview.innerHTML = `<p class="text-sm text-gray-500">📄 ${selectedFile.name}</p>`;
        preview.classList.remove('hidden');
      }
    });

    document.getElementById('run-ocr-btn')?.addEventListener('click', async () => {
      if (!selectedFile) return;

      // Списання ПЕРЕД обробкою (атомарний захист)
      const charge = KorolikyService.chargeForAITool('OCR-Document');
      if (!charge.success) {
        Notifications.add(`❌ ${charge.error}`);
        _renderOCRTool(panel);
        return;
      }
      Notifications.add(`👑 Списано 50 Короликів. Баланс: ${charge.balance}`);
      Topbar.render();

      const btn = document.getElementById('run-ocr-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Розпізнаємо...';

      try {
        // Спроба 1: Tesseract.js (клієнтський OCR, безкоштовно)
        // Спроба 2: OpenAI Vision API (якщо є ключ)
        const result = await _runOCR(selectedFile);
        _displayOCRResult(result);
      } catch (err) {
        Notifications.add('⚠️ Помилка OCR: ' + err.message);
        btn.disabled = false;
        btn.textContent = '📷 Розпізнати документ (−50 👑)';
      }
    });
  }

  async function _runOCR(file) {
    const openAIKey = localStorage.getItem('saas_openai_key');

    // ── OpenAI Vision API (якщо є ключ) ───────────────────────────────
    if (openAIKey && file.type.startsWith('image/')) {
      return await _runOpenAIVision(file, openAIKey);
    }

    // ── Tesseract.js (клієнтський OCR, без ключа) ──────────────────────
    return await _runTesseract(file);
  }

  async function _runTesseract(file) {
    // Динамічно завантажуємо Tesseract.js
    if (!window.Tesseract) {
      await _loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    }

    const { data: { text } } = await window.Tesseract.recognize(file, 'ukr+eng', {
      logger: m => console.log('[Tesseract]', m),
    });

    return { rawText: text, fields: _parseDocumentFields(text), source: 'tesseract' };
  }

  async function _runOpenAIVision(file, apiKey) {
    const base64 = await _fileToBase64(file);
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Розпізнай текст з цього документа. Витягни: ПІБ, ІПН/ЄДРПОУ, дата, сума, валюта, IBAN, SWIFT, назва банку, реквізити, умови угоди. Відповідай у форматі JSON + повний розпізнаний текст.' },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } },
          ],
        }],
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI API: ${resp.status}`);
    const data = await resp.json();
    const content = data.choices[0]?.message?.content || '';

    // Намагаємось парсити JSON з відповіді
    let fields = {};
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) fields = JSON.parse(jsonMatch[1]);
    } catch {}

    return { rawText: content, fields, source: 'openai-vision' };
  }

  function _parseDocumentFields(text) {
    const fields = {};
    // ПІБ (патерн: Іванов Іван Іванович або Ivan Ivanov)
    const nameMatch = text.match(/([А-ЯІЇЄҐ][а-яіїєґ']+\s+[А-ЯІЇЄҐ][а-яіїєґ']+(?:\s+[А-ЯІЇЄҐ][а-яіїєґ']+)?)/);
    if (nameMatch) fields['ПІБ'] = nameMatch[1].trim();

    // ІПН (10 цифр)
    const ipnMatch = text.match(/(?:ІПН|РНОКПП|TIN)[:\s]*(\d{10})/i);
    if (ipnMatch) fields['ІПН'] = ipnMatch[1];

    // ЄДРПОУ (8 цифр)
    const edrMatch = text.match(/(?:ЄДРПОУ|EDRPOU)[:\s]*(\d{8})/i);
    if (edrMatch) fields['ЄДРПОУ'] = edrMatch[1];

    // Сума
    const amtMatch = text.match(/(?:сума|amount|total|разом)[:\s]*([0-9\s,\.]+(?:грн|UAH|USD|EUR|₴|\$|€)?)/i);
    if (amtMatch) fields['Сума'] = amtMatch[1].trim();

    // Дата
    const dateMatch = text.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
    if (dateMatch) fields['Дата'] = dateMatch[1];

    // IBAN
    const ibanMatch = text.match(/(UA\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d)/i);
    if (ibanMatch) fields['IBAN'] = ibanMatch[1].replace(/\s/g, '');

    return fields;
  }

  function _displayOCRResult({ rawText, fields, source }) {
    const block = document.getElementById('ocr-result-block');
    const fieldsGrid = document.getElementById('ocr-fields-grid');
    const fullText = document.getElementById('ocr-full-text');

    if (block) block.classList.remove('hidden');
    if (fullText) fullText.value = rawText;

    if (fieldsGrid) {
      const entries = Object.entries(fields);
      if (entries.length === 0) {
        fieldsGrid.innerHTML = '<p class="text-xs text-gray-400 col-span-2">Структурованих полів не знайдено — дивіться повний текст нижче</p>';
      } else {
        fieldsGrid.innerHTML = entries.map(([key, val]) => `
          <div class="bg-white dark:bg-gray-700/50 rounded-lg px-3 py-2">
            <p class="text-xs text-gray-400 uppercase font-medium">${key}</p>
            <p class="text-sm text-gray-800 dark:text-gray-100 font-semibold mt-0.5 break-all">${val}</p>
          </div>
        `).join('');
      }
    }

    const sourceLabels = { tesseract: 'Tesseract.js (локально)', 'openai-vision': 'OpenAI Vision API' };
    Notifications.add(`✅ OCR завершено (${sourceLabels[source] || source})`);
    Store.save('ai_history', { tool: 'ocr', input: 'OCR документа', output: JSON.stringify(fields).slice(0, 100), createdAt: new Date().toISOString() });

    // Events для кнопок
    document.getElementById('ocr-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(rawText);
      Notifications.add('📋 Текст скопійовано');
    });

    document.getElementById('ocr-save-note-btn')?.addEventListener('click', () => {
      Store.save('activity_logs', {
        type: 'note',
        title: '📷 AI OCR: Розпізнаний документ',
        body: rawText.slice(0, 2000),
        sentiment: 'neutral',
      });
      Notifications.add('💾 Збережено в журналі активностей');
    });

    document.getElementById('ocr-save-client-btn')?.addEventListener('click', () => {
      const name = fields['ПІБ'] || '';
      const taxId = fields['ІПН'] || fields['ЄДРПОУ'] || '';
      if (name) {
        Store.save('clients', { name, taxId, notes: `Автозаповнено з OCR: ${rawText.slice(0, 200)}` });
        Notifications.add(`👤 Клієнт "${name}" збережено`);
        EventBus.emit('data:changed');
      } else {
        Notifications.add('⚠️ ПІБ не знайдено — відредагуйте вручну у розділі Клієнти');
      }
    });
  }

  function _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  return { render, generateSummary, analyzeSentiment, generateObjectionResponse, generateProposal, generateFollowUp };
})();
