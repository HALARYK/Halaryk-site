# Patch HALARYK V4.2.1

Ce patch se pose directement par-dessus la V4.2 déjà en ligne.

## Fichiers à remplacer sur GitHub
- `index.html`
- `app.js`
- `style.css`
- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`

Les fichiers `CHANGELOG_V4_2_1.md` et `PATCH_V4_2_1_INSTRUCTIONS.md` sont de la documentation et peuvent aussi être ajoutés.

## Supabase
Aucune nouvelle migration SQL n'est nécessaire pour ce patch.
Aucun redéploiement de `game-search` n'est nécessaire : la fonction V4.2 actuelle peut rester en place.

## Résumés de jeux
IGDB reste utilisé pour la jaquette HD, le studio et la date. Le bouton « Actualiser via IGDB » ne remplace plus le résumé public.
Les anciens résumés déjà enregistrés restent dans la base : ils peuvent être réécrits progressivement depuis l'administration. Le site les tronque désormais proprement pour éviter les pavés.

## Anciens statuts
L'interface n'affiche plus que `En cours`, `Terminé` et `À venir`. Les anciens statuts sont présentés comme `À venir` jusqu'au prochain enregistrement du jeu, ce qui permet de les nettoyer progressivement sans migration destructive.
