# SEO et performances

Découlent en grande partie des choix d'architecture plutôt que d'un effort
dédié.

- **HTML pré-rendu** servi depuis le disque, **zéro JavaScript par défaut**.
  L'interactivité est opt-in bloc par bloc : un carrousel charge son script, le
  reste de la page n'en charge aucun.
- **Routing i18n natif d'Astro** : `/` pour la langue par défaut, `/en/`
  ensuite, avec `hreflang` et sitemap couvrant toutes les langues.
- **Images** converties en WebP/AVIF avec `srcset` par taille d'écran.
- **Métadonnées**, Open Graph et JSON-LD générés depuis `site.config.ts` et le
  contenu. Le bloc FAQ émet un `FAQPage`.
- **`robots.txt` et sitemap** générés au build.

## Piège à connaître

Astro n'optimise nativement que les images **importées dans le code**, pas
celles désignées par une chaîne venue d'un JSON. Sans précaution, on sert les
originaux non optimisés et on perd tout le bénéfice.

Le socle construit donc une table des médias via `import.meta.glob` pour
rebrancher l'optimisation. C'est précisément là que la plupart des projets
perdent leur score sans comprendre pourquoi.
