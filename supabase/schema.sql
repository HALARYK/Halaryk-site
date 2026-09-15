-- HALARYK V4 révisée — Supabase schema
-- Suggestions + votes + ludothèque + sondages + réputation + collaborateurs.

create extension if not exists pgcrypto;

do $$ begin create type public.suggestion_status as enum ('new','considering','planned','completed','rejected','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.game_status as enum ('playing','backlog','completed','wishlist','paused','abandoned'); exception when duplicate_object then null; end $$;
do $$ begin create type public.poll_results_visibility as enum ('always','after_vote','after_close'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  twitch_user_id text,
  twitch_login text,
  display_name text not null default 'Viewer',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists twitch_user_id text;
create unique index if not exists profiles_twitch_user_id_uq on public.profiles(twitch_user_id) where twitch_user_id is not null;

create table if not exists public.admins(
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.suggestions(
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check(category in('games','concepts','twitch','community','events','other')),
  title text not null check(char_length(title) between 3 and 120),
  body text not null check(char_length(body) between 3 and 1200),
  status public.suggestion_status not null default 'new',
  official_reply text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suggestion_votes(
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(suggestion_id,voter_id)
);

create table if not exists public.library_games(
  id uuid primary key default gen_random_uuid(),
  igdb_id bigint unique,
  name text not null,
  slug text,
  cover_url text,
  genres text[] not null default '{}',
  platforms text[] not null default '{}',
  release_date date,
  developer text,
  summary text,
  status public.game_status not null default 'wishlist',
  streamed boolean not null default false,
  personal_note text,
  rating numeric(3,1),
  playtime_hours numeric(10,1) check (playtime_hours is null or playtime_hours >= 0),
  source_suggestion_id uuid references public.suggestions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.library_games add column if not exists developer text;
alter table public.library_games add column if not exists summary text;

create table if not exists public.site_clips(
  position smallint primary key check(position between 1 and 4),
  clip_slug text not null check(char_length(clip_slug) between 2 and 160),
  clip_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.polls(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  allow_multiple boolean not null default false,
  results_visibility public.poll_results_visibility not null default 'after_vote',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.poll_options(
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position integer not null default 0
);
create table if not exists public.poll_votes(
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(poll_id,option_id,voter_id)
);

-- Miroir du score Streamer.bot. Streamer.bot reste la source de vérité.
create table if not exists public.reputation_scores(
  id uuid primary key default gen_random_uuid(),
  twitch_user_id text,
  twitch_login text not null,
  display_name text not null,
  avatar_url text,
  score integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists reputation_twitch_user_id_uq on public.reputation_scores(twitch_user_id) where twitch_user_id is not null;
create unique index if not exists reputation_twitch_login_uq on public.reputation_scores(lower(twitch_login));

create table if not exists public.collaborators(
  id uuid primary key default gen_random_uuid(),
  twitch_login text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists collaborators_twitch_login_uq on public.collaborators(lower(twitch_login));

create index if not exists suggestions_category_idx on public.suggestions(category);
create index if not exists suggestion_votes_suggestion_idx on public.suggestion_votes(suggestion_id);
create index if not exists library_games_status_idx on public.library_games(status);
create index if not exists reputation_score_idx on public.reputation_scores(score desc);
create index if not exists collaborators_order_idx on public.collaborators(sort_order,created_at);

create or replace function public.current_is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and exists(select 1 from public.admins where user_id=auth.uid());
$$;
grant execute on function public.current_is_admin() to anon,authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,twitch_user_id,twitch_login,display_name,avatar_url)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'sub',new.raw_user_meta_data->>'provider_id'),
    coalesce(new.raw_user_meta_data->>'user_name',new.raw_user_meta_data->>'preferred_username'),
    coalesce(new.raw_user_meta_data->>'user_name',new.raw_user_meta_data->>'preferred_username',new.raw_user_meta_data->>'name',split_part(coalesce(new.email,'Viewer'),'@',1)),
    coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture')
  )
  on conflict(id) do update set
    twitch_user_id=coalesce(excluded.twitch_user_id,public.profiles.twitch_user_id),
    twitch_login=coalesce(excluded.twitch_login,public.profiles.twitch_login),
    display_name=excluded.display_name,
    avatar_url=coalesce(excluded.avatar_url,public.profiles.avatar_url),
    updated_at=now();
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
drop trigger if exists suggestions_updated_at on public.suggestions; create trigger suggestions_updated_at before update on public.suggestions for each row execute function public.set_updated_at();
drop trigger if exists library_games_updated_at on public.library_games; create trigger library_games_updated_at before update on public.library_games for each row execute function public.set_updated_at();
drop trigger if exists profiles_updated_at on public.profiles; create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists collaborators_updated_at on public.collaborators; create trigger collaborators_updated_at before update on public.collaborators for each row execute function public.set_updated_at();
drop trigger if exists site_clips_updated_at on public.site_clips; create trigger site_clips_updated_at before update on public.site_clips for each row execute function public.set_updated_at();

create or replace function public.protect_suggestion_admin_fields() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if public.current_is_admin() then return new; end if;
  if tg_op='INSERT' then new.status:='new';new.official_reply:=null;new.pinned:=false;
  elsif tg_op='UPDATE' then new.status:=old.status;new.official_reply:=old.official_reply;new.pinned:=old.pinned;new.author_id:=old.author_id; end if;
  return new;
end$$;
drop trigger if exists suggestions_protect_admin on public.suggestions;
create trigger suggestions_protect_admin before insert or update on public.suggestions for each row execute function public.protect_suggestion_admin_fields();

create or replace function public.reputation_rank(p_score integer) returns text
language sql immutable as $$
  select case
    when p_score < 0 then 'Traître'
    when p_score < 20 then 'Inconnu'
    when p_score < 50 then 'Habitué'
    when p_score < 80 then 'Conseiller'
    when p_score < 100 then 'Confident'
    else 'Favori'
  end;
$$;

create or replace function public.get_suggestion_feed(p_category text default null,p_sort text default 'popular')
returns table(
  id uuid,author_id uuid,category text,title text,body text,status public.suggestion_status,
  official_reply text,pinned boolean,created_at timestamptz,author_name text,author_avatar text,
  vote_count bigint,has_voted boolean,rep_score integer,rep_rank text
)
language sql stable security definer set search_path=public as $$
select
  s.id,s.author_id,s.category,s.title,s.body,s.status,s.official_reply,s.pinned,s.created_at,
  p.display_name,p.avatar_url,
  vc.vote_count,
  exists(select 1 from public.suggestion_votes uv where uv.suggestion_id=s.id and uv.voter_id=auth.uid()) as has_voted,
  coalesce(r.score,0) as rep_score,
  public.reputation_rank(coalesce(r.score,0)) as rep_rank
from public.suggestions s
join public.profiles p on p.id=s.author_id
left join lateral (
  select count(*)::bigint as vote_count from public.suggestion_votes v where v.suggestion_id=s.id
) vc on true
left join lateral (
  select rs.score
  from public.reputation_scores rs
  where (p.twitch_user_id is not null and rs.twitch_user_id=p.twitch_user_id)
     or (p.twitch_login is not null and lower(rs.twitch_login)=lower(p.twitch_login))
  order by case when p.twitch_user_id is not null and rs.twitch_user_id=p.twitch_user_id then 0 else 1 end
  limit 1
) r on true
where (p_category is null or s.category=p_category)
order by s.pinned desc,
  case when p_sort='popular' then vc.vote_count end desc nulls last,
  case when p_sort='recent' then s.created_at end desc nulls last,
  s.created_at desc
$$;
grant execute on function public.get_suggestion_feed(text,text) to anon,authenticated;

create or replace function public.toggle_suggestion_vote(p_suggestion_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Connexion Twitch nécessaire'; end if;
 if exists(select 1 from public.suggestion_votes where suggestion_id=p_suggestion_id and voter_id=uid) then
   delete from public.suggestion_votes where suggestion_id=p_suggestion_id and voter_id=uid; return false;
 else
   insert into public.suggestion_votes values(p_suggestion_id,uid,now()); return true;
 end if;
end$$;
grant execute on function public.toggle_suggestion_vote(uuid) to authenticated;

create or replace function public.merge_suggestions(p_source uuid,p_target uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.current_is_admin() then raise exception 'Accès administrateur requis'; end if;
 if p_source=p_target then raise exception 'Source et cible identiques'; end if;
 insert into public.suggestion_votes(suggestion_id,voter_id) select p_target,voter_id from public.suggestion_votes where suggestion_id=p_source on conflict do nothing;
 delete from public.suggestions where id=p_source;
end$$;
grant execute on function public.merge_suggestions(uuid,uuid) to authenticated;

create or replace function public.get_polls_feed()
returns table(id uuid,title text,description text,allow_multiple boolean,results_visibility public.poll_results_visibility,starts_at timestamptz,ends_at timestamptz,is_active boolean,total_votes bigint,results_visible boolean,options jsonb)
language sql stable security definer set search_path=public as $$
with pb as(
 select p.*,exists(select 1 from public.poll_votes pv where pv.poll_id=p.id and pv.voter_id=auth.uid()) user_voted,
   (not p.is_active or (p.ends_at is not null and p.ends_at<=now())) closed
 from public.polls p where p.starts_at<=now()
)
select p.id,p.title,p.description,p.allow_multiple,p.results_visibility,p.starts_at,p.ends_at,p.is_active,
 (select count(*) from public.poll_votes pv where pv.poll_id=p.id)::bigint,
 (p.results_visibility='always' or (p.results_visibility='after_vote' and p.user_voted) or (p.results_visibility='after_close' and p.closed)),
 (select jsonb_agg(jsonb_build_object('id',po.id,'label',po.label,'position',po.position,'vote_count',
   case when (p.results_visibility='always' or (p.results_visibility='after_vote' and p.user_voted) or (p.results_visibility='after_close' and p.closed))
   then (select count(*) from public.poll_votes x where x.option_id=po.id) else null end,
   'selected',exists(select 1 from public.poll_votes uv where uv.option_id=po.id and uv.voter_id=auth.uid())) order by po.position,po.id)
   from public.poll_options po where po.poll_id=p.id)
from pb p order by p.is_active desc,p.created_at desc
$$;
grant execute on function public.get_polls_feed() to anon,authenticated;

create or replace function public.cast_poll_vote(p_poll_id uuid,p_option_ids uuid[]) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.polls%rowtype;
begin
 if uid is null then raise exception 'Connexion Twitch nécessaire'; end if;
 select * into p from public.polls where id=p_poll_id;
 if not found or not p.is_active or p.starts_at>now() or (p.ends_at is not null and p.ends_at<=now()) then raise exception 'Ce sondage est fermé'; end if;
 if coalesce(array_length(p_option_ids,1),0)=0 then raise exception 'Choisissez une option'; end if;
 if not p.allow_multiple and array_length(p_option_ids,1)>1 then raise exception 'Une seule réponse autorisée'; end if;
 if exists(select 1 from unnest(p_option_ids) x where not exists(select 1 from public.poll_options po where po.id=x and po.poll_id=p_poll_id)) then raise exception 'Option invalide'; end if;
 delete from public.poll_votes where poll_id=p_poll_id and voter_id=uid;
 insert into public.poll_votes(poll_id,option_id,voter_id) select p_poll_id,x,uid from unnest(p_option_ids)x;
end$$;
grant execute on function public.cast_poll_vote(uuid,uuid[]) to authenticated;

create or replace function public.sync_suggestion_from_game() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.source_suggestion_id is not null then
   if new.status='completed' then update public.suggestions set status='completed' where id=new.source_suggestion_id;
   elsif tg_op='INSERT' then update public.suggestions set status='planned' where id=new.source_suggestion_id and status in('new','considering'); end if;
 end if; return new;
end$$;
drop trigger if exists library_sync_suggestion on public.library_games;
create trigger library_sync_suggestion after insert or update of status on public.library_games for each row execute function public.sync_suggestion_from_game();

create or replace function public.get_reputation_dashboard(p_limit integer default 10)
returns jsonb
language sql stable security definer set search_path=public as $$
select jsonb_build_object(
  'top', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.score desc,x.display_name)
    from (
      select rs.twitch_login,coalesce(p.display_name,rs.display_name) display_name,coalesce(p.avatar_url,rs.avatar_url) avatar_url,rs.score,public.reputation_rank(rs.score) rank
      from public.reputation_scores rs
      left join lateral (
        select pr.display_name,pr.avatar_url from public.profiles pr
        where (rs.twitch_user_id is not null and pr.twitch_user_id=rs.twitch_user_id) or lower(pr.twitch_login)=lower(rs.twitch_login)
        limit 1
      ) p on true
      where rs.score>=0
      order by rs.score desc,rs.updated_at desc
      limit greatest(1,least(p_limit,50))
    ) x
  ),'[]'::jsonb),
  'traitors', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.score asc,x.display_name)
    from (
      select rs.twitch_login,coalesce(p.display_name,rs.display_name) display_name,coalesce(p.avatar_url,rs.avatar_url) avatar_url,rs.score,public.reputation_rank(rs.score) rank
      from public.reputation_scores rs
      left join lateral (
        select pr.display_name,pr.avatar_url from public.profiles pr
        where (rs.twitch_user_id is not null and pr.twitch_user_id=rs.twitch_user_id) or lower(pr.twitch_login)=lower(rs.twitch_login)
        limit 1
      ) p on true
      where rs.score<0
      order by rs.score asc,rs.updated_at desc
      limit greatest(1,least(p_limit,50))
    ) x
  ),'[]'::jsonb)
);
$$;
grant execute on function public.get_reputation_dashboard(integer) to anon,authenticated;

create or replace function public.get_my_reputation()
returns table(score integer,rank text,current_floor integer,next_threshold integer,next_rank text)
language sql stable security definer set search_path=public as $$
with me as (
  select * from public.profiles where id=auth.uid()
), matched as (
  select rs.score
  from me
  left join lateral (
    select r.score
    from public.reputation_scores r
    where (me.twitch_user_id is not null and r.twitch_user_id=me.twitch_user_id)
       or (me.twitch_login is not null and lower(r.twitch_login)=lower(me.twitch_login))
    order by case when me.twitch_user_id is not null and r.twitch_user_id=me.twitch_user_id then 0 else 1 end
    limit 1
  ) rs on true
)
select
  coalesce(matched.score,0),
  public.reputation_rank(coalesce(matched.score,0)),
  case when coalesce(matched.score,0)<0 then 0 when coalesce(matched.score,0)<20 then 0 when coalesce(matched.score,0)<50 then 20 when coalesce(matched.score,0)<80 then 50 when coalesce(matched.score,0)<100 then 80 else 100 end,
  case when coalesce(matched.score,0)<0 then 0 when coalesce(matched.score,0)<20 then 20 when coalesce(matched.score,0)<50 then 50 when coalesce(matched.score,0)<80 then 80 when coalesce(matched.score,0)<100 then 100 else null end,
  case when coalesce(matched.score,0)<0 then 'Inconnu' when coalesce(matched.score,0)<20 then 'Habitué' when coalesce(matched.score,0)<50 then 'Conseiller' when coalesce(matched.score,0)<80 then 'Confident' when coalesce(matched.score,0)<100 then 'Favori' else null end
from matched;
$$;
grant execute on function public.get_my_reputation() to authenticated;

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
alter table public.library_games enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.reputation_scores enable row level security;
alter table public.collaborators enable row level security;
alter table public.site_clips enable row level security;

drop policy if exists "profiles public read" on public.profiles; create policy "profiles public read" on public.profiles for select using(true);
drop policy if exists "profiles self write" on public.profiles; create policy "profiles self write" on public.profiles for all to authenticated using(auth.uid()=id) with check(auth.uid()=id);
drop policy if exists "suggestions public read" on public.suggestions; create policy "suggestions public read" on public.suggestions for select using(true);
drop policy if exists "suggestions auth insert" on public.suggestions; create policy "suggestions auth insert" on public.suggestions for insert to authenticated with check(auth.uid()=author_id);
drop policy if exists "suggestions owner update" on public.suggestions; create policy "suggestions owner update" on public.suggestions for update to authenticated using(auth.uid()=author_id and status='new') with check(auth.uid()=author_id);
drop policy if exists "suggestions owner delete" on public.suggestions; create policy "suggestions owner delete" on public.suggestions for delete to authenticated using(auth.uid()=author_id and status='new');
drop policy if exists "suggestions admin all" on public.suggestions; create policy "suggestions admin all" on public.suggestions for all to authenticated using(public.current_is_admin()) with check(public.current_is_admin());
drop policy if exists "library public read" on public.library_games; create policy "library public read" on public.library_games for select using(true);
drop policy if exists "library admin all" on public.library_games; create policy "library admin all" on public.library_games for all to authenticated using(public.current_is_admin()) with check(public.current_is_admin());
drop policy if exists "polls public read" on public.polls; create policy "polls public read" on public.polls for select using(true);
drop policy if exists "polls admin all" on public.polls; create policy "polls admin all" on public.polls for all to authenticated using(public.current_is_admin()) with check(public.current_is_admin());
drop policy if exists "poll options public read" on public.poll_options; create policy "poll options public read" on public.poll_options for select using(true);
drop policy if exists "poll options admin all" on public.poll_options; create policy "poll options admin all" on public.poll_options for all to authenticated using(public.current_is_admin()) with check(public.current_is_admin());
drop policy if exists "reputation admin read" on public.reputation_scores; create policy "reputation admin read" on public.reputation_scores for select to authenticated using(public.current_is_admin());
drop policy if exists "collaborators admin all" on public.collaborators; create policy "collaborators admin all" on public.collaborators for all to authenticated using(public.current_is_admin()) with check(public.current_is_admin());
drop policy if exists "site clips public read" on public.site_clips; create policy "site clips public read" on public.site_clips for select using(true);
drop policy if exists "site clips admin all" on public.site_clips; create policy "site clips admin all" on public.site_clips for all to authenticated using(public.current_is_admin()) with check(public.current_is_admin());

revoke all on public.suggestion_votes from anon,authenticated;
revoke all on public.poll_votes from anon,authenticated;
revoke all on public.admins from anon,authenticated;
revoke all on public.reputation_scores from anon,authenticated;
revoke all on public.collaborators from anon,authenticated;
revoke all on public.site_clips from anon,authenticated;

grant select on public.profiles,public.suggestions,public.library_games,public.polls,public.poll_options,public.site_clips to anon,authenticated;
grant insert,update,delete on public.suggestions,public.library_games,public.polls,public.poll_options to authenticated;
grant insert,update on public.profiles to authenticated;
grant select on public.reputation_scores to authenticated;
grant select,insert,update,delete on public.collaborators to authenticated;
grant select,insert,update,delete on public.site_clips to authenticated;


-- V4.1 : tableau de bord administrateur des sondages
create or replace function public.get_admin_polls()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Accès administrateur requis';
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'description', p.description,
        'allow_multiple', p.allow_multiple,
        'results_visibility', p.results_visibility,
        'starts_at', p.starts_at,
        'ends_at', p.ends_at,
        'is_active', p.is_active,
        'created_at', p.created_at,
        'total_voters', (select count(distinct pv.voter_id) from public.poll_votes pv where pv.poll_id = p.id),
        'options', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', po.id,
              'label', po.label,
              'position', po.position,
              'vote_count', (select count(*) from public.poll_votes pv2 where pv2.option_id = po.id)
            ) order by po.position, po.id
          )
          from public.poll_options po
          where po.poll_id = p.id
        ), '[]'::jsonb)
      ) order by p.created_at desc
    )
    from public.polls p
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_admin_polls() from public, anon;
grant execute on function public.get_admin_polls() to authenticated;


-- ===== V4.2.2 SECURITY HARDENING =====
-- HALARYK V4.2.2 — durcissement sécurité
-- Idempotent : peut être relancé sans créer de doublons.

-- 1) Le profil public est une projection de l'identité Twitch vérifiée.
-- Un appel direct avec le rôle authenticated ne peut pas falsifier ces champs.
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      new.twitch_user_id := null;
      new.twitch_login := null;
      new.display_name := 'Utilisateur Twitch';
      new.avatar_url := null;
    else
      new.twitch_user_id := old.twitch_user_id;
      new.twitch_login := old.twitch_login;
      new.display_name := old.display_name;
      new.avatar_url := old.avatar_url;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_identity() from public, anon, authenticated;

drop trigger if exists profiles_protect_identity on public.profiles;
create trigger profiles_protect_identity
before insert or update on public.profiles
for each row execute function public.protect_profile_identity();

-- Resynchronisation sécurisée à partir de auth.identities.
create or replace function public.sync_my_twitch_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ident jsonb;
  result public.profiles%rowtype;
begin
  if uid is null then
    raise exception 'Connexion Twitch nécessaire';
  end if;

  select i.identity_data
    into ident
  from auth.identities i
  where i.user_id = uid
    and i.provider = 'twitch'
  order by i.created_at desc
  limit 1;

  if ident is null then
    raise exception 'Identité Twitch vérifiée introuvable';
  end if;

  insert into public.profiles(id,twitch_user_id,twitch_login,display_name,avatar_url)
  values(
    uid,
    coalesce(nullif(ident->>'provider_id',''), nullif(ident->>'sub','')),
    lower(coalesce(nullif(ident->>'name',''), nullif(ident->>'slug',''), nullif(ident->>'nickname',''))),
    coalesce(nullif(ident->>'nickname',''), nullif(ident->>'slug',''), nullif(ident->>'name',''), 'Utilisateur Twitch'),
    coalesce(nullif(ident->>'avatar_url',''), nullif(ident->>'picture',''))
  )
  on conflict(id) do update set
    twitch_user_id = excluded.twitch_user_id,
    twitch_login = excluded.twitch_login,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now()
  returning * into result;

  return jsonb_build_object(
    'id', result.id,
    'display_name', result.display_name,
    'avatar_url', result.avatar_url
  );
end;
$$;

revoke all on function public.sync_my_twitch_profile() from public, anon, authenticated;
grant execute on function public.sync_my_twitch_profile() to authenticated, service_role;

-- Backfill des profils existants avec l'identité Twitch détenue par Supabase Auth.
update public.profiles p
set
  twitch_user_id = coalesce(nullif(i.identity_data->>'provider_id',''), nullif(i.identity_data->>'sub',''), p.twitch_user_id),
  twitch_login = lower(coalesce(nullif(i.identity_data->>'name',''), nullif(i.identity_data->>'slug',''), nullif(i.identity_data->>'nickname',''), p.twitch_login)),
  display_name = coalesce(nullif(i.identity_data->>'nickname',''), nullif(i.identity_data->>'slug',''), nullif(i.identity_data->>'name',''), p.display_name),
  avatar_url = coalesce(nullif(i.identity_data->>'avatar_url',''), nullif(i.identity_data->>'picture',''), p.avatar_url),
  updated_at = now()
from auth.identities i
where i.user_id = p.id
  and i.provider = 'twitch';

-- 2) Les profils ne sont plus lisibles en vrac par les visiteurs.
drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;

create policy "profiles self read"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "profiles admin read"
on public.profiles for select to authenticated
using (public.current_is_admin());

-- Compatibilité avec les anciennes pages encore en cache : l'INSERT/UPDATE est permis sur sa ligne,
-- mais le trigger ci-dessus empêche toute altération des données d'identité Twitch.
create policy "profiles self insert"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "profiles self update"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 3) Least privilege sur les tables publiques.
revoke all on public.profiles from anon, authenticated;
revoke all on public.admins from anon, authenticated;
revoke all on public.suggestions from anon, authenticated;
revoke all on public.suggestion_votes from anon, authenticated;
revoke all on public.library_games from anon, authenticated;
revoke all on public.polls from anon, authenticated;
revoke all on public.poll_options from anon, authenticated;
revoke all on public.poll_votes from anon, authenticated;
revoke all on public.reputation_scores from anon, authenticated;
revoke all on public.collaborators from anon, authenticated;
revoke all on public.site_clips from anon, authenticated;

grant select on public.suggestions, public.library_games, public.polls, public.poll_options, public.site_clips to anon;
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.suggestions to authenticated;
grant select, insert, update, delete on public.library_games to authenticated;
grant select, insert, update, delete on public.polls to authenticated;
grant select, insert, update, delete on public.poll_options to authenticated;
grant select on public.reputation_scores to authenticated;
grant select, insert, update, delete on public.collaborators to authenticated;
grant select, insert, update, delete on public.site_clips to authenticated;

-- 4) EXECUTE explicite : aucune fonction sensible ne dépend des grants implicites de PUBLIC.
revoke execute on function public.current_is_admin() from public, anon, authenticated;
revoke execute on function public.get_suggestion_feed(text,text) from public, anon, authenticated;
revoke execute on function public.toggle_suggestion_vote(uuid) from public, anon, authenticated;
revoke execute on function public.merge_suggestions(uuid,uuid) from public, anon, authenticated;
revoke execute on function public.get_polls_feed() from public, anon, authenticated;
revoke execute on function public.cast_poll_vote(uuid,uuid[]) from public, anon, authenticated;
revoke execute on function public.get_reputation_dashboard(integer) from public, anon, authenticated;
revoke execute on function public.get_my_reputation() from public, anon, authenticated;
revoke execute on function public.get_admin_polls() from public, anon, authenticated;

grant execute on function public.current_is_admin() to authenticated, service_role;
grant execute on function public.get_suggestion_feed(text,text) to anon, authenticated, service_role;
grant execute on function public.toggle_suggestion_vote(uuid) to authenticated, service_role;
grant execute on function public.merge_suggestions(uuid,uuid) to authenticated, service_role;
grant execute on function public.get_polls_feed() to anon, authenticated, service_role;
grant execute on function public.cast_poll_vote(uuid,uuid[]) to authenticated, service_role;
grant execute on function public.get_reputation_dashboard(integer) to anon, authenticated, service_role;
grant execute on function public.get_my_reputation() to authenticated, service_role;
grant execute on function public.get_admin_polls() to authenticated, service_role;

-- Les prochaines fonctions créées par le propriétaire n'obtiennent plus EXECUTE automatiquement
-- pour le web public. Les migrations doivent accorder explicitement ce qui est nécessaire.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
