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

## Le registre est une convention

Le socle scanne ses propres blocs puis `src/blocks/*/schema.ts` du dépôt
client. Rien à déclarer, aucun registre central à éditer.

C'est le levier Claude Code du projet : créer un bloc, c'est écrire deux
fichiers, sans toucher à une configuration centrale et sans risque d'oublier un
branchement.

## Validation

`basalte check` s'exécute à l'enregistrement dans le panel, avant chaque build,
et en pré-commit. Il détecte :

- un type de bloc inconnu
- un champ requis vide
- un texte dépassant sa contrainte
- une image absente du disque
- un format de contenu obsolète
- un média orphelin

Une traduction manquante **avertit sans bloquer** : le panel affiche un badge,
le site sert la langue par défaut en repli.
