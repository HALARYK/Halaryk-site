# V4.2.3

- Recherche IGDB admin étendue de 8 à 24 résultats par page.
- Pagination par lots de 24 résultats.
- Nouveau mode de recherche par studio de développement.
- Recherche studio via l'endpoint Companies puis les relations Involved Companies d'IGDB.
- Conservation de la sécurité : `game-search` exige toujours un JWT Supabase valide et les droits administrateur.
