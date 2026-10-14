-- =============================================================
-- Multi-currency support.
-- transactions.amount stays in EUR (the base currency for every
-- total). A foreign-currency transaction additionally keeps the
-- original amount and the rate fixed at its date, so old reports
-- never drift with exchange rates.
-- Additive only; existing rows become EUR. Safe to re-run.
-- =============================================================

alter table public.accounts
  add column if not exists currency text not null default 'EUR'
    check (currency ~ '^[A-Z]{3}$');

alter table public.transactions
  add column if not exists currency text not null default 'EUR'
    check (currency ~ '^[A-Z]{3}$'),
  -- Signed amount in `currency`; null for EUR transactions.
  add column if not exists original_amount numeric(14, 2),
  -- Units of `currency` per 1 EUR on the transaction date; null for EUR.
  add column if not exists fx_rate numeric(18, 8);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_fx_consistent'
  ) then
    alter table public.transactions add constraint transactions_fx_consistent check (
      (currency = 'EUR' and original_amount is null and fx_rate is null)
      or (currency <> 'EUR' and original_amount is not null and original_amount <> 0 and fx_rate > 0)
    );
  end if;
end;
$$;
