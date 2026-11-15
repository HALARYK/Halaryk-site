# Sapin communautaire HALARYK — préparation Noël 2026

Branche de préproduction `feature/sapin-noel-2026` : **NE PAS FUSIONNER AVANT LE 1er DÉCEMBRE 2026**.

## Contenu du prototype
- Sapin 3D procédural Three.js (aiguilles/branches instanciées), LED, cadeaux et lente rotation.
- Carousel de 6 boules, message signé/anonyme, placement en mémoire, clic sur la boule pour lire.
- Page de test `/noel/apercu/` et remplacement de la zone EU4 **uniquement sur cette branche**.
- Les Chroniques EU4 restent disponibles sur `/evenements/chroniques-europe/`.
- Aucun appel Supabase et aucune donnée personnelle envoyée dans cette préversion.

## Reste à développer avant ouverture
1. Évaluer le rendu visuel (si nécessaire remplacer le sapin procédural par un modèle PBR réaliste licencié).
2. Schéma Supabase sécurisé : boules, auteurs et statuts de modération ; table publique sans exposition des identités anonymes.
3. Connexion Twitch : une boule par compte vérifié côté serveur.
4. Validation/masquage/suppression admin et défense anti-spam.
5. Placement stable des boules, gestion collisions et nombreux visiteurs.
6. Accessibilité, performance sur mobile et fallback sans WebGL.
7. Retirer les mentions « aperçu » et activer la persistance uniquement après tests.
8. Fusionner la branche vers main le 1er décembre après validation.

## Dépendances
Three.js 0.170.0 chargé en ES module depuis jsDelivr, pas de modèle externe propriétaire ni de textures externes. WebGL requis pour le rendu 3D.
