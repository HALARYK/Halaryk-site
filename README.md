# HALARYK — Site V5.2

Site officiel de la chaîne HALARYK, organisé en plusieurs pages autour du contenu Twitch, de la communauté et des événements suivis sur la durée.

## Structure

- `/` — accueil, statut Twitch et mise en avant du projet actif ;
- `/evenements/` — présentation des grands événements ;
- `/evenements/chroniques-europe/` — campagne EU4 « Chroniques de l’Europe » ;
- `/contenu/` — planning, ludothèque et clips ;
- `/communaute/` — Cabinet des idées, réputation et collaborateurs ;
- `/infos/` — règlement, commandes, configuration, FAQ, partenaires et réseaux ;
- `/admin/` — interface d’administration.

## Données

Le site utilise Supabase pour les contenus dynamiques : événements, participants, chronologie, diplomatie, médias, statistiques historiques et données de communauté.

Les sauvegardes `.eu4` brutes ne sont pas servies publiquement et ne doivent pas être ajoutées au dépôt. Seules les données sélectionnées pour publication sont exploitées côté site.

## Chroniques de l’Europe

La campagne EU4 dispose d’un espace dédié avec :

- présentation générale ;
- nations et statistiques publiques ;
- chronologie par pays ;
- dossiers détaillés d’événements ;
- diplomatie RP ;
- médias ;
- règles de la campagne.

Les informations récentes peuvent être volontairement publiées avec retard afin de préserver la partie multijoueur et la règle de non-divulgation des données contemporaines.

## Administration

L’administration permet de gérer le contenu public du site, les événements, les éléments RP, les médias et les liens sociaux sans modifier directement les pages publiques.
