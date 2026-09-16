# HALARYK V5.0 — 16/09/2026

## Refonte de structure
- passage du long one-page à cinq entrées principales : Accueil, Événements, Contenu, Communauté, Infos ;
- accueil recentré sur HALARYK + événement à la une ;
- navigation desktop et mobile adaptée ;
- conservation des anciens liens par redirection des hashes V4.

## Événements
- nouvelle page globale Événements avec événement actuel et archives ;
- nouvelle page PPO Europe ;
- affichage des 7 nations et comparaison 1444 → 1481 ;
- chronologie structurée en sessions et intersessions ;
- zones Guerres, Diplomatie et Médias ;
- logique générique prévue pour de futurs événements (serveur Minecraft, séries communautaires, etc.).

## Administration
- nouvel onglet Événements ;
- édition des informations générales ;
- gestion des participants ;
- gestion des sessions / intersessions ;
- création, validation, publication et suppression d’éléments de chronologie ;
- lecture des relevés issus des sauvegardes ;
- création d’un futur événement en brouillon ;
- aucune importation directe de sauvegarde EU4 brute depuis le navigateur.

## Supabase
- ajout des tables génériques `site_events`, `site_event_participants`, `site_event_chapters`, `site_event_snapshots`, `site_event_snapshot_stats`, `site_event_entries`, `site_event_media` ;
- RLS public/admin ;
- PPO Europe initialisée avec 7 participants, 5 chapitres, 2 snapshots et 14 jeux de statistiques historiques ;
- 6 éléments RP préparatoires ajoutés en `needs_review`, invisibles publiquement tant qu’ils ne sont pas validés.

## Données PPO
- save 1444 : état initial de référence (save solo identique au setup, mapping joueurs repris du multi) ;
- save 1481 : fin exacte Session I ;
- save 1507 : fin Session II / source de reconstruction historique, sans publication des statistiques contemporaines.
