-- HALARYK — sapin communautaire Noël 2026
-- Migration opérationnelle : ouverture des contributions le 1er décembre 2026 à 00:00 (Europe/Paris).
-- Ne pas publier le front avant validation de l'auth Twitch et du déploiement.
-- 40 emplacements déterministes, ordre de pose par saut de 7, sérialisé par verrou transactionnel.
-- Aucun champ d'identité privée n'est exposé publiquement.
create table if not exists public.christmas_tree_ornaments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  season_year integer not null default 2026 check (season_year=2026),
  model text not null check (model in ('herbier','celeste','ancien','monde','baroque','velours','tartan','roses','oeuf','maison')),
  message text not null check (char_length(btrim(message)) between 1 and 180),
  anonymous boolean not null default false,
  position_index integer not null check (position_index between 1 and 40),
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now(),
  unique (author_id, season_year),
  unique (season_year, position_index)
);

alter table public.christmas_tree_ornaments enable row level security;
revoke all on table public.christmas_tree_ornaments from public, anon, authenticated;
-- Aucune policy de lecture pour anon/authenticated : toute lecture passe par une RPC filtrée.

-- Contrat public : ni author_id, ni login privé, ni indicateur de pseudonyme caché.
create or replace function public.christmas_tree_public_2026()
returns table (
  id uuid,
  model text,
  message text,
  author text,
  position_index integer
)
language sql stable security definer
set search_path = ''
as $fn$
  select
    o.id,
    o.model,
    o.message,
    case when o.anonymous then 'Anonyme'
         else coalesce(nullif(p.display_name,''),nullif(p.twitch_login,''),'Membre de la communauté') end as author,
    o.position_index
  from public.christmas_tree_ornaments o
  left join public.profiles p on p.id=o.author_id
  where o.season_year=2026 and o.status='visible'
    and now() >= '2026-12-01 00:00:00+01'::timestamptz
  order by o.position_index;
$fn$;
revoke all on function public.christmas_tree_public_2026() from public;
grant execute on function public.christmas_tree_public_2026() to anon, authenticated;

-- Contrat écriture : identité dérivée de l'auth réelle, jamais envoyée par le navigateur.
create or replace function public.christmas_tree_place_2026(
  p_model text, p_message text, p_anonymous boolean default false
)
returns uuid
language plpgsql security definer
set search_path = ''
as $fn$
declare
  uid uuid := auth.uid();
  cleaned text := btrim(coalesce(p_message,''));
  slot integer;
  created uuid;
  used_slots integer;
begin
  if uid is null then raise exception 'Connexion Twitch obligatoire'; end if;
  if not exists (
    select 1 from auth.users u
    where u.id=uid
      and (
        u.raw_app_meta_data->>'provider'='twitch'
        or u.raw_app_meta_data->'providers' @> '["twitch"]'::jsonb
      )
  ) then raise exception 'Compte Twitch requis'; end if;
  if now() < '2026-12-01 00:00:00+01'::timestamptz or now() >= '2027-01-01 00:00:00+01'::timestamptz
    then raise exception 'Le sapin est fermé'; end if;
  if p_model not in ('herbier','celeste','ancien','monde','baroque','velours','tartan','roses','oeuf','maison')
    then raise exception 'Modèle de décoration inconnu'; end if;
  if char_length(cleaned) not between 1 and 180 then raise exception 'Message : 1 à 180 caractères'; end if;
  if exists(select 1 from public.christmas_tree_ornaments o where o.author_id=uid and o.season_year=2026)
    then raise exception 'Une seule boule par compte Twitch'; end if;

  -- Empêcher deux validations simultanées de réclamer la même place.
  perform pg_catalog.pg_advisory_xact_lock(2026,40);

  -- Contrôler de nouveau sous verrou l'unicité par compte.
  if exists(select 1 from public.christmas_tree_ornaments o
            where o.author_id=uid and o.season_year=2026)
    then raise exception 'Une seule boule par compte Twitch'; end if;

  -- Compter aussi les boules masquées : leur place reste attribuée.
  select count(*)::integer into used_slots
  from public.christmas_tree_ornaments o where o.season_year=2026;
  if used_slots >=40 then raise exception 'Le sapin est complet'; end if;

  -- Emplacements cachés 1..40, rangés de haut en bas et de gauche à droite.
  -- Les visiteurs 1, 2, 3 ... prennent les places 7, 14, 21, 28, 35, 2 ...
  -- 7 est premier avec 40 : aucune place n'est attribuée deux fois.
  slot := (((used_slots+1)*7-1)%40)+1;
  insert into public.christmas_tree_ornaments
    (author_id,season_year,model,message,anonymous,position_index)
  values (uid,2026,p_model,cleaned,coalesce(p_anonymous,false),slot)
  returning id into created;
  return created;
end;
$fn$;
revoke all on function public.christmas_tree_place_2026(text,text,boolean) from public, anon;
grant execute on function public.christmas_tree_place_2026(text,text,boolean) to authenticated;

-- Lecture privée : identité réelle visible seulement après contrôle administrateur.
create or replace function public.christmas_tree_admin_2026()
returns table (
  id uuid, author_id uuid, author_login text, display_name text,
  message text, model text, anonymous boolean, position_index integer, status text, created_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $fn$
begin
  if auth.uid() is null or not public.current_is_admin()
    then raise exception 'Accès administrateur requis'; end if;
  return query
    select o.id,o.author_id,p.twitch_login,p.display_name,
           o.message,o.model,o.anonymous,o.position_index,o.status,o.created_at
    from public.christmas_tree_ornaments o
    left join public.profiles p on p.id=o.author_id
    where o.season_year=2026 order by o.created_at desc;
end;
$fn$;
revoke all on function public.christmas_tree_admin_2026() from public, anon;
grant execute on function public.christmas_tree_admin_2026() to authenticated;

create or replace function public.christmas_tree_set_visibility_2026(p_id uuid,p_visible boolean)
returns void
language plpgsql security definer
set search_path = ''
as $fn$
begin
  if auth.uid() is null or not public.current_is_admin()
    then raise exception 'Accès administrateur requis'; end if;
  update public.christmas_tree_ornaments
    set status=case when p_visible then 'visible' else 'hidden' end
    where id=p_id and season_year=2026;
end;
$fn$;
revoke all on function public.christmas_tree_set_visibility_2026(uuid,boolean) from public, anon;
grant execute on function public.christmas_tree_set_visibility_2026(uuid,boolean) to authenticated;

-- État de participation : ne renvoie aucune identité et évite une seconde tentative inutile.
create or replace function public.christmas_tree_has_placed_2026()
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select auth.uid() is not null and exists (
    select 1 from public.christmas_tree_ornaments o
    where o.season_year=2026 and o.author_id=auth.uid()
  );
$fn$;
revoke all on function public.christmas_tree_has_placed_2026() from public, anon;
grant execute on function public.christmas_tree_has_placed_2026() to authenticated;

-- Compteur des places utilisées : inclut aussi les messages masqués.
create or replace function public.christmas_tree_used_slots_2026()
returns integer
language sql stable security definer
set search_path = ''
as $fn$
  select count(*)::integer from public.christmas_tree_ornaments
  where season_year=2026;
$fn$;
revoke all on function public.christmas_tree_used_slots_2026() from public;
grant execute on function public.christmas_tree_used_slots_2026() to anon, authenticated;

