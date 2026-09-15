# HALARYK V4.2.4 — structure canonique du dépôt

À la racine du dépôt, les fichiers publics sont : `index.html`, `app.js`, `style.css`, `config.js`.

Les fichiers de l'administration doivent rester dans `admin/` :
- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`

Il ne doit PAS y avoir `admin.js` ni `admin.css` à la racine.
Le `index.html` à la racine est la page publique et ne doit jamais être remplacé par `admin/index.html`.

Les Edge Functions et migrations restent dans `supabase/`.
Les fichiers `.md` sont de la documentation et n'affectent pas le site.
