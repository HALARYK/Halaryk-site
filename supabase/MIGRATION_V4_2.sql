-- HALARYK V4.2 — migration depuis V4.1.2
-- À exécuter une seule fois dans Supabase > SQL Editor.

-- Ludothèque enrichie
alter table public.library_games add column if not exists developer text;
alter table public.library_games add column if not exists summary text;

-- L'ancien statut « À faire » rejoint désormais « À venir ».
update public.library_games set status='wishlist' where status='backlog';

-- Sélection de 4 clips Twitch pilotable depuis l'administration.
create table if not exists public.site_clips(
  position smallint primary key check(position between 1 and 4),
  clip_slug text not null check(char_length(clip_slug) between 2 and 160),
  clip_url text,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_clips_updated_at on public.site_clips;
create trigger site_clips_updated_at before update on public.site_clips for each row execute function public.set_updated_at();

alter table public.site_clips enable row level security;
drop policy if exists "site clips public read" on public.site_clips;
create policy "site clips public read" on public.site_clips for select using(true);
drop policy if exists "site clips admin all" on public.site_clips;
create policy "site clips admin all" on public.site_clips for all to authenticated using(public.current_is_admin()) with check(public.current_is_admin());

revoke all on public.site_clips from anon,authenticated;
grant select on public.site_clips to anon,authenticated;
grant select,insert,update,delete on public.site_clips to authenticated;

-- Préremplit les 4 clips déjà présents dans la V4.1.2.
insert into public.site_clips(position,clip_slug) values
  (1,'FreezingTallMinkUWot-3OwWXifqnd3dVznt'),
  (2,'SmallSquareKimchiSMOrc-tWYQ7KNuO-VIss3t'),
  (3,'ModernSpikySandwichCoolStoryBob-ziEGVxAKaUSoNuAx'),
  (4,'ObeseCheerfulSoybeanCmonBruh-3kf9fZ67xh8bXZ9a')
on conflict(position) do nothing;
