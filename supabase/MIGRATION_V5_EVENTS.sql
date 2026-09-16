-- HALARYK V5 — Generic Events system
-- Additive migration: does not modify existing V4 content tables.

create extension if not exists pgcrypto;

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  eyebrow text,
  summary text,
  event_type text not null default 'community',
  game_name text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  featured boolean not null default false,
  real_start_date date,
  real_end_date date,
  world_start_date date,
  world_current_date date,
  public_snapshot_date date,
  public_chronicle_cutoff_date date,
  next_session_at timestamptz,
  hero_image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.site_events(id) on delete cascade,
  participant_key text not null,
  player_name text,
  title text not null,
  subtitle text,
  role_label text,
  sort_order integer not null default 0,
  public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, participant_key)
);

create table if not exists public.site_event_chapters (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.site_events(id) on delete cascade,
  chapter_key text not null,
  title text not null,
  subtitle text,
  kind text not null default 'phase',
  real_start_date date,
  real_end_date date,
  world_start_date date,
  world_end_date date,
  status text not null default 'complete' check (status in ('complete','current','upcoming')),
  sort_order integer not null default 0,
  public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unique(event_id, chapter_key)
);

create table if not exists public.site_event_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.site_events(id) on delete cascade,
  snapshot_date date not null,
  label text not null,
  session_number integer,
  source_label text,
  public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(event_id, snapshot_date)
);

create table if not exists public.site_event_snapshot_stats (
  snapshot_id uuid not null references public.site_event_snapshots(id) on delete cascade,
  participant_id uuid not null references public.site_event_participants(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  primary key(snapshot_id, participant_id)
);

create table if not exists public.site_event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.site_events(id) on delete cascade,
  chapter_id uuid references public.site_event_chapters(id) on delete set null,
  external_key text,
  entry_type text not null default 'timeline',
  title text not null,
  summary text,
  body text,
  world_date_label text,
  world_year integer,
  real_start_date date,
  real_end_date date,
  source_type text not null default 'manual',
  importance text not null default 'normal' check (importance in ('minor','normal','major','turning_point')),
  review_status text not null default 'approved' check (review_status in ('needs_review','approved','rejected')),
  public boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, external_key)
);

create table if not exists public.site_event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.site_events(id) on delete cascade,
  media_type text not null default 'image',
  url text not null,
  title text,
  caption text,
  public boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_events_status_featured on public.site_events(status, featured);
create index if not exists idx_site_event_entries_event_public on public.site_event_entries(event_id, public, sort_order);
create index if not exists idx_site_event_chapters_event_sort on public.site_event_chapters(event_id, sort_order);
create index if not exists idx_site_event_media_event_sort on public.site_event_media(event_id, sort_order);

alter table public.site_events enable row level security;
alter table public.site_event_participants enable row level security;
alter table public.site_event_chapters enable row level security;
alter table public.site_event_snapshots enable row level security;
alter table public.site_event_snapshot_stats enable row level security;
alter table public.site_event_entries enable row level security;
alter table public.site_event_media enable row level security;

-- Public reads only explicitly published event material.
drop policy if exists "public read published events" on public.site_events;
create policy "public read published events" on public.site_events for select to anon, authenticated using (status in ('active','archived'));

drop policy if exists "public read event participants" on public.site_event_participants;
create policy "public read event participants" on public.site_event_participants for select to anon, authenticated using (
  public and exists (select 1 from public.site_events e where e.id=event_id and e.status in ('active','archived'))
);

drop policy if exists "public read event chapters" on public.site_event_chapters;
create policy "public read event chapters" on public.site_event_chapters for select to anon, authenticated using (
  public and exists (select 1 from public.site_events e where e.id=event_id and e.status in ('active','archived'))
);

drop policy if exists "public read event snapshots" on public.site_event_snapshots;
create policy "public read event snapshots" on public.site_event_snapshots for select to anon, authenticated using (
  public and exists (select 1 from public.site_events e where e.id=event_id and e.status in ('active','archived'))
);

drop policy if exists "public read event snapshot stats" on public.site_event_snapshot_stats;
create policy "public read event snapshot stats" on public.site_event_snapshot_stats for select to anon, authenticated using (
  exists (
    select 1 from public.site_event_snapshots s
    join public.site_events e on e.id=s.event_id
    where s.id=snapshot_id and s.public and e.status in ('active','archived')
  )
);

drop policy if exists "public read approved event entries" on public.site_event_entries;
create policy "public read approved event entries" on public.site_event_entries for select to anon, authenticated using (
  public and review_status='approved' and exists (select 1 from public.site_events e where e.id=event_id and e.status in ('active','archived'))
);

drop policy if exists "public read event media" on public.site_event_media;
create policy "public read event media" on public.site_event_media for select to anon, authenticated using (
  public and exists (select 1 from public.site_events e where e.id=event_id and e.status in ('active','archived'))
);

-- Admin write/read policies.
do $$
declare t text;
begin
  foreach t in array array['site_events','site_event_participants','site_event_chapters','site_event_snapshots','site_event_snapshot_stats','site_event_entries','site_event_media']
  loop
    execute format('drop policy if exists "admin manage %s" on public.%I', t, t);
    execute format('create policy "admin manage %s" on public.%I for all to authenticated using (public.current_is_admin()) with check (public.current_is_admin())', t, t);
  end loop;
end $$;

revoke all on public.site_events, public.site_event_participants, public.site_event_chapters, public.site_event_snapshots, public.site_event_snapshot_stats, public.site_event_entries, public.site_event_media from anon, authenticated;
grant select on public.site_events, public.site_event_participants, public.site_event_chapters, public.site_event_snapshots, public.site_event_snapshot_stats, public.site_event_entries, public.site_event_media to anon;
grant select, insert, update, delete on public.site_events, public.site_event_participants, public.site_event_chapters, public.site_event_snapshots, public.site_event_snapshot_stats, public.site_event_entries, public.site_event_media to authenticated;

-- Seed / update PPO Europe event.
insert into public.site_events (
  slug,title,subtitle,eyebrow,summary,event_type,game_name,status,featured,
  real_start_date,world_start_date,world_current_date,public_snapshot_date,public_chronicle_cutoff_date,next_session_at,metadata
) values (
  'ppo-europe','PPO — Europe','Europa Universalis IV','Campagne multijoueur RP',
  'Sept joueurs façonnent une Europe alternative au fil des sessions, des guerres et d’une diplomatie jouée en RP.',
  'campaign','Europa Universalis IV','active',true,
  '2026-09-06','1444-11-11','1507-01-15','1481-01-16','1497-12-31',null,
  '{"no_ledger_rule":true,"game_version":"1.37.5.0","current_session":2,"next_session_number":3,"next_session_label":"Vendredi 18 septembre 2026 · soir","publication_note":"Les données contemporaines restent volontairement masquées."}'::jsonb
)
on conflict (slug) do update set
  title=excluded.title,subtitle=excluded.subtitle,eyebrow=excluded.eyebrow,summary=excluded.summary,event_type=excluded.event_type,
  game_name=excluded.game_name,status=excluded.status,featured=excluded.featured,real_start_date=excluded.real_start_date,
  world_start_date=excluded.world_start_date,world_current_date=excluded.world_current_date,public_snapshot_date=excluded.public_snapshot_date,
  public_chronicle_cutoff_date=excluded.public_chronicle_cutoff_date,next_session_at=excluded.next_session_at,metadata=excluded.metadata,updated_at=now();

insert into public.site_event_participants(event_id,participant_key,player_name,title,subtitle,role_label,sort_order,public,metadata)
select id,'CAS','HALARYK','Castille','CAS','Nation-joueur',1,true,'{}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,participant_key) do update set player_name=excluded.player_name,title=excluded.title,subtitle=excluded.subtitle,role_label=excluded.role_label,sort_order=excluded.sort_order,public=true,updated_at=now();
insert into public.site_event_participants(event_id,participant_key,player_name,title,subtitle,role_label,sort_order,public,metadata)
select id,'ENG','Matvala','Angleterre','ENG','Nation-joueur',2,true,'{}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,participant_key) do update set player_name=excluded.player_name,title=excluded.title,subtitle=excluded.subtitle,role_label=excluded.role_label,sort_order=excluded.sort_order,public=true,updated_at=now();
insert into public.site_event_participants(event_id,participant_key,player_name,title,subtitle,role_label,sort_order,public,metadata)
select id,'LAN','Narcisse','Florence','LAN','Nation-joueur',3,true,'{}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,participant_key) do update set player_name=excluded.player_name,title=excluded.title,subtitle=excluded.subtitle,role_label=excluded.role_label,sort_order=excluded.sort_order,public=true,updated_at=now();
insert into public.site_event_participants(event_id,participant_key,player_name,title,subtitle,role_label,sort_order,public,metadata)
select id,'BRA','XxTchoupixX','Brandebourg','BRA','Nation-joueur',4,true,'{}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,participant_key) do update set player_name=excluded.player_name,title=excluded.title,subtitle=excluded.subtitle,role_label=excluded.role_label,sort_order=excluded.sort_order,public=true,updated_at=now();
insert into public.site_event_participants(event_id,participant_key,player_name,title,subtitle,role_label,sort_order,public,metadata)
select id,'HAB','Alan','Autriche','HAB','Nation-joueur',5,true,'{}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,participant_key) do update set player_name=excluded.player_name,title=excluded.title,subtitle=excluded.subtitle,role_label=excluded.role_label,sort_order=excluded.sort_order,public=true,updated_at=now();
insert into public.site_event_participants(event_id,participant_key,player_name,title,subtitle,role_label,sort_order,public,metadata)
select id,'TUR','Valoche','Empire ottoman','TUR','Nation-joueur',6,true,'{}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,participant_key) do update set player_name=excluded.player_name,title=excluded.title,subtitle=excluded.subtitle,role_label=excluded.role_label,sort_order=excluded.sort_order,public=true,updated_at=now();
insert into public.site_event_participants(event_id,participant_key,player_name,title,subtitle,role_label,sort_order,public,metadata)
select id,'MOS','Doug','Moscovie','MOS','Nation-joueur',7,true,'{}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,participant_key) do update set player_name=excluded.player_name,title=excluded.title,subtitle=excluded.subtitle,role_label=excluded.role_label,sort_order=excluded.sort_order,public=true,updated_at=now();
insert into public.site_event_chapters(event_id,chapter_key,title,subtitle,kind,real_start_date,real_end_date,world_start_date,world_end_date,status,sort_order,public)
select id,'session-1','Session I','6 septembre 2026 · après-midi','session','2026-09-06'::date,'2026-09-06'::date,'1444-11-11'::date,'1481-01-16'::date,'complete',10,true from public.site_events where slug='ppo-europe'
on conflict (event_id,chapter_key) do update set title=excluded.title,subtitle=excluded.subtitle,kind=excluded.kind,real_start_date=excluded.real_start_date,real_end_date=excluded.real_end_date,world_start_date=excluded.world_start_date,world_end_date=excluded.world_end_date,status=excluded.status,sort_order=excluded.sort_order,public=true;
insert into public.site_event_chapters(event_id,chapter_key,title,subtitle,kind,real_start_date,real_end_date,world_start_date,world_end_date,status,sort_order,public)
select id,'inter-1-2','Intersession I → II','Diplomatie RP entre les deux premières sessions','intersession','2026-09-06'::date,'2026-09-08'::date,null::date,null::date,'complete',20,true from public.site_events where slug='ppo-europe'
on conflict (event_id,chapter_key) do update set title=excluded.title,subtitle=excluded.subtitle,kind=excluded.kind,real_start_date=excluded.real_start_date,real_end_date=excluded.real_end_date,world_start_date=excluded.world_start_date,world_end_date=excluded.world_end_date,status=excluded.status,sort_order=excluded.sort_order,public=true;
insert into public.site_event_chapters(event_id,chapter_key,title,subtitle,kind,real_start_date,real_end_date,world_start_date,world_end_date,status,sort_order,public)
select id,'session-2','Session II','8 septembre 2026 · soir','session','2026-09-08'::date,'2026-09-08'::date,'1481-01-16'::date,'1507-01-15'::date,'complete',30,true from public.site_events where slug='ppo-europe'
on conflict (event_id,chapter_key) do update set title=excluded.title,subtitle=excluded.subtitle,kind=excluded.kind,real_start_date=excluded.real_start_date,real_end_date=excluded.real_end_date,world_start_date=excluded.world_start_date,world_end_date=excluded.world_end_date,status=excluded.status,sort_order=excluded.sort_order,public=true;
insert into public.site_event_chapters(event_id,chapter_key,title,subtitle,kind,real_start_date,real_end_date,world_start_date,world_end_date,status,sort_order,public)
select id,'inter-2-3','Intersession II → III','Diplomatie RP en cours avant la troisième session','intersession','2026-09-08'::date,'2026-09-18'::date,null::date,null::date,'current',40,true from public.site_events where slug='ppo-europe'
on conflict (event_id,chapter_key) do update set title=excluded.title,subtitle=excluded.subtitle,kind=excluded.kind,real_start_date=excluded.real_start_date,real_end_date=excluded.real_end_date,world_start_date=excluded.world_start_date,world_end_date=excluded.world_end_date,status=excluded.status,sort_order=excluded.sort_order,public=true;
insert into public.site_event_chapters(event_id,chapter_key,title,subtitle,kind,real_start_date,real_end_date,world_start_date,world_end_date,status,sort_order,public)
select id,'session-3','Session III','18 septembre 2026 · soir','session','2026-09-18'::date,'2026-09-18'::date,'1507-01-15'::date,null::date,'upcoming',50,true from public.site_events where slug='ppo-europe'
on conflict (event_id,chapter_key) do update set title=excluded.title,subtitle=excluded.subtitle,kind=excluded.kind,real_start_date=excluded.real_start_date,real_end_date=excluded.real_end_date,world_start_date=excluded.world_start_date,world_end_date=excluded.world_end_date,status=excluded.status,sort_order=excluded.sort_order,public=true;
insert into public.site_event_snapshots(event_id,snapshot_date,label,session_number,source_label,public,metadata)
select id,'1444-11-11'::date,'État initial — 11 novembre 1444',0,'Castille1444_11_11.eu4',true,'{"note":"Sauvegarde solo du jour 1 utilisée uniquement comme état initial du monde ; mapping des joueurs repris de la campagne multijoueur."}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,snapshot_date) do update set label=excluded.label,session_number=excluded.session_number,source_label=excluded.source_label,public=true,metadata=excluded.metadata;
insert into public.site_event_snapshots(event_id,snapshot_date,label,session_number,source_label,public,metadata)
select id,'1481-01-16'::date,'Fin de la Session I — 16 janvier 1481',1,'mp_Castille1481_01_16.eu4',true,'{"note":"Fin exacte de la première session multijoueur."}'::jsonb from public.site_events where slug='ppo-europe'
on conflict (event_id,snapshot_date) do update set label=excluded.label,session_number=excluded.session_number,source_label=excluded.source_label,public=true,metadata=excluded.metadata;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":17,"development":171.0,"effective_development":168.22,"estimated_monthly_income":17.132,"regiment_count":18,"ship_count":10,"technologies":{"administrative":3,"diplomatic":3,"military":3},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='HAB'
where s.snapshot_date='1444-11-11'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":22,"development":197.0,"effective_development":190.78,"estimated_monthly_income":14.706,"regiment_count":27,"ship_count":0,"technologies":{"administrative":3,"diplomatic":3,"military":3},"religion":"orthodox","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='MOS'
where s.snapshot_date='1444-11-11'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":33,"development":281.0,"effective_development":274.965,"estimated_monthly_income":25.622,"regiment_count":26,"ship_count":26,"technologies":{"administrative":3,"diplomatic":3,"military":3},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='CAS'
where s.snapshot_date='1444-11-11'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":40,"development":338.0,"effective_development":308.315,"estimated_monthly_income":32.16,"regiment_count":27,"ship_count":33,"technologies":{"administrative":3,"diplomatic":3,"military":3},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='ENG'
where s.snapshot_date='1444-11-11'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":3,"development":57.0,"effective_development":56.7,"estimated_monthly_income":9.789,"regiment_count":8,"ship_count":11,"technologies":{"administrative":3,"diplomatic":3,"military":3},"religion":"catholic","government":"republic"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='LAN'
where s.snapshot_date='1444-11-11'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":41,"development":320.0,"effective_development":306.585,"estimated_monthly_income":25.906,"regiment_count":29,"ship_count":22,"technologies":{"administrative":3,"diplomatic":3,"military":3},"religion":"sunni","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='TUR'
where s.snapshot_date='1444-11-11'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":8,"development":65.0,"effective_development":63.94,"estimated_monthly_income":6.298,"regiment_count":9,"ship_count":0,"technologies":{"administrative":3,"diplomatic":3,"military":3},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='BRA'
where s.snapshot_date='1444-11-11'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":31,"development":323.0,"effective_development":227.377,"estimated_monthly_income":31.395,"regiment_count":50,"ship_count":0,"technologies":{"administrative":7,"diplomatic":7,"military":7},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='HAB'
where s.snapshot_date='1481-01-16'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":76,"development":604.0,"effective_development":342.901,"estimated_monthly_income":36.868,"regiment_count":49,"ship_count":0,"technologies":{"administrative":5,"diplomatic":5,"military":5},"religion":"orthodox","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='MOS'
where s.snapshot_date='1481-01-16'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":40,"development":352.0,"effective_development":306.872,"estimated_monthly_income":26.882,"regiment_count":39,"ship_count":29,"technologies":{"administrative":7,"diplomatic":6,"military":5},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='CAS'
where s.snapshot_date='1481-01-16'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":63,"development":521.0,"effective_development":510.945,"estimated_monthly_income":52.632,"regiment_count":40,"ship_count":44,"technologies":{"administrative":6,"diplomatic":6,"military":7},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='ENG'
where s.snapshot_date='1481-01-16'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":12,"development":259.0,"effective_development":192.133,"estimated_monthly_income":25.507,"regiment_count":20,"ship_count":18,"technologies":{"administrative":7,"diplomatic":6,"military":6},"religion":"catholic","government":"republic"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='LAN'
where s.snapshot_date='1481-01-16'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":91,"development":815.0,"effective_development":698.472,"estimated_monthly_income":75.72,"regiment_count":66,"ship_count":63,"technologies":{"administrative":7,"diplomatic":7,"military":6},"religion":"sunni","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='TUR'
where s.snapshot_date='1481-01-16'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_snapshot_stats(snapshot_id,participant_id,stats)
select s.id,p.id,'{"province_count":25,"development":230.0,"effective_development":150.977,"estimated_monthly_income":16.09,"regiment_count":14,"ship_count":0,"technologies":{"administrative":6,"diplomatic":5,"military":5},"religion":"catholic","government":"monarchy"}'::jsonb
from public.site_event_snapshots s
join public.site_events e on e.id=s.event_id and e.slug='ppo-europe'
join public.site_event_participants p on p.event_id=e.id and p.participant_key='BRA'
where s.snapshot_date='1481-01-16'::date
on conflict (snapshot_id,participant_id) do update set stats=excluded.stats;
insert into public.site_event_entries(event_id,chapter_id,external_key,entry_type,title,summary,world_date_label,source_type,importance,review_status,public,featured,sort_order,data)
select e.id,c.id,'rp-pre-1-castile-faith','diplomatie','Déclaration initiale de la Couronne de Castille','La Couronne affirme sa foi et inscrit la Reconquista parmi ses premières priorités.','Pré-session I','manual_rp','major','needs_review',false,false,0,'{}'::jsonb
from public.site_events e join public.site_event_chapters c on c.event_id=e.id and c.chapter_key='session-1' where e.slug='ppo-europe'
on conflict (event_id,external_key) do update set chapter_id=excluded.chapter_id,entry_type=excluded.entry_type,title=excluded.title,summary=excluded.summary,world_date_label=excluded.world_date_label,source_type=excluded.source_type,importance=excluded.importance;
insert into public.site_event_entries(event_id,chapter_id,external_key,entry_type,title,summary,world_date_label,source_type,importance,review_status,public,featured,sort_order,data)
select e.id,c.id,'rp-session1-coalition-ottoman','guerre','Coalition contre l’Empire ottoman','Angleterre, Castille, Brandebourg et Florence s’unissent contre l’Empire ottoman et obtiennent notamment 2 000 ducats après leur victoire.','Session I','manual_rp','turning_point','needs_review',false,false,0,'{}'::jsonb
from public.site_events e join public.site_event_chapters c on c.event_id=e.id and c.chapter_key='session-1' where e.slug='ppo-europe'
on conflict (event_id,external_key) do update set chapter_id=excluded.chapter_id,entry_type=excluded.entry_type,title=excluded.title,summary=excluded.summary,world_date_label=excluded.world_date_label,source_type=excluded.source_type,importance=excluded.importance;
insert into public.site_event_entries(event_id,chapter_id,external_key,entry_type,title,summary,world_date_label,source_type,importance,review_status,public,featured,sort_order,data)
select e.id,c.id,'rp-session1-austria-ottoman','guerre','Guerre austro-ottomane','L’Autriche affronte seule l’Empire ottoman et subit une défaite avant la formation d’une coalition plus large.','Session I','manual_rp','major','needs_review',false,false,0,'{}'::jsonb
from public.site_events e join public.site_event_chapters c on c.event_id=e.id and c.chapter_key='session-1' where e.slug='ppo-europe'
on conflict (event_id,external_key) do update set chapter_id=excluded.chapter_id,entry_type=excluded.entry_type,title=excluded.title,summary=excluded.summary,world_date_label=excluded.world_date_label,source_type=excluded.source_type,importance=excluded.importance;
insert into public.site_event_entries(event_id,chapter_id,external_key,entry_type,title,summary,world_date_label,source_type,importance,review_status,public,featured,sort_order,data)
select e.id,c.id,'rp-inter2-france-congress','congrès','Congrès concernant la France','Les puissances européennes préparent un congrès consacré à la question française avant la troisième session.','Intersession II → III','manual_rp','major','needs_review',false,false,0,'{}'::jsonb
from public.site_events e join public.site_event_chapters c on c.event_id=e.id and c.chapter_key='inter-2-3' where e.slug='ppo-europe'
on conflict (event_id,external_key) do update set chapter_id=excluded.chapter_id,entry_type=excluded.entry_type,title=excluded.title,summary=excluded.summary,world_date_label=excluded.world_date_label,source_type=excluded.source_type,importance=excluded.importance;
insert into public.site_event_entries(event_id,chapter_id,external_key,entry_type,title,summary,world_date_label,source_type,importance,review_status,public,featured,sort_order,data)
select e.id,c.id,'rp-inter2-third-rome','diplomatie','Proclamation de la Troisième Rome','La Moscovie revendique publiquement le rôle de Troisième Rome, rejette la primauté pontificale et se présente comme protectrice des chrétiens.','Intersession II → III','manual_rp','major','needs_review',false,false,0,'{}'::jsonb
from public.site_events e join public.site_event_chapters c on c.event_id=e.id and c.chapter_key='inter-2-3' where e.slug='ppo-europe'
on conflict (event_id,external_key) do update set chapter_id=excluded.chapter_id,entry_type=excluded.entry_type,title=excluded.title,summary=excluded.summary,world_date_label=excluded.world_date_label,source_type=excluded.source_type,importance=excluded.importance;
insert into public.site_event_entries(event_id,chapter_id,external_key,entry_type,title,summary,world_date_label,source_type,importance,review_status,public,featured,sort_order,data)
select e.id,c.id,'rp-inter2-ottoman-deterrence','diplomatie','Réorientation ottomane après la croisade','Après sa défaite, l’Empire ottoman annonce une stratégie de dissuasion fondée sur les fortifications, la reconstruction militaire et le développement, tout en maintenant la diplomatie ouverte.','Intersession II → III','manual_rp','major','needs_review',false,false,0,'{}'::jsonb
from public.site_events e join public.site_event_chapters c on c.event_id=e.id and c.chapter_key='inter-2-3' where e.slug='ppo-europe'
on conflict (event_id,external_key) do update set chapter_id=excluded.chapter_id,entry_type=excluded.entry_type,title=excluded.title,summary=excluded.summary,world_date_label=excluded.world_date_label,source_type=excluded.source_type,importance=excluded.importance;
