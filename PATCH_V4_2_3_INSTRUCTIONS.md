# HALARYK V4.2.3 — Recherche Ludothèque

## Déjà fait côté Supabase
La fonction `game-search` a déjà été déployée en production (version 14). Ne la redéploie pas manuellement.

## GitHub
Copier à la racine du dépôt en remplaçant les fichiers correspondants :
- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`

Le dossier `supabase/functions/game-search/` est inclus uniquement pour garder le dépôt synchronisé avec la production.

## Nouveautés
- 24 résultats IGDB au premier affichage au lieu de 8.
- Bouton « Afficher 24 résultats de plus » avec pagination.
- Recherche par nom de jeu ou par studio de développement.
- Recherche studio insensible à la casse et par correspondance partielle.
- Les résultats studio affichent les studios IGDB correspondants.
- Les anciens filtres En pause / Abandonné sont retirés de l'interface de filtre admin.
