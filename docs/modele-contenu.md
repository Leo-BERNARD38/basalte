# Modèle de contenu

## Une page est un fichier

```json
{
  "$format": 1,
  "blocks": [
    {
      "id": "b1a2",
      "type": "hero",
      "hidden": { "fr": false, "en": false },
      "props": {
        "title": { "fr": "Votre projet mérite mieux", "en": "Your project deserves better" },
        "image": "/media/a3f2c1d4.jpg",
        "cta": { "label": { "fr": "Nous écrire", "en": "Get in touch" }, "href": "/contact" }
      }
    }
  ]
}
```

- **Langues imbriquées dans les champs**, pas dans les fichiers : la structure
  n'existe qu'une fois, donc elle ne peut pas diverger. Seuls les champs
  déclarés traduisibles sont dédoublés.
- **`id` stable**, jamais l'index : réordonner produit un déplacement dans le
  diff git, pas une réécriture.
- **`hidden` par langue** : masquer sans perdre le contenu, et afficher un bloc
  dans une langue seulement.
- **`$format`** en tête, pour rendre les migrations possibles.

## Un bloc est un dossier, deux fichiers

```
src/blocks/hero/
├── schema.ts      ce que le bloc contient
└── Hero.astro     comment il s'affiche
```

```ts
export default block({
  name: 'hero',
  label: 'Bandeau principal',
  fields: {
    title:    f.text({ label: 'Titre', i18n: true, max: 80, required: true }),
    subtitle: f.textarea({ label: 'Sous-titre', i18n: true, max: 200 }),
    image:    f.image({ label: 'Image de fond', ratio: '16/9' }),
    cta:      f.group({ label: 'Bouton', fields: {
      label: f.text({ i18n: true, max: 30 }),
      href:  f.url(),
    }}),
  },
})
```

Ce fichier unique produit **quatre sorties** : le formulaire du panel, la
validation, le type TypeScript consommé par le composant, et l'entrée dans la
bibliothèque de blocs.

## Pourquoi un DSL `f.*` plutôt que du Zod nu

Un schéma Zod décrit une forme de donnée, pas une interface. Il ignore le
libellé d'un champ, son type d'entrée, sa traduisibilité et son ordre
d'affichage. `f.*` est une couche mince qui émet à la fois un schéma Zod pour
la validation et une description d'interface pour le panel — une déclaration,
deux sorties, aucune désynchronisation possible.

Les contraintes (`max: 80`) ne sont pas cosmétiques : elles protègent la DA. Le
panel empêche le dépassement, et le build le refuserait. **Les renseigner
systématiquement.**

Un bloc ne valide jamais rien à la main : si une vérification manque, elle
s'ajoute à `f.*`. Voir `conventions.md`.

## Le registre est une convention

Le socle scanne ses propres blocs puis `src/blocks/*/schema.ts` du dépôt
client. Rien à déclarer, aucun registre central à éditer.

C'est le levier Claude Code du projet : créer un bloc, c'est écrire deux
fichiers, sans toucher à une configuration centrale et sans risque d'oublier un
branchement.

## Langues

Elles se déclarent dans `site.config.ts` :

```ts
languages: {
  fr: { default: true },
  en: { draft: true },     // en préparation, pas encore en ligne
}
```

**Un site à une seule langue ne voit jamais le multilingue** : aucun champ
n'est dédoublé, et le panel n'affiche aucun sélecteur. Le client ignore que la
fonction existe.

**Une langue en ligne exige toutes ses traductions.** Un champ `i18n: true`
laissé vide dans une langue en ligne fait échouer `basalte check`.

**Une langue en préparation ne bloque rien** : elle n'est pas construite, elle
n'empêche aucune publication, et le panel affiche son avancement (« anglais :
12 champs sur 40 »). Le client retire `draft` quand elle est complète.

Sans cet état intermédiaire, ajouter une langue à un site existant le rendrait
invalide d'un seul coup, et le client ne pourrait plus rien publier tant qu'il
n'aurait pas tout traduit.

**Masquer par langue** fonctionne au niveau du bloc (`hidden`) et au niveau de
la page. Une page absente d'une langue ne figure ni dans le sitemap de cette
langue, ni dans ses `hreflang`.

## Migrations de format

Les migrations vivent **dans le socle**, jamais dans un dépôt client :

```
migrations/002-cta-devient-groupe.ts
```

Chacune transforme le JSON d'un format vers le suivant. Elles arrivent chez le
client avec `npm install` — il n'y a rien de plus à brancher.

`basalte migrate` lit le `$format` de chaque fichier, applique dans l'ordre
celles qui manquent, met à jour le numéro et commit. `basalte check` refuse de
construire un contenu en retard de format, avec un message qui nomme la
commande à lancer.

Le résultat étant un commit, `git revert` annule une migration comme le reste.
`npm run update` les enchaîne automatiquement, et annule tout en cas d'échec —
voir `mise-a-jour.md`.

## Validation

`basalte check` s'exécute à l'enregistrement dans le panel, avant chaque build,
et en pré-commit. Il détecte :

- un type de bloc inconnu
- un champ requis vide
- une traduction manquante dans une langue **en ligne**
- un texte dépassant sa contrainte
- une image absente du disque
- un format de contenu obsolète
- un média orphelin
- une valeur de style en dur dans un bloc (`design.md`)

Dans une langue **en préparation**, une traduction manquante avertit sans
bloquer : le panel affiche l'avancement.
