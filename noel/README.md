# HALARYK — Sapin communautaire de Noël 2026

Branche de préparation : `feature/sapin-noel-2026` — ne pas fusionner avec `main` avant l'ouverture prévue le 1er décembre 2026.

## Choix final retenu
Le sapin reste **en 2D**, avec une grande image réaliste éclairée et des cadeaux, sur la gauche de la section Noël. **Aucun Three.js, moteur WebGL ni rotation 3D**.

Le reste de l'accueil HALARYK reste inchangé : titre, planning, Twitch, navigation, réseaux et direction artistique. La section EU4 disparaît uniquement de la page d'accueil et reste accessible depuis Événements.

## Fonctionnement attendu
- Boules de plusieurs styles dans un carrousel à droite
- Un message de 1 à 180 caractères par compte Twitch
- Option « Publier anonymement » ; identité vérifiable par l'administrateur uniquement
- Position fixe et déterministe pour chaque boule, sans pouvoir déplacer les décorations d'autrui
- Consultation des messages au clic, accessible à tous les visiteurs
- Formulaire bloqué sans connexion Twitch et avant ouverture officielle
- Image de fond `noel/assets/sapin-realiste.webp` (sans boules)
- Site public non modifié pendant la préparation

## Prévisualisation
`noel/apercu/index.html` est autonome : elle intègre les styles et l'image du sapin. La connexion Twitch et la publication réelle ne fonctionnent pas depuis un fichier HTML local.

## À terminer pour publication
1. Tester placement, lecture et visibilité de nombreuses boules sur PC et mobile.
2. Contrôler les règles de participation et les collisions entre décorations.
3. Tester les RPC et RLS proposées dans `noel/schema_sapin_2026.sql` dans un environnement Supabase approprié. **Le SQL n'a pas été exécuté**.
4. Ajouter les outils de modération des messages et d'identification privée dans l'administration.
5. Vérifier l'accès Twitch, l'anti-spam, les restrictions de période et l'anonymat réel au niveau réseau.
6. Tester le fonctionnement complet avant fusion sur `main` au 1er décembre.

Aucune publication de la version Noël ou modification de la base de données n'est impliquée par ces fichiers de préparation.
