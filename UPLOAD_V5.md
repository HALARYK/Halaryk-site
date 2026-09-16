# Déploiement V5

## GitHub Pages
Uploader le contenu de cette archive à la racine du dépôt, en conservant l’arborescence.

Les fichiers existants portant le même chemin sont remplacés. Les nouveaux dossiers à conserver sont :

- `evenements/`
- `contenu/`
- `communaute/`
- `infos/`

Le fichier `events.js` doit rester à la racine à côté de `app.js` et `config.js`.

## Supabase
La migration V5 a déjà été appliquée au projet de production HALARYK le 16/09/2026. Ne pas la rejouer manuellement sur ce projet.

`supabase/MIGRATION_V5_EVENTS.sql` est conservé dans le dépôt uniquement pour documenter/synchroniser le schéma.

## Après upload
1. attendre le déploiement GitHub Pages ;
2. ouvrir l’accueil en navigation privée ;
3. tester Accueil → Événements → PPO Europe ;
4. tester Contenu, Communauté et Infos ;
5. se connecter à `/admin/` et ouvrir l’onglet Événements ;
6. vérifier le rendu mobile du menu et de la page PPO.
