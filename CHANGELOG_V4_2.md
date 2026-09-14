# HALARYK — V4.2

## Interface / mobile
- Recomposition mobile de l’accueil pour que `HALARYK` reste entièrement visible.
- Navigation mobile plein écran, plus aérée, avec sous-menu Infos intégré.
- Marges, titres, boutons et sections adaptés au tactile.
- Les colonnes florales restent présentes mais deviennent beaucoup plus discrètes sur petit écran.

## Navigation desktop
- Le menu `Infos` devient un mega-menu en deux familles : **La chaîne** et **L’écosystème**.
- Les liens secondaires disposent d’une courte description pour améliorer la lisibilité.

## Cabinet des idées
- La section publique est renommée **Le Cabinet des idées**.
- Deux espaces clairement identifiés : **Propositions** et **Sondages**.
- URLs partageables :
  - `#cabinet/propositions`
  - `#cabinet/sondages`
  - `#cabinet/proposition/<id>`
  - `#cabinet/sondage/<id>`
- Bouton de copie de lien sur chaque proposition et chaque sondage.
- Un lien profond ouvre automatiquement le bon onglet, descend vers l’élément et le met temporairement en évidence.
- L’ancienne ancre `#suggestions` reste compatible et renvoie vers les propositions.

## Ludothèque
- Catégories publiques : **En cours**, **Terminés**, **À venir**, **Tous**.
- `wishlist` est conservé comme valeur technique Supabase mais affiché comme **À venir**.
- L’ancien statut `backlog` est migré vers `wishlist` par la migration V4.2.
- Recherche publique par nom du jeu, studio ou note.
- Cartes enrichies : studio, année de sortie, note /10, résumé court, statut et indicateur de stream.
- Les anciennes jaquettes IGDB `t_cover_big` sont demandées en `t_cover_big_2x` à l’affichage ; les nouveaux jeux sont enregistrés directement avec cette meilleure source.
- Sur desktop : zone limitée à deux rangées, puis scroll interne à la ludothèque.
- Sur mobile : 4 jeux visibles puis bouton **Voir toute la ludothèque** (pas de scroll imbriqué pénible au tactile).
- Clic sur un jeu : grande fiche modale avec jaquette, studio, date, note, statut, temps de jeu, résumé complet et commentaire HALARYK.
- Administration : studio, résumé et note /10 sont éditables.
- Bouton **Actualiser via IGDB** sur les jeux déjà présents pour récupérer automatiquement studio, résumé, date et jaquette HD.

## Clips Twitch
- Nouvelle rubrique **Clips Twitch** dans l’administration.
- 4 emplacements maximum, modifiables par URL Twitch ou slug.
- Les clips publics sont désormais lus dans Supabase ; `config.js` reste un fallback si la migration n’a pas encore été exécutée.

## Backend
- `library_games` : ajout de `developer` et `summary`.
- Nouvelle table `site_clips` avec 4 positions, lecture publique et écriture réservée à l’administrateur.
- `game-search` IGDB récupère désormais résumé + studio développeur + jaquette `cover_big_2x`.
