# HALARYK — Sapin communautaire Noël 2026

Branche de travail : `feature/sapin-noel-2026` (ne pas fusionner sans validation).
Site public : `main`, actuellement inchangé.

## Calendrier de lancement

- **Samedi 21 novembre 2026 à 09:00 (heure de Paris, CET / UTC+01)** :
  reprise des lives et ouverture des contributions.
- Avant cet instant, l'emplacement de l'événement de la page d'accueil affiche un compte à rebours.
- À l'heure prévue, `noel/lancement.js` remplace automatiquement le compte à rebours par le sapin, y compris sur une page déjà ouverte.
- Le serveur Supabase refuse toute publication anticipée, indépendamment de l'horloge du navigateur.
- **Point de déploiement essentiel** : la branche doit être fusionnée/déployée sur le site public **avant** le 21 novembre à 09:00. Une branche GitHub non déployée ne peut pas modifier le site public automatiquement. GitHub Actions « schedule » n'est pas une garantie de déclenchement à la seconde.

## Collection et expérience visiteur

- Image réaliste en 2D, sans Three.js ni WebGL.
- Dix boules illustrées haute définition en dix fichiers WebP transparents de 512 × 512 px dans `noel/assets/ornaments/` : herbier, céleste, verre ancien, monde miniature, baroque, velours, tartan, roses, œuf précieux, petite maison d'hiver.
- Quarante emplacements fixes irréguliers, ordonnés de haut en bas, identifiants cachés ; distribution par saut de 7 : **7, 14, 21, 28, 35, 2, 9...** sans déplacer les autres boules.
- Une boule et un message de 1 à 180 caractères par compte Twitch. L'option « Publier anonymement » cache l'identité aux visiteurs, mais pas à l'administrateur.
- Animation de pose d'environ 0,78 seconde, avec prise en compte de `prefers-reduced-motion`.
- Clic sur une boule : petite bulle de discussion positionnée près de l'ornement. À la souris, elle s'efface en quittant la zone ; tactile et clavier : bouton fermer, Échap ou appui extérieur.
- Actualisation des décorations publiques toutes les 30 secondes, sauf onglet non visible. Les messages masqués par l'administration ne sont pas réaffichés à la synchronisation suivante.
- Le titre de la section n'affiche plus le pseudo du propriétaire. L'identité des auteurs apparaît uniquement dans les messages publics non anonymes.

## Administration et Supabase

- Onglet **Sapin de Noël** dans l'administration : voir les messages, leur auteur réel (y compris les contributions anonymes), leur emplacement et leur visibilité ; masquer/restaurer.
- Base Supabase `elnyjjasqfizkimoljvz` : migration `halaryk_christmas_tree_2026_secure_launch` appliquée le 17 novembre 2026.
- Table avec RLS et sans accès direct `anon`/`authenticated`, recours exclusivement aux RPC filtrées.
- RPC de lecture publique, insertion, compteur de 40 places, contrôle « déjà participé », lecture privée admin et modération admin.
- Les boules masquées conservent leur emplacement pour ne jamais déplacer un autre utilisateur.
- Contrôle initial : 0 place occupée, privilèges RPC vérifiés et refus des publications sans authentification vérifié. Ceci n'est **pas** un test complet du parcours OAuth et de publication depuis un compte Twitch réel.

## Aperçu

- `noel/apercu/index.html` est autonome (images, CSS et JS intégrés) et fonctionne en démonstration sans publication réelle.
- Par défaut, la page montre le sapin, permet de choisir une boule, d'ajouter des messages fictifs et de tester leur bulle.
- Le paramètre `?mode=decompte` montre le compte à rebours jusqu'au 21 novembre à 09:00.
- Les essais du mode aperçu ne sont enregistrés dans aucune base.

## Vérifications restant à effectuer avant diffusion publique

1. Sur la version hébergée, **tester une vraie connexion Twitch** avec un compte visiteur, puis avec le compte administrateur.
2. Au moins un essai d'enregistrement réel après l'ouverture : vérifier message public, anonymat, unicité, refus du second message et persistance après rechargement. Ne pas placer de message de test sur le vrai sapin avant le lancement.
3. Vérifier dans l'admin qu'un message anonyme affiche l'auteur réel, qu'il peut être masqué puis rétabli, et qu'il disparaît côté visiteurs.
4. Vérifier l'affichage de 40 boules sur PC et mobile ainsi que l'ouverture/fermeture des petites bulles, au doigt, à la souris et au clavier.
5. Confirmer le domaine public, la configuration des redirections OAuth Twitch, le cache et le déploiement de `main` **avant** samedi à 09:00.
6. Sur la page publique, contrôler l'heure du compteur sur un appareil en France et un appareil en décalage horaire ; le déclenchement doit viser 08:00 UTC.

Aucun automatisme de fusion GitHub n'a été créé. Le code de lancement est prêt sur la branche, **pas encore publié sur `main`**.
