// Les skills et les commandes déposées dans `.claude/` d’un dépôt client.
//
// Elles ne décrivent jamais le socle — c’est le rôle de `.claude/basalte.md`,
// régénéré. Elles décrivent des gestes : créer un bloc, régler la DA, rédiger,
// monter de version. Écrites une fois par `init`, elles appartiennent ensuite
// au dépôt et peuvent y être adaptées.

import path from 'node:path'

import { AGENT_DIR, CONTEXT_DOC, DESIGN_DOC } from './agent.js'
import type { GeneratedFile } from './files.js'

export function agentSkills(): readonly GeneratedFile[] {
  return [
    skill('nouveau-bloc', 'Créer un bloc sur mesure pour ce site.', block()),
    skill(
      'contexte',
      'Interroger le mainteneur et écrire le contexte du site.',
      context(),
    ),
    skill(
      'nouvelle-page',
      'Ajouter une page au site, avec sa route et son contenu.',
      newPage(),
    ),
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
    'd’autre n’est à déclarer nulle part (invariant 7). Un troisième, facultatif,',
    'porte sa mise en page bureau.',
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
    '',
    '## La variante bureau, si ce site en a une',
    '',
    'Quand `site.config.ts` déclare `desktopRender`, un bloc peut porter un',
    '`<Nom>.desktop.astro` à côté de son composant. Il reçoit exactement les',
    'mêmes props, se découvre par son nom, et n’a besoin d’aucune media query :',
    'il n’est servi qu’au bureau. Sans lui, le composant sert les deux supports.',
    '',
    '`<Nom>.astro` **est** le rendu mobile. La variante bureau ne peut donc rien',
    'montrer qu’il ne montre pas — pas un mot, pas un lien, pas une métadonnée :',
    'Google indexe au robot smartphone, et ce qui n’est qu’au bureau n’est jamais',
    'vu. `npm run check -- --build` compare les deux et nomme l’écart.',
    '',
    'Écris une variante quand la mise en page change vraiment — l’ordre, la',
    'hiérarchie, ce qui porte l’attention. Tant que le bureau n’est que le',
    'mobile à qui on a donné de la place, une media query suffit.',
  ]
}

// Le contexte est écrit par entretien parce qu’il n’est déductible de rien :
// ni le code ni le contenu ne disent pour qui le site est fait. Une réponse
// inventée serait relue comme vraie à chaque session suivante.
function context(): readonly string[] {
  return [
    `Deux fichiers portent le contexte de ce site : \`${CONTEXT_DOC}\` dit qui`,
    `est le client et comment il parle, \`${DESIGN_DOC}\` dit ce que sa`,
    'direction artistique cherche. Les deux sont chargés à chaque session.',
    '',
    '## La règle',
    '',
    'N’écris que ce qui t’a été dit. Une section laissée « à compléter » est un',
    'trou visible ; une section inventée est un mensonge qui sera relu comme',
    'vrai pendant des mois. Dans le doute, laisse le trou et dis-le.',
    '',
    '## Comment mener l’entretien',
    '',
    '1. Lis les deux fichiers : les sections déjà remplies ne se redemandent',
    '   pas.',
    '2. Pose **une question à la fois**, et propose des réponses quand tu peux',
    '   — il est plus facile de corriger une proposition que de partir de rien.',
    '3. Sur le ton, demande un exemple de phrase que le client aurait écrite,',
    '   puis une phrase qu’il n’écrirait jamais. C’est ce qui se transmet.',
    '4. Sur la DA, demande deux ou trois références et ce qu’on leur prend —',
    '   pas ce qu’on aime.',
    '5. Écris au fur et à mesure, dans les sections existantes. N’en ajoute une',
    '   que si une réponse ne rentre nulle part.',
    '',
    '## Ensuite',
    '',
    'Les valeurs de la DA ne vont pas dans la prose : elles vont dans les',
    `\`tokens\` de \`site.config.ts\`. \`${DESIGN_DOC}\` dit *pourquoi* elles sont`,
    'ce qu’elles sont — voir la skill « design ».',
  ]
}

// D3 borne le client, pas le mainteneur : le client n’ajoute pas de page, toi
// si. Une page est un fichier de `content/`, et son nom fait sa route.
function newPage(): readonly string[] {
  return [
    'Une page de ce site est un fichier `content/<nom>.json`, et son nom donne',
    'sa route : `tarifs.json` sert `/tarifs`. Il n’y a rien d’autre à',
    'déclarer — ni route, ni entrée de menu, ni registre.',
    '',
    'Le client, lui, ne crée pas de pages (D3). Cette skill est pour toi.',
    '',
    '## Le nom',
    '',
    'En minuscules, chiffres et tirets. C’est une adresse : elle se lit, elle',
    'se dicte au téléphone, et elle ne se renomme pas sans casser des liens.',
    '',
    '## Le fichier',
    '',
    '1. Ouvre une page existante et relève son `$format` : c’est le même pour',
    '   toutes, et l’inventer ferait échouer `npm run check`.',
    '2. Écris `meta.title` et `meta.description` dans **chaque** langue',
    '   déclarée, même vides pour une langue en préparation.',
    '3. Ajoute les sections. Chaque `id` est stable et ne se renomme jamais :',
    '   c’est lui qui porte l’historique d’édition de la section.',
    '4. `npx basalte inventory` liste les blocs disponibles et leurs bornes.',
    '   Emploie un bloc existant avant d’en écrire un — voir « nouveau-bloc ».',
    '',
    '## Toujours finir par',
    '',
    '`npm run check`, puis relie la page depuis une autre : une page qu’aucun',
    'lien n’atteint n’existe pour personne. Le menu du site s’édite au panel,',
    'sous « En-tête et pied de page » — `check` avertit d’un lien qui ne mène',
    'à aucune page.',
  ]
}

function design(): readonly string[] {
  return [
    'La direction artistique de ce site vit dans les `tokens` de',
    '`site.config.ts`, et nulle part ailleurs. Le CSS d’un bloc ne se modifie',
    'pas pour changer une couleur.',
    '',
    `L’intention derrière ces valeurs — ce qu’on cherche, ce qu’on évite, les`,
    `références — vit dans \`${DESIGN_DOC}\`. Une valeur qui change s’y note`,
    'avec sa raison.',
    '',
    '## Voir tous les blocs d’un coup',
    '',
    'Sous `npm run dev`, l’adresse `/__blocs` rend chaque bloc disponible avec',
    'du contenu d’exemple, dans les tokens réels du site. C’est là qu’un',
    'réglage se juge : la page d’accueil n’en montre que deux ou trois. Un bloc',
    'qui porte une variante bureau y figure deux fois, étiqueté. L’en-tête et',
    'le pied de page l’entourent, comme sur une vraie page.',
    '',
    '## Redessiner l’en-tête ou le pied de page',
    '',
    'Le socle en fournit un. Pour le remplacer, écris `src/chrome/header/` ou',
    '`src/chrome/footer/` dans ce dépôt — un `schema.ts` et le composant du',
    'même nom, plus sa variante `.desktop.astro` si le site sert deux rendus.',
    'Le dossier du site remplace celui du socle, emplacement par emplacement :',
    'redessiner l’en-tête laisse le pied de page du socle en place.',
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
