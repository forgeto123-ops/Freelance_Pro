/**
 * I18nService — інтернаціоналізація інтерфейсу (10 мов)
 *
 * Принцип роботи:
 *  - Елементам з атрибутом data-i18n="key" підставляється перекладений текст
 *  - data-i18n-placeholder="key" — для placeholder атрибутів
 *  - data-i18n-title="key" — для title атрибутів
 *  - Переклад виконується через textContent / setAttribute — innerHTML не чіпається,
 *    тому обробники подій не злітають.
 *
 * Мови: uk, en, pl, de, es, fr, it, pt, cs, tr
 */
const I18nService = (() => {

  const LANG_KEY = 'saas_ui_language';

  const LANGUAGES = {
    uk: { name: 'Українська',  flag: '🇺🇦' },
    en: { name: 'English',      flag: '🇬🇧' },
    pl: { name: 'Polski',        flag: '🇵🇱' },
    de: { name: 'Deutsch',      flag: '🇩🇪' },
    es: { name: 'Español',      flag: '🇪🇸' },
    fr: { name: 'Français',     flag: '🇫🇷' },
    it: { name: 'Italiano',     flag: '🇮🇹' },
    pt: { name: 'Português',    flag: '🇵🇹' },
    cs: { name: 'Čeština',      flag: '🇨🇿' },
    tr: { name: 'Türkçe',       flag: '🇹🇷' },
  };

  // Словник ключів для кожної мови
  const DICT = {
    // ── Sidebar / Navigation ────────────────────────────────────────────
    'nav.analytics':    { uk: 'Аналітика',    en: 'Analytics',    pl: 'Analityka',   de: 'Analytik',    es: 'Analítica',   fr: 'Analytique',  it: 'Analitica',   pt: 'Analítica',   cs: 'Analytika',  tr: 'Analiz' },
    'nav.finance':      { uk: 'Фінанси',      en: 'Finance',       pl: 'Finanse',     de: 'Finanzen',    es: 'Finanzas',    fr: 'Finances',    it: 'Finanze',     pt: 'Finanças',    cs: 'Finance',    tr: 'Finans' },
    'nav.crm':          { uk: 'CRM',          en: 'CRM',           pl: 'CRM',         de: 'CRM',         es: 'CRM',         fr: 'CRM',         it: 'CRM',         pt: 'CRM',         cs: 'CRM',         tr: 'CRM' },
    'nav.ai_settings':  { uk: 'AI та налаштування', en: 'AI & Settings', pl: 'AI i ustawienia', de: 'KI & Einstellungen', es: 'IA y ajustes', fr: 'IA et paramètres', it: 'IA e impostazioni', pt: 'IA e configurações', cs: 'AI a nastavení', tr: 'AI ve ayarlar' },
    'nav.dashboard':    { uk: 'Dashboard',    en: 'Dashboard',     pl: 'Pulpit',      de: 'Dashboard',   es: 'Panel',       fr: 'Tableau',     it: 'Dashboard',   pt: 'Painel',      cs: 'Plocha',     tr: 'Panel' },
    'nav.invoices':     { uk: 'Інвойси',      en: 'Invoices',      pl: 'Faktury',     de: 'Rechnungen',  es: 'Facturas',    fr: 'Factures',    it: 'Fatture',     pt: 'Faturas',     cs: 'Faktury',    tr: 'Faturalar' },
    'nav.expenses':     { uk: 'Витрати',      en: 'Expenses',      pl: 'Wydatki',     de: 'Ausgaben',    es: 'Gastos',      fr: 'Dépenses',    it: 'Spese',       pt: 'Despesas',    cs: 'Výdaje',     tr: 'Giderler' },
    'nav.clients':      { uk: 'Клієнти',      en: 'Clients',       pl: 'Klienci',     de: 'Kunden',      es: 'Clientes',    fr: 'Clients',     it: 'Clienti',      pt: 'Clientes',    cs: 'Klienti',    tr: 'Müşteriler' },
    'nav.deals':        { uk: 'Угоди',        en: 'Deals',         pl: 'Transakcje',  de: 'Geschäfte',   es: 'Acuerdos',    fr: 'Affaires',    it: 'Affari',       pt: 'Negócios',    cs: 'Obchody',    tr: 'Anlaşmalar' },
    'nav.projects':     { uk: 'Проєкти',      en: 'Projects',      pl: 'Projekty',    de: 'Projekte',    es: 'Proyectos',   fr: 'Projets',     it: 'Progetti',     pt: 'Projetos',    cs: 'Projekty',   tr: 'Projeler' },
    'nav.activity':     { uk: 'Активності',   en: 'Activities',    pl: 'Aktywności',  de: 'Aktivitäten', es: 'Actividades', fr: 'Activités',   it: 'Attività',     pt: 'Atividades',  cs: 'Aktivity',   tr: 'Aktiviteler' },
    'nav.portal':       { uk: 'Портал клієнта', en: 'Client Portal', pl: 'Portal klienta', de: 'Kundenportal', es: 'Portal del cliente', fr: 'Portail client', it: 'Portale cliente', pt: 'Portal do cliente', cs: 'Klientský portál', tr: 'Müşteri portalı' },
    'nav.ai_assistant': { uk: 'AI Помічник',  en: 'AI Assistant',  pl: 'Asystent AI', de: 'KI-Assistent', es: 'Asistente IA', fr: 'Assistant IA', it: 'Assistente IA', pt: 'Assistente IA', cs: 'AI Asistent', tr: 'AI Asistan' },
    'nav.settings':     { uk: 'Налаштування', en: 'Settings',      pl: 'Ustawienia',  de: 'Einstellungen', es: 'Ajustes',   fr: 'Paramètres',  it: 'Impostazioni', pt: 'Configurações', cs: 'Nastavení', tr: 'Ayarlar' },
    'nav.legal':        { uk: 'Правила та конфіденційність', en: 'Legal & Privacy', pl: 'Prawo i prywatność', de: 'Recht & Datenschutz', es: 'Legal y privacidad', fr: 'Juridique et confidentialité', it: 'Legale e privacy', pt: 'Legal e privacidade', cs: 'Právo a soukromí', tr: 'Yasal ve gizlilik' },

    // ── Common ──────────────────────────────────────────────────────────
    'common.add':       { uk: 'Додати',       en: 'Add',           pl: 'Dodaj',       de: 'Hinzufügen',  es: 'Añadir',      fr: 'Ajouter',     it: 'Aggiungi',     pt: 'Adicionar',   cs: 'Přidat',     tr: 'Ekle' },
    'common.save':      { uk: 'Зберегти',     en: 'Save',          pl: 'Zapisz',      de: 'Speichern',   es: 'Guardar',     fr: 'Enregistrer', it: 'Salva',        pt: 'Salvar',      cs: 'Uložit',     tr: 'Kaydet' },
    'common.cancel':    { uk: 'Скасувати',    en: 'Cancel',        pl: 'Anuluj',      de: 'Abbrechen',   es: 'Cancelar',    fr: 'Annuler',     it: 'Annulla',      pt: 'Cancelar',    cs: 'Zrušit',     tr: 'İptal' },
    'common.delete':    { uk: 'Видалити',     en: 'Delete',        pl: 'Usuń',        de: 'Löschen',    es: 'Eliminar',    fr: 'Supprimer',   it: 'Elimina',      pt: 'Excluir',     cs: 'Smazat',     tr: 'Sil' },
    'common.edit':      { uk: 'Редагувати',   en: 'Edit',          pl: 'Edytuj',      de: 'Bearbeiten',  es: 'Editar',      fr: 'Modifier',    it: 'Modifica',     pt: 'Editar',      cs: 'Upravit',    tr: 'Düzenle' },
    'common.search':    { uk: 'Пошук...',     en: 'Search...',     pl: 'Szukaj...',   de: 'Suche...',    es: 'Buscar...',   fr: 'Rechercher...', it: 'Cerca...',   pt: 'Pesquisar...', cs: 'Hledat...',  tr: 'Ara...' },
    'common.create':    { uk: 'Створити',     en: 'Create',        pl: 'Utwórz',      de: 'Erstellen',   es: 'Crear',       fr: 'Créer',       it: 'Crea',         pt: 'Criar',       cs: 'Vytvořit',   tr: 'Oluştur' },

    // ── Settings page ───────────────────────────────────────────────────
    'settings.title':       { uk: 'Налаштування', en: 'Settings', pl: 'Ustawienia', de: 'Einstellungen', es: 'Ajustes', fr: 'Paramètres', it: 'Impostazioni', pt: 'Configurações', cs: 'Nastavení', tr: 'Ayarlar' },
    'settings.profile':     { uk: 'Профіль',     en: 'Profile',   pl: 'Profil',     de: 'Profil',      es: 'Perfil',    fr: 'Profil',     it: 'Profil',       pt: 'Perfil',      cs: 'Profil',    tr: 'Profil' },
    'settings.language':    { uk: 'Мова інтерфейсу', en: 'Interface Language', pl: 'Język interfejsu', de: 'Oberflächensprache', es: 'Idioma de la interfaz', fr: 'Langue de l\'interface', it: 'Lingua interfaccia', pt: 'Idioma da interface', cs: 'Jazyk rozhraní', tr: 'Arayüz dili' },
    'settings.bank_accounts': { uk: 'Банківські реквізити', en: 'Bank Accounts', pl: 'Dane bankowe', de: 'Bankkonten', es: 'Cuentas bancarias', fr: 'Comptes bancaires', it: 'Conti bancari', pt: 'Contas bancárias', cs: 'Bankovní účty', tr: 'Banka hesapları' },
    'settings.payment_gateway': { uk: 'Платіжний шлюз', en: 'Payment Gateway', pl: 'Bramka płatności', de: 'Zahlungsgateway', es: 'Pasarela de pago', fr: 'Passerelle de paiement', it: 'Gateway di pagamento', pt: 'Gateway de pagamento', cs: 'Platební brána', tr: 'Ödeme ağ geçidi' },

    // ── AI Assistant ─────────────────────────────────────────────────────
    'ai.title':         { uk: 'AI-помічник для продажів', en: 'AI Sales Assistant', pl: 'Asystent sprzedaży AI', de: 'KI-Vertriebsassistent', es: 'Asistente de ventas IA', fr: 'Assistant commercial IA', it: 'Assistente vendite IA', pt: 'Assistente de vendas IA', cs: 'AI asistent prodeje', tr: 'AI Satış Asistanı' },
    'ai.objection':     { uk: 'Відповідь на заперечення', en: 'Objection Response', pl: 'Odpowiedź na obiekcję', de: 'Einspruch-Antwort', es: 'Respuesta a objeción', fr: 'Réponse à objection', it: 'Risposta a obiezione', pt: 'Resposta a objeção', cs: 'Odpověď na námitku', tr: 'İtiraz yanıtı' },
    'ai.tone':          { uk: 'Тон відповіді', en: 'Response Tone', pl: 'Ton odpowiedzi', de: 'Antwortton', es: 'Tono de respuesta', fr: 'Ton de réponse', it: 'Tono risposta', pt: 'Tom da resposta', cs: 'Tón odpovědi', tr: 'Yanıt tonu' },
    'ai.tone.professional': { uk: 'Професійний', en: 'Professional', pl: 'Profesjonalny', de: 'Professionell', es: 'Profesional', fr: 'Professionnel', it: 'Professionale', pt: 'Profissional', cs: 'Profesionální', tr: 'Profesyonel' },
    'ai.tone.friendly':    { uk: 'Дружній', en: 'Friendly', pl: 'Przyjazny', de: 'Freundlich', es: 'Amistoso', fr: 'Amical', it: 'Amichevole', pt: 'Amigável', cs: 'Přátelský', tr: 'Dostane' },
    'ai.tone.concise':     { uk: 'Лаконічний', en: 'Concise', pl: 'Zwięzły', de: 'Prägnant', es: 'Conciso', fr: 'Concis', it: 'Conciso', pt: 'Conciso', cs: 'Stručný', tr: 'Öz' },
    'ai.generate':         { uk: 'Згенерувати відповідь', en: 'Generate Response', pl: 'Generuj odpowiedź', de: 'Antwort generieren', es: 'Generar respuesta', fr: 'Générer réponse', it: 'Genera risposta', pt: 'Gerar resposta', cs: 'Generovat odpověď', tr: 'Yanıt oluştur' },

    // ── Clients ─────────────────────────────────────────────────────────
    'clients.title':    { uk: 'База клієнтів', en: 'Client Database', pl: 'Baza klientów', de: 'Kundendatenbank', es: 'Base de clientes', fr: 'Base de clients', it: 'Database clienti', pt: 'Base de clientes', cs: 'Databáze klientů', tr: 'Müşteri veritabanı' },
    'clients.add':       { uk: 'Додати клієнта', en: 'Add Client', pl: 'Dodaj klienta', de: 'Kunde hinzufügen', es: 'Añadir cliente', fr: 'Ajouter client', it: 'Aggiungi cliente', pt: 'Adicionar cliente', cs: 'Přidat klienta', tr: 'Müşteri ekle' },
    'clients.regular':   { uk: 'Постійний', en: 'Regular', pl: 'Stały', de: 'Stamm', es: 'Permanente', fr: 'Régulier', it: 'Abituale', pt: 'Permanente', cs: 'Stálý', tr: 'Sabit' },

    // ── Invoices ────────────────────────────────────────────────────────
    'invoices.title':     { uk: 'Інвойси', en: 'Invoices', pl: 'Faktury', de: 'Rechnungen', es: 'Facturas', fr: 'Factures', it: 'Fatture', pt: 'Faturas', cs: 'Faktury', tr: 'Faturalar' },
    'invoices.create':    { uk: 'Створити інвойс', en: 'Create Invoice', pl: 'Utwórz fakturę', de: 'Rechnung erstellen', es: 'Crear factura', fr: 'Créer facture', it: 'Crea fattura', pt: 'Criar fatura', cs: 'Vytvořit fakturu', tr: 'Fatura oluştur' },
    'invoices.paid':      { uk: 'Оплачено', en: 'Paid', pl: 'Opłacone', de: 'Bezahlt', es: 'Pagado', fr: 'Payé', it: 'Pagato', pt: 'Pago', cs: 'Zaplaceno', tr: 'Ödendi' },
    'invoices.refunded':  { uk: 'Повернення здійснено', en: 'Refund Processed', pl: 'Zwrot wykonany', de: 'Rückerstattung erfolgt', es: 'Reembolso procesado', fr: 'Remboursement effectué', it: 'Rimborso elaborato', pt: 'Reembolso processado', cs: 'Vrácení provedeno', tr: 'İade yapıldı' },
    'invoices.refund':    { uk: 'Повернути кошти', en: 'Refund', pl: 'Zwróć środki', de: 'Erstatten', es: 'Reembolsar', fr: 'Rembourser', it: 'Rimborsa', pt: 'Reembolsar', cs: 'Vrátit', tr: 'İade et' },
    'invoices.payer_info': { uk: 'Дані платника', en: 'Payer Info', pl: 'Dane płatnika', de: 'Zahlerdaten', es: 'Datos del pagador', fr: 'Données du payeur', it: 'Dati pagatore', pt: 'Dados do pagador', cs: 'Údaje plátce', tr: 'Ödeyen bilgileri' },
    'invoices.draft':     { uk: 'Чернетка', en: 'Draft', pl: 'Robocza', de: 'Entwurf', es: 'Borrador', fr: 'Brouillon', it: 'Bozza', pt: 'Rascunho', cs: 'Koncept', tr: 'Taslak' },
    'invoices.sent':      { uk: 'Відправлено', en: 'Sent', pl: 'Wysłane', de: 'Gesendet', es: 'Enviado', fr: 'Envoyé', it: 'Inviato', pt: 'Enviado', cs: 'Odesláno', tr: 'Gönderildi' },
    'invoices.overdue':   { uk: 'Прострочено', en: 'Overdue', pl: 'Zaległe', de: 'Überfällig', es: 'Vencido', fr: 'En retard', it: 'Scaduto', pt: 'Vencido', cs: 'Po splatnosti', tr: 'Gecikmiş' },

    // ── Legal / Privacy ─────────────────────────────────────────────────
    'legal.title':       { uk: 'Авторські права та конфіденційність', en: 'Copyright & Privacy', pl: 'Prawo autorskie i prywatność', de: 'Urheberrecht & Datenschutz', es: 'Derechos de autor y privacidad', fr: 'Droits d\'auteur et confidentialité', it: 'Diritti d\'autore e privacy', pt: 'Direitos autorais e privacidade', cs: 'Autorská práva a soukromí', tr: 'Telif hakkı ve gizlilik' },
    'legal.copyright':  { uk: 'Авторські права', en: 'Copyright', pl: 'Prawo autorskie', de: 'Urheberrecht', es: 'Derechos de autor', fr: 'Droits d\'auteur', it: 'Diritti d\'autore', pt: 'Direitos autorais', cs: 'Autorská práva', tr: 'Telif hakkı' },
    'legal.privacy':     { uk: 'Політика конфіденційності', en: 'Privacy Policy', pl: 'Polityka prywatności', de: 'Datenschutzrichtlinie', es: 'Política de privacidad', fr: 'Politique de confidentialité', it: 'Informativa sulla privacy', pt: 'Política de privacidade', cs: 'Zásady ochrany soukromí', tr: 'Gizlilik politikası' },
    'legal.terms':       { uk: 'Умови використання', en: 'Terms of Use', pl: 'Warunki korzystania', de: 'Nutzungsbedingungen', es: 'Términos de uso', fr: 'Conditions d\'utilisation', it: 'Termini di utilizzo', pt: 'Termos de uso', cs: 'Podmínky použití', tr: 'Kullanım şartları' },
    'legal.consent':     { uk: 'Я погоджуюсь з Політикою конфіденційності та Умовами використання', en: 'I agree to the Privacy Policy and Terms of Use', pl: 'Zgadzam się z Polityką prywatności i Warunkami korzystania', de: 'Ich stimme der Datenschutzrichtlinie und den Nutzungsbedingungen zu', es: 'Acepto la Política de privacidad y los Términos de uso', fr: 'J\'accepte la Politique de confidentialité et les Conditions d\'utilisation', it: 'Accetto l\'Informativa sulla privacy e i Termini di utilizzo', pt: 'Aceito a Política de privacidade e os Termos de uso', cs: 'Souhlasím se Zásadami ochrany soukromí a Podmínkami použití', tr: 'Gizlilik Politikası ve Kullanım Şartlarını kabul ediyorum' },
  };

  let _currentLang = 'uk';

  function getCurrentLang() { return _currentLang; }
  function getLanguages() { return LANGUAGES; }

  function init() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGUAGES[saved]) {
      _currentLang = saved;
    }
  }

  function setLanguage(lang) {
    if (!LANGUAGES[lang]) return;
    _currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations();
    EventBus.emit('i18n:changed', lang);
  }

  /**
   * Повертає перекладений текст за ключем.
   */
  function t(key) {
    const entry = DICT[key];
    if (!entry) return key;
    return entry[_currentLang] || entry['uk'] || key;
  }

  /**
   * Проходить по DOM та замінює текст через textContent/setAttribute
   * не зачіпаючи innerHTML — обробники подій залишаються.
   */
  function applyTranslations(root = document) {
    // data-i18n — textContent
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      el.textContent = text;
    });

    // data-i18n-placeholder
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });

    // data-i18n-title
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', t(key));
    });
  }

  /**
   * Рендерить select для вибору мови.
   */
  function renderLanguageSelector(selectedId = 'lang-select') {
    return `
      <select id="${selectedId}" class="input">
        ${Object.entries(LANGUAGES).map(([code, lang]) =>
          `<option value="${code}" ${code === _currentLang ? 'selected' : ''}>${lang.flag} ${lang.name}</option>`
        ).join('')}
      </select>
    `;
  }

  return {
    init,
    t,
    setLanguage,
    getCurrentLang,
    getLanguages,
    applyTranslations,
    renderLanguageSelector,
  };
})();
