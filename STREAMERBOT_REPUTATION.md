# Streamer.bot → Réputation du site

## Principe

Streamer.bot reste **la source de vérité**. La base Supabase n'est qu'un miroir destiné au site.

Après chaque action qui modifie la variable utilisateur globale :

`Reputation`

Streamer.bot doit envoyer la **valeur finale absolue** au site.

Ne pas envoyer seulement `+5` ou `-10` : cela évite les écarts si une requête échoue ou est répétée.

## Endpoint

Après déploiement de l'Edge Function :

`https://TON-PROJET.supabase.co/functions/v1/reputation-sync`

Méthode : `POST`

Header privé :

`x-reputation-secret: TA_VALEUR_REPUTATION_SYNC_SECRET`

Corps JSON attendu :

```json
{
  "twitch_user_id": "123456789",
  "twitch_login": "pseudo_twitch",
  "display_name": "Pseudo_Twitch",
  "score": 55
}
```

`twitch_user_id` est fortement recommandé si Streamer.bot le fournit. Le login reste également envoyé pour l'affichage et comme solution de repli.

## Dans tes actions existantes

### `REP - Ajouter 5`

Ordre logique :

1. Add Target Info sur l'utilisateur ciblé.
2. Incrémenter la variable utilisateur `Reputation` de 5.
3. Relire la valeur `Reputation` après modification dans un argument, par exemple `repAfter`.
4. Envoyer la requête POST à `reputation-sync` avec le pseudo, l'ID Twitch et `repAfter`.
5. Envoyer le message Twitch habituel.

### `REP - Retirer 10`

Même logique :

1. Add Target Info.
2. Décrémenter `Reputation` de 10.
3. Relire la valeur finale.
4. Synchroniser cette valeur finale par POST.
5. Envoyer le message Twitch habituel.

## Important

Le nom interne de la variable reste exactement :

`Reputation`

sans accent.

Le secret `REPUTATION_SYNC_SECRET` doit rester uniquement :
- dans les secrets Supabase ;
- dans Streamer.bot sur ton PC.

Il ne doit jamais être mis dans `config.js`, `app.js`, GitHub ou un message public.

## Mise en place pratique

La façon exacte de créer le POST dépend de l'action HTTP disponible dans ta version Streamer.bot 1.0.7. Au moment de la configuration, fais-la avec le logiciel ouvert et on vérifiera écran par écran les champs exacts au lieu de supposer un ancien menu.
