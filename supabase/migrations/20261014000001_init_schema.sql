-- =============================================================
-- Finance Tracker — initial schema
-- Every table carries user_id and is protected by RLS
-- (user_id = auth.uid()).
-- =============================================================

-- ---------- Enums ----------
create type public.category_kind as enum ('income', 'expense', 'savings');
create type public.account_type as enum ('checking', 'savings', 'cash', 'credit');
create type public.transaction_source as enum ('manual', 'import');
create type public.rule_field as enum ('description', 'merchant');

-- ---------- Helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- accounts ----------
create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  type        public.account_type not null default 'checking',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- categories ----------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        public.category_kind not null,
  name        text not null check (char_length(name) between 1 and 60),
  color       text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon        text not null default 'circle',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- savings_goals ----------
create table public.savings_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  target      numeric(12, 2) not null check (target > 0),
  deadline    date,
  created_at  timestamptz not null default now()
);

-- ---------- import_batches ----------
-- Only metadata about an import. Raw files are never stored.
create table public.import_batches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name   text not null,
  file_type   text not null check (file_type in ('csv', 'pdf', 'docx', 'image')),
  parser_id   text not null,
  row_count   integer not null default 0 check (row_count >= 0),
  created_at  timestamptz not null default now()
);

-- ---------- transactions ----------
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date             date not null,
  amount           numeric(12, 2) not null check (amount <> 0), -- signed: + income, − outflow
  description      text not null default '',
  merchant         text,
  category_id      uuid references public.categories (id) on delete set null,
  account_id       uuid references public.accounts (id) on delete set null,
  savings_goal_id  uuid references public.savings_goals (id) on delete set null,
  source           public.transaction_source not null default 'manual',
  import_batch_id  uuid references public.import_batches (id) on delete set null,
  dedupe_hash      text,
  is_transfer      boolean not null default false,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_user_category_idx on public.transactions (user_id, category_id);
-- Not unique: two identical real transactions on the same day are possible;
-- the import review screen uses this index to pre-uncheck likely duplicates.
create index transactions_user_dedupe_idx on public.transactions (user_id, dedupe_hash)
  where dedupe_hash is not null;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------- category_rules ----------
-- pattern is matched case-insensitively as a substring of `field`.
create table public.category_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern      text not null check (char_length(pattern) between 1 and 200),
  field        public.rule_field not null default 'description',
  category_id  uuid not null references public.categories (id) on delete cascade,
  priority     integer not null default 0, -- higher wins
  created_at   timestamptz not null default now()
);

create index category_rules_user_priority_idx on public.category_rules (user_id, priority desc);

-- ---------- budgets ----------
-- "limit" is a reserved word in SQL and a query param in PostgREST,
-- so the column is called limit_amount.
create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id   uuid not null references public.categories (id) on delete cascade,
  month         date not null check (extract(day from month) = 1), -- first day of month
  limit_amount  numeric(12, 2) not null check (limit_amount > 0),
  created_at    timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- ---------- Row Level Security ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'savings_goals', 'import_batches',
    'transactions', 'category_rules', 'budgets'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "%1$s_select_own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
