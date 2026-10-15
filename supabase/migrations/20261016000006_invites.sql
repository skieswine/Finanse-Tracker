-- =============================================================
-- Invite codes. Public sign-ups stay DISABLED in Supabase; the app's
-- server creates accounts (service role) only after redeeming a code.
-- The table has RLS on and NO policies: browsers (anon/authenticated)
-- can neither read nor write it — only the server with the service role.
-- Additive; safe to re-run.
-- =============================================================

create table if not exists public.invite_codes (
  code        text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  created_by  uuid references auth.users (id) on delete set null,
  note        text check (char_length(note) <= 100),
  max_uses    integer not null default 1 check (max_uses between 1 and 100),
  uses        integer not null default 0 check (uses >= 0),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
-- (intentionally no policies)

-- Atomically use one slot of a valid code. Returns true on success.
create or replace function public.redeem_invite(p_code text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with used as (
    update public.invite_codes
       set uses = uses + 1
     where code = upper(p_code)
       and uses < max_uses
       and (expires_at is null or expires_at > now())
    returning 1
  )
  select exists (select 1 from used);
$$;

-- Give the slot back if creating the account failed afterwards.
create or replace function public.release_invite(p_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.invite_codes set uses = greatest(uses - 1, 0) where code = upper(p_code);
$$;

revoke execute on function public.redeem_invite(text) from public, anon, authenticated;
revoke execute on function public.release_invite(text) from public, anon, authenticated;
grant execute on function public.redeem_invite(text) to service_role;
grant execute on function public.release_invite(text) to service_role;
