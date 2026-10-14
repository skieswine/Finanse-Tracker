-- =============================================================
-- Debts & loans ("I owe"). A repayment is an ordinary expense
-- transaction linked via transactions.debt_id; progress = sum of
-- linked repayments (EUR) vs debts.amount (EUR).
-- Also adds a default "Kredite & Schulden" expense category with a
-- few rules, for new and existing users. Additive; safe to re-run.
-- =============================================================

create table if not exists public.debts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 100),
  counterparty    text check (char_length(counterparty) <= 100),
  amount          numeric(12, 2) not null check (amount > 0),        -- total to repay, EUR
  monthly_payment numeric(12, 2) check (monthly_payment > 0),        -- optional plan, EUR
  due_date        date,
  note            text check (char_length(note) <= 1000),
  created_at      timestamptz not null default now()
);

alter table public.debts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'debts' and policyname = 'debts_select_own') then
    create policy "debts_select_own" on public.debts for select to authenticated using ((select auth.uid()) = user_id);
    create policy "debts_insert_own" on public.debts for insert to authenticated with check ((select auth.uid()) = user_id);
    create policy "debts_update_own" on public.debts for update to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
    create policy "debts_delete_own" on public.debts for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
end;
$$;

alter table public.transactions
  add column if not exists debt_id uuid references public.debts (id) on delete set null;

create index if not exists transactions_user_debt_idx on public.transactions (user_id, debt_id)
  where debt_id is not null;

-- ---------- default category + rules ----------
create or replace function public.seed_debt_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, kind, name, color, icon)
  values (p_user_id, 'expense', 'Kredite & Schulden', '#9333ea', 'banknote')
  on conflict (user_id, name) do nothing;

  insert into public.category_rules (user_id, pattern, field, category_id, priority)
  select p_user_id, v.pattern, 'description', c.id, -10
  from (values ('tilgung'), ('darlehen'), ('kreditrate'), ('ratenkredit'), ('ratenzahlung'), ('kreditkartenabrechnung')) as v(pattern)
  join public.categories c on c.user_id = p_user_id and c.name = 'Kredite & Schulden'
  where not exists (
    select 1 from public.category_rules r where r.user_id = p_user_id and lower(r.pattern) = v.pattern
  );
end;
$$;

revoke execute on function public.seed_debt_defaults(uuid) from public, anon, authenticated;

-- New users: categories, default rules, then debt defaults.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_user_defaults(new.id);
  perform public.seed_default_rules(new.id);
  perform public.seed_debt_defaults(new.id);
  return new;
end;
$$;

-- Existing users.
select public.seed_debt_defaults(id) from auth.users;
