// Le paquet Claude Code d’un dépôt client, en deux fichiers aux durées de vie
// opposées.
//
// `CLAUDE.md` est écrit une fois par `init` et appartient au mainteneur : il
// décrit *ce site*. `.claude/basalte.md` est régénéré à chaque installation
// (D27) et décrit *le socle* : ses règles, ses commandes, et l’inventaire des
// blocs produit depuis le code. Le premier importe le second, ce qui met la
// doc agent à jour dans le même geste qu’une montée de version, sans jamais
// écraser ce qui a été écrit à la main.
//
// Il importe aussi `docs/CONTEXT.md` et `docs/DESIGN.md` : qui est le client,
// et ce que sa direction artistique cherche. Ces deux-là sont longs, révisés,
// et rédigés par entretien — les tenir hors de `CLAUDE.md`, qui porte les
// règles du dépôt, garde chacun lisible.

import type { GeneratedFile, SiteAnswers } from './files.js'

export const AGENT_DIR = '.claude'
export const AGENT_DOC = `${AGENT_DIR}/basalte.md`
export const AGENT_IMPORT = `@${AGENT_DOC}`
export const CONTEXT_DOC = 'docs/CONTEXT.md'
export const DESIGN_DOC = 'docs/DESIGN.md'

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
    ...firstLogin(),
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

// Le panel demande une session dès le premier accès, y compris en local : sans
// cette section, un dépôt neuf sert un écran de connexion que rien n’explique,
// et la commande qui en sort n’est nommée nulle part dans le dépôt.
function firstLogin(): readonly string[] {
  return [
    '## Ouvrir le panel la première fois',
    '',
    'Sous `npm run dev`, `/admin` demande une session comme en production, et',
    'un dépôt neuf n’a pas encore de compte. Il s’en crée un, une fois :',
    '',
    '```bash',
    'npx basalte admin:login --user <email> --create --origin http://localhost:4321',
    '```',
    '',
    'Elle affiche le mot de passe une seule fois — jamais par email — et un',
    'lien valable dix minutes. Sans `--origin`, le lien porte le domaine du',
    'site : celui de la production, qui ne répond pas en local.',
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
      `@${CONTEXT_DOC}`,
      `@${DESIGN_DOC}`,
      '',
      '## Ce site',
      '',
      `- Domaine : ${answers.domain}`,
      `- Langues : ${answers.languages.join(', ')} — la première est celle par défaut`,
      '',
      `Qui est le client, ce qu’il vend et à qui : ${CONTEXT_DOC}.`,
      `Ce que la direction artistique cherche : ${DESIGN_DOC}.`,
      'Les deux se remplissent par entretien — la skill « contexte ».',
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

// Le contexte du site, en deux fichiers que l’agent charge à chaque session.
// Ils partent en squelette de questions plutôt qu’en page blanche : une section
// vide se voit, et se remplit.
export function contextDocs(answers: SiteAnswers): readonly GeneratedFile[] {
  return [
    {
      path: CONTEXT_DOC,
      contents: [
        `# ${answers.name} — le client`,
        '',
        'Écrit par entretien, jamais deviné. Une section vide vaut mieux qu’une',
        'section inventée : ce fichier est lu comme vrai.',
        '',
        '## Ce qu’il fait',
        '',
        'à compléter — le métier en une phrase, puis ce qu’il vend vraiment.',
        '',
        '## À qui',
        '',
        'à compléter — qui achète, sur quelle zone, et ce qui les décide.',
        '',
        '## Ce qui le distingue',
        '',
        'à compléter — ce qu’un concurrent ne pourrait pas écrire de lui-même.',
        '',
        '## Le ton',
        '',
        'à compléter — vouvoiement ou tutoiement, registre, longueur des',
        'phrases, et un exemple de phrase juste.',
        '',
        '## Les mots',
        '',
        'à compléter — le vocabulaire du métier à employer, et celui à éviter.',
        '',
        '## Ce qu’il ne dit jamais',
        '',
        'à compléter — promesses interdites, comparaisons, prix affichés.',
        '',
      ].join('\n'),
    },
    {
      path: DESIGN_DOC,
      contents: [
        `# ${answers.name} — la direction artistique`,
        '',
        'L’intention, pas les valeurs : les valeurs vivent dans les tokens de',
        'site.config.ts, et nulle part ailleurs. Ce fichier dit pourquoi elles',
        'sont ce qu’elles sont.',
        '',
        '## Ce qu’on cherche',
        '',
        'à compléter — trois adjectifs, et ce qu’ils veulent dire ici.',
        '',
        '## Ce qu’on évite',
        '',
        'à compléter — ce qui trahirait le client.',
        '',
        '## Références',
        '',
        'à compléter — des sites ou des images, avec ce qu’on leur prend.',
        '',
        '## Les tokens retenus',
        '',
        'à compléter — chaque écart au défaut du socle, et sa raison.',
        '',
        '## Le plancher',
        '',
        'Non négociable, quelle que soit la maquette : lisible à 375 px,',
        'contraste de 4,5:1, focus clavier visible, cibles de 44 px, texte',
        'alternatif sur chaque image porteuse de sens, aucun décalage au',
        'chargement.',
        '',
      ].join('\n'),
    },
  ]
}
