# Mise en ligne — HALARYK V4.2

La V4.2 est conçue comme une mise à jour de la V4.1.2 corrigée. La configuration publique Supabase existante de `config.js` est conservée.

## 1. Sauvegarde
Avant remplacement, garde une copie du dépôt GitHub actuel.

## 2. Supabase : migration
Dans **Supabase > SQL Editor**, exécute intégralement :

`supabase/MIGRATION_V4_2.sql`

Cette migration :
- ajoute `developer` et `summary` aux jeux ;
- transforme les anciens jeux `backlog` en `wishlist` (affiché « À venir ») ;
- crée la table `site_clips` ;
- préremplit les quatre clips de la V4.1.2.

## 3. IGDB : redéployer game-search
Redéploie la fonction :

`supabase/functions/game-search/`

Elle récupère maintenant :
- résumé IGDB ;
- studio développeur ;
- couverture IGDB haute définition (`cover_big_2x`).

Les jeux déjà présents ne nécessitent pas d’être recréés : leurs anciennes URLs de couverture sont converties en version 2x côté affichage. Pour disposer du résumé/studio des anciens jeux, utilise le bouton **Actualiser via IGDB** présent sur chaque jeu disposant déjà d’un identifiant IGDB dans l’administration.

## 4. GitHub Pages
Remplace les fichiers du dépôt par ceux de la V4.2 puis laisse GitHub Pages redéployer.

## 5. Vérifications rapides
- mobile : menu hamburger, accueil et nom HALARYK intégralement visibles ;
- desktop : `Infos` ouvre le mega-menu ;
- ludothèque : recherche + deux rangées + fiche jeu ;
- `#cabinet/sondages` ouvre directement les sondages ;
- le bouton « Copier le lien » d’un sondage ouvre ce sondage ;
- `/admin/` contient l’onglet **Clips Twitch** ;
- modifier un des quatre clips et vérifier sa mise à jour publique.
