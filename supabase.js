/**
 * Supabase integration layer
 * Provides real-time sync with Supabase PostgreSQL when configured.
 * Falls back to localStorage (Store) when not configured.
 *
 * Setup: go to Settings → Supabase, enter your project URL + anon key.
 * SQL schema to run in Supabase SQL editor is available in Settings.
 */
const SupabaseService = (() => {
  // Built-in default Supabase project credentials.
  // Used automatically when the user hasn't configured their own in Settings.
  const DEFAULT_URL = 'https://bzjcilircwhwuhaujaip.supabase.co';
  const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6amNpbGlyY3dod3VoYXVqYWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2Njc1NDMsImV4cCI6MjExMDI0MzU0M30.zJ9_OTLSQdfVmupMFYXKyVFaBNQm3ZtNF8jA6U_-rlc';

  let _client = null;
  let _syncEnabled = false;
  let _syncStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'

  const SCHEMA_SQL = `
-- Run this in your Supabase SQL editor to create all required tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients / Leads
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company text,
  email text,
  phone text,
  address text,
  tax_id text,
  notes text,
  status text default 'active',  -- active | lead | inactive
  tags text[] default '{}',
  lead_source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Deals / Sales pipeline
create table if not exists deals (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  client_id uuid references clients(id),
  amount numeric default 0,
  probability integer default 50,  -- 0-100%
  stage text default 'new',        -- new | contacted | proposal | negotiation | won | lost
  expected_close date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects (extends existing)
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_id uuid references clients(id),
  status text default 'in-progress',
  deadline date,
  budget numeric,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoices
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  client_id uuid references clients(id),
  issue_date date,
  due_date date,
  currency text default 'UAH',
  vat_rate numeric default 0,
  discount numeric default 0,
  items jsonb default '[]',
  subtotal numeric default 0,
  discount_amt numeric default 0,
  vat_amt numeric default 0,
  total numeric default 0,
  status text default 'draft',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expenses & Income
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  type text default 'expense',
  description text not null,
  amount numeric not null,
  date date,
  category text,
  note text,
  created_at timestamptz default now()
);

-- Activity logs
create table if not exists activity_logs (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id),
  deal_id uuid references deals(id),
  project_id uuid references projects(id),
  type text not null,  -- call | note | email | meeting | status_change | payment
  title text not null,
  body text,
  sentiment text,      -- positive | neutral | negative
  created_at timestamptz default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  channel text,
  channel_label text,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Bank accounts (payment requisites)
create table if not exists bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  bank_name text not null,
  recipient_name text not null,
  iban text not null,
  card_number text,
  card_number_raw text,
  swift_bic text,
  currency text default 'UAH',
  payment_purpose text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Payment transactions
create table if not exists payment_transactions (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id),
  invoice_number text,
  amount numeric,
  currency text,
  provider text,
  sandbox_mode boolean default true,
  transaction_id text unique,
  status text default 'pending',
  sandbox_simulated boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security (enable for production)
-- alter table clients enable row level security;
-- create policy "Users see own data" on clients for all using (auth.uid() = user_id);
`;

  function getConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem('saas_supabase_config') || 'null');
      if (saved?.url && saved?.key) return saved;
    } catch { /* ignore */ }
    // Fall back to built-in default credentials
    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  }

  function saveConfig(url, key) {
    localStorage.setItem('saas_supabase_config', JSON.stringify({ url, key }));
  }

  async function connect() {
    const config = getConfig();
    if (!config?.url || !config?.key) {
      _syncStatus = 'disconnected';
      EventBus.emit('supabase:status', _syncStatus);
      return false;
    }

    _syncStatus = 'connecting';
    EventBus.emit('supabase:status', _syncStatus);

    try {
      // Dynamic load of Supabase client library
      if (!window.supabase) {
        await _loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      }
      _client = window.supabase.createClient(config.url, config.key);

      // Test connection — auth.getUser() works without any tables
      const { error } = await _client.auth.getUser();
      // "Auth session missing" / no-session is normal for a not-yet-logged-in user
      if (error && !/session|missing|not_found/i.test(error.message)) throw error;

      _syncEnabled = true;
      _syncStatus = 'connected';
      EventBus.emit('supabase:status', _syncStatus);
      Notifications.add('✅ Supabase підключено! Дані синхронізуються.', 'telegram');
      return true;
    } catch (e) {
      _syncStatus = 'error';
      _client = null;
      _syncEnabled = false;
      EventBus.emit('supabase:status', _syncStatus);
      Notifications.add(`❌ Помилка Supabase: ${e.message}`, 'email');
      return false;
    }
  }

  function disconnect() {
    _client = null;
    _syncEnabled = false;
    _syncStatus = 'disconnected';
    localStorage.removeItem('saas_supabase_config');
    EventBus.emit('supabase:status', _syncStatus);
  }

  function getStatus() { return _syncStatus; }
  function isConnected() { return _syncEnabled && _client !== null; }
  function getClient() { return _client; }
  function getSchema() { return SCHEMA_SQL; }

  async function syncToSupabase(collection) {
    if (!isConnected()) return;
    const data = Store.getAll(collection);
    // Map camelCase to snake_case for Supabase
    const mapped = data.map(item => _toSnakeCase(item));
    try {
      await _client.from(collection).upsert(mapped, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase sync error:', e);
    }
  }

  async function fetchFromSupabase(collection) {
    if (!isConnected()) return null;
    try {
      const { data, error } = await _client.from(collection).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(item => _toCamelCase(item));
    } catch (e) {
      console.warn('Supabase fetch error:', e);
      return null;
    }
  }

  function _toSnakeCase(obj) {
    const result = {};
    Object.keys(obj).forEach(k => {
      const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snake] = obj[k];
    });
    return result;
  }

  function _toCamelCase(obj) {
    const result = {};
    Object.keys(obj).forEach(k => {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = obj[k];
    });
    return result;
  }

  function _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  return { getConfig, saveConfig, connect, disconnect, getStatus, isConnected, getClient, getSchema, syncToSupabase, fetchFromSupabase };
})();
