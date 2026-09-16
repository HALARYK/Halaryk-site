# HALARYK — Site V5.0

V5 transforme le site historique « one page » en architecture multi-pages tout en conservant la DA florale sombre et les modules Supabase/Twitch existants.

## Architecture publique

- `/` — Accueil : identité HALARYK, statut Twitch et événement à la une.
- `/evenements/` — événement actif + archives globales des grands projets.
- `/evenements/ppo-europe/` — page dédiée à la campagne EU4 PPO Europe.
- `/contenu/` — planning, ludothèque et clips.
- `/communaute/` — Cabinet des idées, réputation et collaborateurs.
- `/infos/` — règlement, commandes, configuration, FAQ, partenaires et réseaux.
- `/admin/` — administration privée.

Les anciens liens `#planning`, `#cabinet/...`, `#reputation`, etc. arrivant sur l’accueil sont redirigés vers leur nouvelle page thématique.

## Événements

La migration `supabase/MIGRATION_V5_EVENTS.sql` ajoute un modèle générique d’événement :

- événement actif / archivé ;
- participants ;
- sessions et intersessions ;
- relevés statistiques historiques ;
- chronologie / RP ;
- médias.

La PPO Europe est initialisée avec :

- état initial : 11 novembre 1444 ;
- fin Session I : 16 janvier 1481 ;
- fin Session II / situation actuelle connue : 15 janvier 1507 ;
- chronologie publique limitée à 1497 ;
- Session III prévue vendredi 18 septembre 2026 au soir.

Les sauvegardes `.eu4` brutes ne sont jamais servies par le site et ne doivent pas être ajoutées au dépôt GitHub.

## Sécurité

Les tables V5 ont RLS activé. Les visiteurs ne lisent que les éléments explicitement publics/validés. Les éléments RP préchargés pour relecture restent privés jusqu’à validation depuis l’administration.
