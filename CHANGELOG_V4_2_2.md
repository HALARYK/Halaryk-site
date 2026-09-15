# HALARYK — V4.2.2 sécurité

- L’identité publique d’un utilisateur est resynchronisée côté Supabase depuis `auth.identities` (Twitch), et non depuis des champs choisis par le navigateur.
- Un utilisateur authentifié ne peut plus falsifier son ID Twitch, son login, son nom affiché ou son avatar via l’API `profiles`.
- La table `profiles` n’est plus lisible publiquement en direct ; les pages publiques passent par les flux/RPC dédiés.
- Réduction des privilèges SQL `anon` / `authenticated` au strict nécessaire sur les tables du site.
- Permissions `EXECUTE` des RPC rendues explicites et suppression des grants implicites `PUBLIC`.
- `live-status` ne prend plus de login fourni par le visiteur : seule la chaîne configurée côté serveur est interrogée.
- `app.js` utilise désormais `sync_my_twitch_profile()` lors d’une connexion Twitch.
- `schema.sql` est resynchronisé avec la configuration de sécurité de production.
