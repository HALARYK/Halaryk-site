# HALARYK — Sapin communautaire Noël 2026

**Préproduction uniquement** : branche `feature/sapin-noel-2026`. Ne pas fusionner avec `main` avant le 1er décembre 2026.

## Ce que contient la branche
- L'accueil d'origine : header, réseaux, hero, planning, statut Twitch, et footer conservés.
- Seule la section de mise en avant d'événement sur l'accueil est remplacée par le sapin.
- Aucune référence visible à EU4 sur l'accueil ; EU4 reste dans la rubrique Événements.
- Sapin Three.js r149 embarqué localement (`noel/vendor/three.min.js`, licence MIT).
- Sapin transparent sans encadrement, placé à gauche ; formulaire encadré à droite.
- Feuillage composé de rameaux texturés instanciés (chargement beaucoup plus léger que la version précédente).
- Guirlande lumineuse, cadeaux au pied, rotation lente, glisser-déposer horizontal pour tourner, support des boules cliquables.
- 6 styles, message de 180 caractères, publication anonyme possible.
- Interface en lecture seule tant que l'utilisateur n'est pas connecté à Twitch ou que l'événement n'est pas ouvert.
- `noel/apercu/index.html` : aperçu **autonome** avec CSS et Three.js embarqués ; il peut être ouvert en local, sans charger les modules de l'accueil.

## SÉCURITÉ : migration non appliquée
Le fichier `noel/schema_sapin_2026.sql` contient les tables et fonctions RPC prévues, mais **n'a pas été appliqué à Supabase**.

Après tests et validation : déployer la migration avec RLS, vérifier que la lecture publique ne révèle pas l'identité des auteurs anonymes, tester l'unicité par compte Twitch et la modération. Puis activer la publication pour le 1er décembre.

Les RPC prévues sont :
- `christmas_tree_public_2026` (lecture des boules et auteurs publics uniquement)
- `christmas_tree_place_2026` (auth Twitch, une boule par utilisateur, fermeture hors période)
- `christmas_tree_admin_2026` (lecture privée administrateur)
- `christmas_tree_set_visibility_2026` (modération administrateur)

Il reste à ajouter les commandes de modération dans l'administration, puis réaliser un test en conditions réelles sur mobile et ordinateur.

## Pourquoi l'ancien aperçu semblait cassé
L'ancienne prévisualisation était ouverte en `file://` tout en important des modules JavaScript locaux (`app.js` et `noel/loader.js`). Les navigateurs bloquent ces imports, d'où la disparition du contenu dépendant du JS et l'absence du sapin. Le nouvel aperçu utilise des scripts classiques intégrés au fichier et force la visibilité du hero. En production, la 3D est chargée à la demande depuis le dépôt.

## Livraison
Publication uniquement après contrôle visuel du rendu et tests des RPC ; cible : 1er décembre 2026.
