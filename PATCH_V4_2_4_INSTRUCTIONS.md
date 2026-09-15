# HALARYK V4.2.4 — Hotfix modales admin

Remplacer uniquement les trois fichiers suivants dans le dépôt GitHub :

- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`

Aucune migration SQL ni aucun redéploiement Supabase n’est nécessaire.

## Correctif

- les modales admin sont désormais fermées par défaut de façon autonome ;
- restauration BFCache / retour navigateur : état des modales réinitialisé ;
- `Confirmer`, `Annuler`, la croix et le clic sur l’arrière-plan continuent à fermer normalement une vraie confirmation ;
- la modale d’ajout d’un jeu utilise le même mécanisme robuste.
