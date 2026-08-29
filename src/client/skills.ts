// Les skills et les commandes déposées dans `.claude/` d’un dépôt client.
//
// Elles ne décrivent jamais le socle — c’est le rôle de `.claude/basalte.md`,
// régénéré. Elles décrivent des gestes : créer un bloc, régler la DA, rédiger,
// monter de version. Écrites une fois par `init`, elles appartiennent ensuite
// au dépôt et peuvent y être adaptées.

import path from 'node:path'

import { AGENT_DIR } from './agent.js'
import type { GeneratedFile } from './files.js'

export function agentSkills(): readonly GeneratedFile[] {
  return [
    skill('nouveau-bloc', 'Créer un bloc sur mesure pour ce site.', block()),
    skill('design', 'Régler les tokens, implémenter une maquette.', design()),
    skill('contenu', 'Rédiger et traduire le contenu des pages.', content()),
    skill(
      'mettre-a-jour',
      'Monter le socle de version, en lisant les notes d’abord.',
      update(),
    ),
    command('check', 'Valider les contenus contre les schémas.', [
      'Lance `npm run check`.',
      '',
      'S’il échoue, corrige les fichiers de `content/` qu’il nomme, puis',
      'relance-le. Ne modifie jamais un schéma de bloc pour faire passer un',
      'contenu : c’est le contenu qui est faux, ou le schéma qui manque une',
      'contrainte — et une contrainte s’ajoute au socle, pas ici.',
    ]),
    command('deploy', 'Mettre la machine à jour, ou la provisionner.', [
      'Demande l’adresse IP de la machine si elle n’est pas donnée, puis lance',
      '`npm run deploy -- --host <ip>`.',
      '',
      'La commande est idempotente : la relancer met la machine à jour. Elle',
      'ne touche jamais au contenu, qui appartient au panel. Elle finit par',
      '`npm run doctor` — lis sa sortie avant de dire que c’est fait.',
    ]),
  ]
}

function skill(
  name: string,
  description: string,
  body: readonly string[],
): GeneratedFile {
  return {
    path: path.posix.join(AGENT_DIR, 'skills', name, 'SKILL.md'),
    contents: [
      '---',
      `name: ${name}`,
      `description: ${description}`,
      '---',
      '',
      ...body,
      '',
    ].join('\n'),
  }
}

function command(
  name: string,
  description: string,
  body: readonly string[],
): GeneratedFile {
  return {
    path: path.posix.join(AGENT_DIR, 'commands', `${name}.md`),
    contents: [
      '---',
      `description: ${description}`,
      '---',
      '',
      ...body,
      '',
    ].join('\n'),
  }
}

function block(): readonly string[] {
  return [
    'Un bloc de ce site vit dans `src/blocks/<nom>/`, en deux fichiers, et rien',
    'd’autre n’est à déclarer nulle part (invariant 7).',
    '',
    '## Avant d’écrire',
    '',
    'Lance `npx basalte inventory`. Si un bloc du socle fait déjà ce que la',
    'section demande, emploie-le : une variante locale d’un bloc existant est',
    'un défaut, même quand elle marche.',
    '',
    '## Les deux fichiers',
    '',
    '`schema.ts` déclare les champs par le DSL `f.*`, et exporte par défaut le',
    'résultat de `block({ name, label, help, fields })`. Le `name` doit être',
    'celui du dossier. Aucune validation écrite à la main : une contrainte qui',
    'manque à `f.*` s’ajoute au socle.',
    '',
    '`<Nom>.astro` rend le bloc, en PascalCase. Il reçoit ses `props` déjà',
    'validées et traduites. Il ne contient **aucune valeur de style en dur** :',
    'chaque couleur, espacement et typographie est une variable CSS de token',
    '(`var(--color-accent)`, `var(--space-5)`). Aucun script, sauf besoin',
    'explicite : le site public n’embarque pas de JavaScript par défaut.',
    '',
    '## Ensuite',
    '',
    'Ajoute une section du nouveau type dans `content/index.json`, avec un `id`',
    'stable, puis lance `npm run check`. Le panel affiche le formulaire du bloc',
    'sans qu’il y ait rien à y brancher.',
  ]
}

function design(): readonly string[] {
  return [
    'La direction artistique de ce site vit dans les `tokens` de',
    '`site.config.ts`, et nulle part ailleurs. Le CSS d’un bloc ne se modifie',
    'pas pour changer une couleur.',
    '',
    '## Face à une maquette',
    '',
    '1. Sépare ce qui est **token** — couleur, typographie, espacement, rayon,',
    '   largeur — de ce qui est **structure** : l’agencement des éléments.',
    '2. Ajuste les tokens de `site.config.ts`. La liste est fermée : un nom que',
    '   le socle ne porte pas est refusé au chargement, et c’est voulu.',
    '3. Si la structure est nouvelle, c’est un bloc — voir la skill',
    '   `nouveau-bloc`.',
    '4. Vérifie le plancher ci-dessous, puis `npm run check`.',
    '',
    '## Le plancher, non négociable',
    '',
    '- Lisible à 375 px de large, et pensé mobile d’abord.',
    '- Contraste de 4,5:1 au moins entre un texte et son fond.',
    '- Focus clavier visible sur tout ce qui se clique.',
    '- Cibles tactiles de 44 px.',
    '- Texte alternatif sur chaque image porteuse de sens.',
    '- Aucun décalage de mise en page au chargement.',
  ]
}

function content(): readonly string[] {
  return [
    'Le contenu vit dans `content/*.json`. Une page par fichier, son nom donne',
    'sa route : `index.json` sert `/`, `contact.json` sert `/contact`.',
    '',
    '## Règles',
    '',
    '- Un champ traduisible porte une carte de langues, même sur un site à une',
    '  seule langue. Ne remplace jamais la carte par une chaîne nue.',
    '- Une langue en ligne exige toutes ses traductions ; une langue en',
    '  préparation (`draft`) avertit sans bloquer.',
    '- Un `id` de section est stable : le renommer, c’est perdre l’historique',
    '  d’édition de cette section.',
    '- Le texte est échappé au rendu. Seul un champ `richtext` accepte du',
    '  Markdown, et seulement gras, italique et liens.',
    '- Respecte les bornes déclarées par les schémas : `npx basalte inventory`',
    '  les affiche champ par champ.',
    '',
    '## Toujours finir par',
    '',
    '`npm run check`. Il refuse un champ requis vide, un texte trop long, une',
    'traduction manquante dans une langue en ligne et une image absente.',
  ]
}

function update(): readonly string[] {
  return [
    'Monter ce site de version se fait en une commande, et jamais « parce',
    'qu’il y a une nouvelle version » : pour un correctif de sécurité, une',
    'fonctionnalité demandée, ou à l’occasion d’une intervention.',
    '',
    '## Dans cet ordre',
    '',
    '1. `npm run update -- --dry-run` — affiche la version cible, les notes, et',
    '   les migrations de contenu qui s’appliqueraient. Rien n’est écrit.',
    '2. Relis les notes et traduis-les en français simple pour le mainteneur.',
    '   La ligne « Action requise » vaut `aucune`, `automatique` ou `manuelle`.',
    '3. Si elle vaut `manuelle`, **arrête-toi** et dis ce qui demande une',
    '   décision. Ne lance pas la mise à jour.',
    '4. Sinon, `npm run update`. Si une seule étape échoue, la commande annule',
    '   tout et le dépôt revient à l’état d’avant.',
    '',
    'Rien n’est mis en ligne : `update` prépare le dépôt. C’est la publication',
    'depuis le panel, ou `npm run deploy`, qui remplace le site.',
  ]
}
