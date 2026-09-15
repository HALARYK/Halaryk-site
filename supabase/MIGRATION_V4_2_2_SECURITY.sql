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
