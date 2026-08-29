// Le paquet Claude Code d’un dépôt client, en deux fichiers aux durées de vie
// opposées.
//
// `CLAUDE.md` est écrit une fois par `init` et appartient au mainteneur : il
// décrit *ce site*. `.claude/basalte.md` est régénéré à chaque installation
// (D27) et décrit *le socle* : ses règles, ses commandes, et l’inventaire des
// blocs produit depuis le code. Le premier importe le second, ce qui met la
// doc agent à jour dans le même geste qu’une montée de version, sans jamais
// écraser ce qui a été écrit à la main.

import type { GeneratedFile, SiteAnswers } from './files.js'

export const AGENT_DIR = '.claude'
export const AGENT_DOC = `${AGENT_DIR}/basalte.md`
export const AGENT_IMPORT = `@${AGENT_DOC}`

const GENERATED =
  'Fichier généré par @leobernard/basalte à chaque installation. Ne pas modifier : la prochaine montée de version l’écrasera.'

/** `.claude/basalte.md`, à partir de l’inventaire déjà rendu par le CLI. */
export function basalteDoc(
  inventory: readonly string[],
  version: string,
): string {
  return [
    `<!-- ${GENERATED} -->`,
    '',
    `# Le socle basalte — version ${version}`,
    '',
    ...rules(),
    '',
    ...commands(),
    '',
    '## Ce qui est réutilisable',
    '',
    'Avant d’écrire une fonction ou un bloc, le chercher ici. Écrire une',
    'variante locale de ce qui existe est un défaut, même quand elle marche.',
    '',
    '```',
    ...inventory,
    '```',
    '',
  ].join('\n')
}

function rules(): readonly string[] {
  return [
    '## Les douze règles absolues',
    '',
    'Les enfreindre donne un site qui fonctionne et une garantie détruite.',
    '',
    '1. **Jamais de HTML libre dans le contenu.** Le texte est échappé au rendu.',
    '   Pour du gras et des liens, le champ `f.richtext` et son Markdown restreint.',
    '2. **SVG refusé au téléversement.**',
    '3. **L’image stockée n’est jamais celle reçue** : ré-encodage systématique,',
    '   EXIF supprimé, nom dérivé de l’empreinte.',
    '4. **Aucun `^` dans les dépendances**, et `npm ci` au déploiement.',
    '5. **Le site public n’embarque aucun JavaScript par défaut.** Un bloc qui en',
    '   veut le déclare, bloc par bloc.',
    '6. **Le panel est une island React unique.**',
    '7. **Un bloc = un dossier, deux fichiers** : `schema.ts` et le composant',
    '   `.astro` du même nom en PascalCase. Aucun registre central à éditer.',
    '8. **Aucun code du socle copié ici.** Un besoin non couvert s’ajoute au',
    '   socle ; le contourner localement crée une divergence permanente.',
    '9. **Les langues sont imbriquées dans les champs**, jamais un fichier par langue.',
    '10. **Un `id` de bloc est stable**, jamais l’index de position.',
    '11. **Le build ne remplace jamais le site en place.**',
    '12. **Le mot de passe initial ne transite jamais par email.**',
    '',
    'Deux règles de ce dépôt s’y ajoutent :',
    '',
    '- **Aucune valeur de style en dur dans un bloc.** Couleurs, espacements et',
    '  typographies passent par un token de `site.config.ts`. Un besoin non',
    '  couvert est un token à ajouter au socle, jamais un `padding: 27px` isolé.',
    '- **Un bloc ne valide rien à la main.** Toute contrainte passe par `f.*`.',
  ]
}

function commands(): readonly string[] {
  return [
    '## Les cinq commandes',
    '',
    '| Commande | Effet |',
    '|---|---|',
    '| `npm run dev` | le site et le panel en local, sur la même adresse |',
    '| `npm run check` | valide les contenus contre les schémas |',
    '| `npm run deploy -- --host <ip>` | provisionne la machine, ou la met à jour |',
    '| `npm run doctor` | prouve que la configuration fonctionne |',
    '| `npm run update` | monte le socle de version, ou annule tout |',
    '',
    '`npm run check` tourne aussi en pré-commit. Il refuse un champ requis vide,',
    'une traduction manquante dans une langue en ligne, une image absente du',
    'disque, et un format de contenu en retard — auquel cas il nomme',
    '`basalte migrate`.',
  ]
}

/** Le `CLAUDE.md` de départ, écrit une seule fois. */
export function claudeDoc(answers: SiteAnswers): GeneratedFile {
  return {
    path: 'CLAUDE.md',
    contents: [
      `# ${answers.name}`,
      '',
      AGENT_IMPORT,
      '',
      '## Ce site',
      '',
      `- Domaine : ${answers.domain}`,
      `- Langues : ${answers.languages.join(', ')} — la première est celle par défaut`,
      '- Client : à compléter — qui c’est, ce qu’il vend, à qui.',
      '- Ton : à compléter — vouvoiement ou tutoiement, registre, longueur des phrases.',
      '',
      '## Direction artistique',
      '',
      'Elle vit entièrement dans les `tokens` de `site.config.ts`. Pour la',
      'régler ou implémenter une maquette, la skill `design`.',
      '',
      '## Ce qu’il ne faut pas toucher',
      '',
      '- `content/*.json` en production sans passer par `npm run check`.',
      '- Le CSS d’un bloc pour changer une couleur : c’est un token.',
      '- `.claude/basalte.md`, régénéré à chaque installation.',
      '',
      '## Ce que ce fichier doit devenir',
      '',
      'Ce squelette est écrit une seule fois, à l’`init`. Rien ne le régénère :',
      'il est à remplir, et il vieillit avec le site.',
      '',
    ].join('\n'),
  }
}
