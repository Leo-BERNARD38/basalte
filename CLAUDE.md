# landing-custom

Socle technique pour landing pages éditables par leurs propriétaires.
Publié en package npm `@socle/core`, installé depuis git par tag dans un dépôt
par site.

**Design de référence :** `docs/superpowers/specs/2026-08-29-socle-landing-pages-design.md`
Le pourquoi de chaque décision y est. Ce fichier ne donne que les faits.

## État

Aucun code. Spec validé, implémentation non commencée.
Ordre d'implémentation : section 19 du spec.

## Stack

| Usage | Techno |
|---|---|
| Tout le code | TypeScript |
| Rendu du site public | Astro, statique |
| Schémas de contenu | Zod, sous un DSL `f.*` |
| Panel d'édition | React + Mantine + dnd-kit |
| Styles | CSS natif + custom properties |
| Auth, sessions, leads | SQLite |
| Traitement d'images | sharp |
| Déploiement | Docker Compose + Caddy |
| Email | Brevo, derrière une interface agnostique |

Pas de Tailwind. Pas de framework CSS. Pas d'ORM.

## Structure

```
src/
├── astro/          intégration Astro (injecte routes, i18n, sitemap)
├── fields/         DSL f.* → schéma Zod + description d'interface
├── blocks/         bibliothèque de blocs de base
│   └── <nom>/      schema.ts + <Nom>.astro
├── admin/          panel : island React unique
├── server/         auth, écriture contenu, publication, contact
├── seo/            meta, JSON-LD, sitemap, hreflang
└── cli/            init, check, migrate, admin:login, update-all
examples/demo/      site de démonstration, banc de test
docs/
```

## Règles absolues

Ces invariants portent la sécurité et les performances. Ne pas les contourner.

1. **Jamais de HTML libre dans le contenu.** Texte échappé au rendu. Pour du
   gras et des liens : Markdown restreint assaini au build.
2. **SVG refusé au téléversement.** Les vectoriels sont déposés dans le dépôt.
3. **L'image stockée n'est jamais celle reçue** — ré-encodage sharp
   systématique, EXIF supprimé, nom dérivé de l'empreinte du contenu, type
   vérifié sur les octets réels.
4. **Aucun `^` dans les dépendances.** `npm ci` au déploiement, jamais
   `npm install`.
5. **Le site public n'embarque aucun JavaScript par défaut.** L'interactivité
   est opt-in, bloc par bloc.
6. **Le panel est une island React unique**, montée en `client:only="react"`.
   Jamais plusieurs islands (Astro ne partage pas de contexte entre elles).
7. **Un bloc = un dossier, deux fichiers.** Aucun registre central à éditer :
   le socle scanne `src/blocks/*/schema.ts`.
8. **Aucun code du socle copié dans un dépôt client.** Un besoin non couvert se
   traite par un point d'extension dans le socle.
9. **Les langues sont imbriquées dans les champs**, jamais un fichier par
   langue.
10. **`id` de bloc stable**, jamais l'index de position.
11. **Le build ne remplace jamais le site en place** — bascule de lien
    symbolique une fois le build terminé.

## Modèle de contenu

Une page est un fichier JSON : `{ "$format": 1, "blocks": [...] }`.
Un bloc : `{ id, type, hidden: { <lang>: bool }, props }`.
Les champs traduisibles portent `{ "fr": …, "en": … }` ; les autres sont plats.

## Définir un bloc

```ts
// src/blocks/hero/schema.ts
export default block({
  name: 'hero',
  label: 'Bandeau principal',
  fields: {
    title: f.text({ label: 'Titre', i18n: true, max: 80, required: true }),
    image: f.image({ label: 'Image de fond', ratio: '16/9' }),
  },
})
```

Le schéma produit quatre sorties : formulaire du panel, validation, type
TypeScript pour le composant `.astro`, entrée dans la bibliothèque.
Les contraintes (`max`) protègent la DA — les renseigner systématiquement.

## Commandes

| Commande | Effet |
|---|---|
| `socle init <nom>` | génère un dépôt client complet |
| `socle check` | valide contenus contre schémas, puis build |
| `socle migrate` | applique les migrations de format |
| `socle admin:login --user <email>` | lien de connexion de secours (SSH) |
| `socle update-all` | monte de version une liste de sites |

`socle check` s'exécute à l'enregistrement dans le panel, avant chaque build et
en pré-commit. C'est le test d'intégration du projet.

## Vocabulaire

- **toi / le mainteneur** — produit la DA, les blocs, maintient le socle
- **le client** — édite son site via le panel, ne voit jamais de code
- **le dépôt client** — dépôt git d'un site ; peut contenir des blocs sur
  mesure écrits par le mainteneur dans `src/blocks/`

## Pièges connus

- Astro n'optimise que les images **importées** dans le code, pas celles
  désignées par une chaîne venue d'un JSON. Passer par `import.meta.glob`.
- Le code email d'authentification doit être lié à la tentative de connexion en
  cours, pas au seul compte, sinon il est rejouable ailleurs.
- Les emails d'auth empruntent un canal distinct de ceux du formulaire de
  contact.
