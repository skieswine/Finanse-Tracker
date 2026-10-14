-- =============================================================
-- Default categories + one default account for every user.
-- Runs automatically for new users (trigger on auth.users) and once
-- for users that already exist when this migration is applied.
-- Idempotent: re-running never duplicates rows.
-- =============================================================

create or replace function public.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, kind, name, color, icon)
  values
    -- expense
    (p_user_id, 'expense', 'Lebensmittel',    '#16a34a', 'shopping-cart'),
    (p_user_id, 'expense', 'Miete',           '#dc2626', 'home'),
    (p_user_id, 'expense', 'Nebenkosten',     '#ea580c', 'zap'),
    (p_user_id, 'expense', 'Transport',       '#2563eb', 'bus'),
    (p_user_id, 'expense', 'Abos',            '#7c3aed', 'repeat'),
    (p_user_id, 'expense', 'Restaurants',     '#f59e0b', 'utensils'),
    (p_user_id, 'expense', 'Shopping',        '#db2777', 'shopping-bag'),
    (p_user_id, 'expense', 'Gesundheit',      '#0d9488', 'heart-pulse'),
    (p_user_id, 'expense', 'Versicherungen',  '#475569', 'shield'),
    (p_user_id, 'expense', 'Telefon & Internet', '#0891b2', 'smartphone'),
    (p_user_id, 'expense', 'Freizeit',        '#65a30d', 'party-popper'),
    (p_user_id, 'expense', 'Bildung',         '#4f46e5', 'graduation-cap'),
    (p_user_id, 'expense', 'Bargeld',         '#78716c', 'banknote'),
    (p_user_id, 'expense', 'Sonstiges',       '#64748b', 'circle'),
    -- income
    (p_user_id, 'income',  'Gehalt',          '#059669', 'briefcase'),
    (p_user_id, 'income',  'Nebenjob',        '#10b981', 'laptop'),
    (p_user_id, 'income',  'Erstattungen',    '#14b8a6', 'undo-2'),
    (p_user_id, 'income',  'Sonstige Einnahmen', '#22c55e', 'plus-circle'),
    -- savings
    (p_user_id, 'savings', 'Sparen',          '#0ea5e9', 'piggy-bank'),
    (p_user_id, 'savings', 'Notgroschen',     '#6366f1', 'life-buoy')
  on conflict (user_id, name) do nothing;

  insert into public.accounts (user_id, name, type)
  values (p_user_id, 'Girokonto', 'checking')
  on conflict (user_id, name) do nothing;
end;
$$;

-- Only callable by the trigger / migration, not via the API.
revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed users that already exist.
select public.seed_user_defaults(id) from auth.users;
