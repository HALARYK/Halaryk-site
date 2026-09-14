# HALARYK V4 révisée — Mise en place

Cette version ajoute **Réputation** et **Collaborateurs** à la V4 déjà prévue. Instagram reste uniquement dans la section Réseaux ; aucune section « dernières publications » n'est ajoutée pour le moment.

## Architecture

- GitHub Pages : HTML / CSS / JavaScript
- Supabase : Auth Twitch, base de données, administration et Edge Functions
- Twitch API : statut de HALARYK et statut des collaborateurs
- IGDB : recherche de jeux pour la ludothèque
- Streamer.bot : source de vérité du score de réputation

## 1. Déployer les fichiers du site

Remplace le contenu du dépôt `Halaryk-site` par le contenu de ce dossier (en conservant si besoin une copie de la V3).

Les anciennes ancres restent disponibles : `#planning`, `#clips`, `#reglement`, `#partenaires`, `#reseaux`, `#commandes`, `#config`, `#faq`.

Nouvelles ancres :
- `#ludotheque`
- `#suggestions`
- `#reputation`
- `#collaborateurs`

## 2. Créer Supabase et exécuter le schéma

Dans Supabase > SQL Editor, exécute le fichier :

`supabase/schema.sql`

Il crée les tables et règles de sécurité pour : profils, suggestions, votes, ludothèque, sondages, réputation et collaborateurs.

## 3. Configurer Twitch OAuth

Dans Supabase > Authentication > Providers > Twitch, récupère la Callback URL.

Dans la Twitch Developer Console :
1. crée une application ;
2. ajoute la Callback URL Supabase comme OAuth Redirect URL ;
3. récupère Client ID et Client Secret.

Retourne dans Supabase et active le provider Twitch avec ces deux valeurs.

Dans Authentication > URL Configuration :
- Site URL : `https://halaryk.github.io/Halaryk-site/`
- Redirect URLs :
  - `https://halaryk.github.io/Halaryk-site/`
  - `https://halaryk.github.io/Halaryk-site/admin/`

## 4. Relier le frontend à Supabase

Dans `config.js`, remplace :

```js
SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
SUPABASE_PUBLISHABLE_KEY: "VOTRE_CLE_PUBLISHABLE_SUPABASE",
```

par l'URL du projet et la clé **Publishable** Supabase.

Cette clé est destinée au frontend. Les secrets Twitch ne doivent jamais être mis dans `config.js`.

## 5. Te déclarer administrateur

Connecte-toi une première fois au site avec Twitch. Dans Supabase > Authentication > Users, copie l'UUID de ton compte, puis exécute :

```sql
insert into public.admins(user_id)
values ('TON_UUID_SUPABASE')
on conflict do nothing;
```

Recharge ensuite `/admin/`.

## 6. Secrets des Edge Functions

Dans Supabase > Edge Functions > Secrets ajoute :

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_CHANNEL_LOGIN` = `halaryk`
- `REPUTATION_SYNC_SECRET` = une longue chaîne aléatoire que tu gardes privée

Les clés Supabase nécessaires aux Edge Functions sont fournies par l'environnement Supabase ; ne copie jamais une clé secrète Supabase dans le navigateur.

## 7. Déployer quatre Edge Functions

Déploie :

- `live-status`
- `game-search`
- `collaborators-status`
- `reputation-sync`

Les sources se trouvent dans `supabase/functions/`.

Le fichier `supabase/config.toml` indique les fonctions publiques et celle qui exige une session utilisateur.

## 8. Ajouter les collaborateurs

Une fois l'administration fonctionnelle :

1. ouvre `/admin/` ;
2. onglet **Collaborateurs** ;
3. saisis le login Twitch exact ;
4. ajoute une courte description ;
5. choisis l'ordre d'affichage.

Avatar, nom Twitch, statut en direct, jeu et titre du live sont récupérés automatiquement par le site.

## 9. Synchroniser la réputation avec Streamer.bot

Lis `STREAMERBOT_REPUTATION.md`.

Principe : après chaque `!bienvu`, `!trahison` ou autre modification de la variable globale utilisateur `Reputation`, Streamer.bot envoie **la valeur finale absolue** au endpoint `reputation-sync`.

Le site ne remplace donc pas Streamer.bot : il en affiche une copie synchronisée.

## 10. Vérifications avant mise en production

- connexion Twitch utilisateur ;
- accès admin réservé à HALARYK ;
- statut live HALARYK ;
- ludothèque + recherche IGDB ;
- création / vote / réponse / fusion de suggestions ;
- sondages ;
- classement de réputation et dossier personnel ;
- badge de réputation sous les suggestions ;
- collaborateurs + statut live ;
- affichage mobile ;
- ancres des panneaux Twitch.
