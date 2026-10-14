-- =============================================================
-- Default category rules for common German merchants, so the first
-- import is already categorised. Priority -10: any rule the user
-- creates (priority 0) wins. Idempotent; safe to re-run.
-- Rules point at the default categories by name; if a category was
-- renamed or deleted, its default rules are simply skipped.
-- =============================================================

create or replace function public.seed_default_rules(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.category_rules (user_id, pattern, field, category_id, priority)
  select p_user_id, v.pattern, 'description', c.id, -10
  from (values
    -- Lebensmittel
    ('rewe', 'Lebensmittel'), ('lidl', 'Lebensmittel'), ('aldi', 'Lebensmittel'),
    ('edeka', 'Lebensmittel'), ('netto marken', 'Lebensmittel'), ('netto filiale', 'Lebensmittel'), ('penny', 'Lebensmittel'),
    ('kaufland', 'Lebensmittel'), ('norma', 'Lebensmittel'), ('tegut', 'Lebensmittel'),
    ('globus', 'Lebensmittel'), ('alnatura', 'Lebensmittel'), ('denns', 'Lebensmittel'),
    ('bäckerei', 'Lebensmittel'), ('baeckerei', 'Lebensmittel'),
    -- Restaurants
    ('lieferando', 'Restaurants'), ('mcdonald', 'Restaurants'), ('burger king', 'Restaurants'),
    ('starbucks', 'Restaurants'), ('wolt', 'Restaurants'), ('uber eats', 'Restaurants'),
    ('pizzeria', 'Restaurants'), ('restaurant', 'Restaurants'), ('vapiano', 'Restaurants'),
    ('kfc', 'Restaurants'), ('subway', 'Restaurants'),
    -- Transport
    ('deutsche bahn', 'Transport'), ('db vertrieb', 'Transport'), ('db fernverkehr', 'Transport'),
    ('fahrkarte', 'Transport'), ('deutschlandticket', 'Transport'), ('bvg', 'Transport'),
    ('mvg', 'Transport'), ('hvv', 'Transport'), ('rheinbahn', 'Transport'), ('kvb', 'Transport'),
    ('rmv', 'Transport'), ('flixbus', 'Transport'), ('uber', 'Transport'), ('bolt', 'Transport'),
    ('aral', 'Transport'), ('shell', 'Transport'), ('esso', 'Transport'), ('tankstelle', 'Transport'),
    -- Abos
    ('netflix', 'Abos'), ('spotify', 'Abos'), ('disney', 'Abos'), ('amazon prime', 'Abos'),
    ('prime video', 'Abos'), ('youtube', 'Abos'), ('apple.com/bill', 'Abos'), ('icloud', 'Abos'),
    ('audible', 'Abos'), ('dazn', 'Abos'), ('sky deutschland', 'Abos'), ('patreon', 'Abos'),
    -- Telefon & Internet
    ('telekom', 'Telefon & Internet'), ('vodafone', 'Telefon & Internet'),
    ('telefonica', 'Telefon & Internet'), ('1&1', 'Telefon & Internet'),
    ('congstar', 'Telefon & Internet'), ('fraenk', 'Telefon & Internet'),
    ('aldi talk', 'Telefon & Internet'),
    -- Miete / Nebenkosten
    ('miete', 'Miete'), ('hausverwaltung', 'Miete'),
    ('stadtwerke', 'Nebenkosten'), ('rundfunk', 'Nebenkosten'), ('e.on', 'Nebenkosten'),
    ('vattenfall', 'Nebenkosten'), ('enbw', 'Nebenkosten'), ('strom', 'Nebenkosten'),
    -- Versicherungen / Gesundheit
    ('versicherung', 'Versicherungen'), ('allianz', 'Versicherungen'), ('huk-coburg', 'Versicherungen'),
    ('haftpflicht', 'Versicherungen'), ('krankenkasse', 'Versicherungen'),
    ('apotheke', 'Gesundheit'), ('arzt', 'Gesundheit'), ('docmorris', 'Gesundheit'),
    -- Shopping
    ('amazon', 'Shopping'), ('zalando', 'Shopping'), ('ikea', 'Shopping'), ('h&m', 'Shopping'),
    ('mediamarkt', 'Shopping'), ('media markt', 'Shopping'), ('saturn', 'Shopping'),
    ('ebay', 'Shopping'), ('dm-drogerie', 'Shopping'), ('dm drogerie', 'Shopping'),
    ('rossmann', 'Shopping'), ('decathlon', 'Shopping'),
    -- Freizeit / Bildung
    ('kino', 'Freizeit'), ('cinemaxx', 'Freizeit'), ('mcfit', 'Freizeit'),
    ('urban sports', 'Freizeit'), ('fitness', 'Freizeit'), ('eventim', 'Freizeit'), ('steam', 'Freizeit'),
    ('udemy', 'Bildung'), ('semesterbeitrag', 'Bildung'), ('studierendenwerk', 'Bildung'),
    ('hochschule', 'Bildung'), ('universität', 'Bildung'),
    -- Bargeld
    ('bargeld', 'Bargeld'), ('geldautomat', 'Bargeld'),
    -- Einnahmen
    ('gehalt', 'Gehalt'), ('lohn', 'Gehalt'), ('bezüge', 'Gehalt'),
    ('erstattung', 'Erstattungen'), ('rückzahlung', 'Erstattungen'),
    -- Sparen
    ('sparplan', 'Sparen'), ('sparen', 'Sparen')
  ) as v(pattern, category_name)
  join public.categories c on c.user_id = p_user_id and c.name = v.category_name
  where not exists (
    select 1 from public.category_rules r
    where r.user_id = p_user_id and lower(r.pattern) = v.pattern
  );
end;
$$;

revoke execute on function public.seed_default_rules(uuid) from public, anon, authenticated;

-- New users: categories first, then rules that reference them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_user_defaults(new.id);
  perform public.seed_default_rules(new.id);
  return new;
end;
$$;

-- Existing users.
select public.seed_default_rules(id) from auth.users;
