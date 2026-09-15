# Patch V4.2.2 — installation GitHub

Le backend Supabase de production a déjà reçu la migration V4.2.2 et `live-status` a déjà été redéployée.

Pour synchroniser GitHub Pages avec la production, remplace/ajoute les fichiers du patch à la racine de ton dépôt.

Fichiers applicatifs réellement nécessaires au site :
- `app.js`
- `admin/index.html` (badge de version uniquement)

Fichiers backend à conserver dans GitHub pour que le dépôt corresponde à la production :
- `supabase/schema.sql`
- `supabase/MIGRATION_V4_2_2_SECURITY.sql`
- `supabase/functions/live-status/index.ts`

Documentation :
- `CHANGELOG_V4_2_2.md`
- `PATCH_V4_2_2_INSTRUCTIONS.md`

Aucun changement dans `config.js`. Aucun secret privé n'est ajouté au dépôt.
