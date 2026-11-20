# HALARYK — Sapin communautaire de Noël 2026

**Branche de préparation** : `feature/sapin-noel-2026`
**Mise en ligne prévue** : **1er décembre 2026** (heure de Paris).
La branche doit rester séparée de `main` jusqu'à la publication souhaitée. **Aucun compte à rebours ni mécanisme de mise en ligne automatique n'est inclus.**

## Présentation

- À la mise en ligne de la branche, le sapin remplace directement la section EU4 sur la page d'accueil. Les événements EU4 restent accessibles dans la rubrique Événements.
- Sapin 2D réaliste, éclairé, avec 10 ornements distincts en WebP transparents de 512 × 512 pixels (un fichier par décoration).
- 40 emplacements fixes et irréguliers, attribution selon l'ordre caché **7, 14, 21, 28, 35, 2, 9…**.
- Animation courte d'installation de la boule, adaptée aux préférences de réduction des mouvements.
- Clic sur une décoration : bulle de discussion à côté de la boule. À la souris elle se masque en quittant la zone ; sur écran tactile/au clavier, fermeture par la croix, Échap ou clic extérieur.
- Une boule par compte Twitch ; message de 1 à 180 caractères, avec publication anonyme possible pour les autres visiteurs.
- Actualisation des messages et de la visibilité toutes les 30 secondes lorsque la page est visible.

## Ouverture et données

- **Date d'ouverture des participations : mardi 1er décembre 2026 à 00:00 (Europe/Paris, UTC+01).**
- Le formulaire navigateur et les fonctions SQL appliquent la même limite horaire. Le blocage côté Supabase fait autorité, y compris si l'horloge du visiteur est fausse.
- La table Supabase `christmas_tree_ornaments` et les fonctions de lecture, d'ajout et de modération sont installées, avec RLS et droits RPC adaptés.
- Migration initiale : `halaryk_christmas_tree_2026_secure_launch`; changement de date : `halaryk_christmas_tree_open_december_1_2026`.
- Les décorations masquées conservent leur place. L'identité derrière un message anonyme reste réservée à l'admin.

## Administration

- Onglet **Sapin de Noël** : voir auteur Twitch réel, nom affiché, message, modèle, emplacement et visibilité.
- Possibilité de masquer puis rétablir les messages sans réattribuer les places.
- Toutes les fonctions d'administration vérifient les droits côté serveur.

## Tester sans publier

L'aperçu autonome `noel/apercu/index.html` contient les images, styles et scripts nécessaires. Il démarre directement sur le sapin en mode démonstration ; les messages de test ne vont pas dans Supabase.

## Vérifications avant la fusion à main

1. Vérifier une vraie connexion Twitch et une contribution sur la version hébergée, ainsi que le blocage de la seconde contribution.
2. Tester un message anonyme et sa modération depuis l'administration, avec un compte ayant les droits.
3. Vérifier la répartition et la lisibilité des 40 boules sur PC et mobile, ainsi que les interactions clavier/tactile/souris.
4. Vérifier le domaine de production et les URL de redirection Twitch avant publication.
5. Fusionner ou déployer la branche uniquement au **1er décembre**, comme décidé ; le code ne fera **pas** cette publication à lui seul.

Le site public (`main`) n'a pas été modifié par cette préparation.
