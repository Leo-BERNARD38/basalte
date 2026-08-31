# Le dépôt client

Ce que `basalte init` produit, et pourquoi le dépôt reste minuscule.

## Ce qui est généré

```
mon-client/
├── CLAUDE.md              écrit une fois par init, jamais régénéré
├── .claude/
│   ├── basalte.md         GÉNÉRÉ à chaque npm install — ne pas éditer
│   ├── skills/
│   │   ├── nouveau-bloc/  créer un bloc sur mesure pour ce site
│   │   ├── contexte/      interroger, puis écrire docs/CONTEXT.md et DESIGN.md
│   │   ├── nouvelle-page/ ajouter une page au site
│   │   ├── design/        régler les tokens, implémenter une maquette
│   │   ├── contenu/       rédiger et traduire
│   │   └── mettre-a-jour/ monter le socle de version
│   └── commands/          /check · /deploy
├── docs/
│   ├── CONTEXT.md         qui est le client, ce qu'il vend, son ton
│   └── DESIGN.md          ce que la direction artistique cherche, et pourquoi
├── astro.config.mjs       4 lignes
├── site.config.ts         DA, langues, domaine, redirections — versionné
├── .env                   secrets — jamais versionné
├── .env.example
├── content/*.json         index, contact, merci, et les deux documents légaux
├── content/media.json · documents.json · chrome.json · business.json
│                          les manifestes, pas des pages
├── public/media/ · public/documents/
├── public/favicon.svg     à remplacer par le logo du client
├── src/blocks/            les blocs sur mesure de ce site
├── src/chrome/            l'en-tête et le pied de page, s'ils sont redessinés
├── compose.yml
├── Caddyfile
├── Dockerfile
├── docker-entrypoint.sh   npm ci, build du panel, puis le serveur
├── .githooks/pre-commit   npx basalte check
├── .nvmrc · .npmrc · .gitattributes
├── data/                  la base SQLite — jamais versionnée
│                          comptes, sessions, appareils, journal
├── .gitignore             .env, node_modules, dist, data
└── package.json
```

Aucune de ces entrées ne contient de logique du socle.

Écrits d'un seul coup : rien n'est posé sur le disque tant que la liste n'est
pas complète, pour qu'une génération qui échoue ne laisse pas un dossier à
moitié fait.

**Deux pages légales sont générées** — `mentions-legales.json` et
`confidentialite.json` — chacune portant une section de prose pré-remplie d'un
canevas français, marqueurs entre crochets à compléter. Ce n'est pas un conseil
juridique, et le canevas le dit dans sa première phrase. Le client les édite
comme les autres pages : il n'existe pas de source séparée pour les faits de
l'entreprise (D101). La mention de consentement du formulaire est pré-remplie
avec le lien vers `/confidentialite`, le seul que le RGPD attend là.

Le hook de pré-commit est ajouté à l'index en exécutable — le bit ne se pose pas
depuis Windows, et sans lui git ignore le hook sous Linux.

## Cinq commandes

| Commande | Quand |
|---|---|
| `npm run dev` | développer — site et panel en local, sur la même adresse |
| `npm run check` | valider avant de pousser |
| `npm run deploy` | provisionner la machine, ou la mettre à jour (`mise-en-prod.md`) |
| `npm run doctor` | prouver que la configuration fonctionne (`mise-en-prod.md`) |
| `npm run update` | monter le socle de version (`mise-a-jour.md`) |

C'est toute la surface. Un sixième script serait le signe qu'une commande
manque au CLI — à l'exception d'un `postinstall`, qui n'est pas une commande à
retenir : il lance `basalte inventory --agent` et régénère `.claude/basalte.md`
(D89).

`npm run dev` sert le site sur `/` et le panel sur `/admin`, dans un seul
processus. Le panel demande une session comme en production : le premier accès
passe par `basalte admin:login --user <email> --create --origin
http://localhost:4321`, une fois. Sans `--origin`, le lien porte le domaine du
site, qui ne répond pas en local. La commande est nommée dans
`.claude/basalte.md` : un dépôt neuf sert sinon un écran de connexion que rien
n'explique.

## Configuration : deux fichiers, pas un

Le partage se fait sur un seul critère : est-ce un secret ?

**`site.config.ts`** — versionné, lisible par toi et par un agent :

```ts
export default defineSite({
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true } },
  email: { provider: 'brevo' },     // le nom, jamais la clé
  leads: { purgeAfterMonths: 12 },
  capabilities: { documents: true },// ce que ce site fait
  tokens: { /* la DA — voir design.md */ },
})
```

**`capabilities` dit ce que le site fait**, et se lit à l'exécution : rien de
ce qu'`init` a choisi n'est irréversible, une capacité se change en modifiant
une ligne (D98). La liste est fermée comme celle des tokens — un nom inconnu
est refusé au chargement.

| Capacité | Défaut | Effet |
|---|---|---|
| `notifyLeads` | `true` | un message reçu part par email ; à `false` il reste dans le panel |
| `analytics` | `true` | l'écran « Audience », lu dans les journaux de Caddy |
| `documents` | `false` | le téléversement de PDF, et l'écran qui les porte |

## Les profils

`basalte init <nom> --profile <profil>` — un profil est un **jeu de réponses**,
pas une branche : il choisit ce qui est écrit au premier jour, et rien du socle
ne s'exécute différemment selon lui. En ajouter un ne multiplie donc pas ce
qu'il y a à maintenir.

| Profil | Ce qu'il change |
|---|---|
| `vitrine` (défaut) | rien — l'accueil, le formulaire, les deux documents légaux |
| `artisan` | une page « services » de plus, et `documents: true` : un artisan a des devis et des CGV à joindre |

Sans `--profile`, la question est posée comme les trois autres. Tout ce qu'un
profil pose se change ensuite en éditant un fichier — c'est la même règle que
pour les capacités.

**`.env`** — jamais versionné (D26) :

```
EMAIL_API_KEY=…                    la clé du fournisseur
EMAIL_FROM=bonjour@exemple.fr      expéditeur des emails du site
CONTACT_EMAIL=contact@exemple.fr   où arrivent les messages du formulaire
EMAIL_ADMIN=leo@exemple.fr         où partent les erreurs
AUTH_EMAIL_API_KEY=…               le canal des codes de connexion
AUTH_EMAIL_FROM=connexion@exemple.fr
LEAD_WEBHOOK_URL=https://…         l'adresse prévenue à chaque message
```

`CONTACT_EMAIL` est l'adresse du client, `EMAIL_ADMIN` la tienne : les messages
vont à l'un, les pannes de la machine à l'autre. Sans `CONTACT_EMAIL`, un
message reste dans le panel et rien ne part — il n'est jamais perdu, il n'est
simplement pas notifié (`services.md`). `EMAIL_ADMIN` est aussi l'adresse que le
panel affiche au client sous « Besoin d'aide ».

`LEAD_WEBHOOK_URL` est le second canal (D126) : le site y poste le message
entier, en plus de l'email. Elle vaut par sa seule présence — aucune capacité ne
la commande — et un site qui a coupé la notification par email est ainsi
prévenu quand même.

Les deux dernières lignes sont facultatives : sans elles, les codes de
connexion partent par le canal du formulaire de contact, et `doctor` le
signale. Les remplir est ce qui empêche un robot spammant le formulaire
d'épuiser le quota qui sert à se connecter (`panel.md`).

Aucune variable ne porte de secret de session : les jetons sont tirés au
hasard et stockés hachés dans `data/basalte.db`, il n'y a rien à dériver d'une
clé.

`init` écrit ce fichier avec ses lignes vides. Reste **une clé à coller et trois
adresses** pour un site monocanal, deux clés et quatre adresses pour séparer les
canaux : c'est toute la configuration email d'un site. Ce qui se règle hors du
fichier, ce sont les enregistrements DNS qui font arriver ces emails —
`mise-en-prod.md` les nomme, et `doctor` refuse un domaine sans signature. `npm run doctor` dit ce
qui manque, et prouve que ce qui est rempli fonctionne vraiment.

Le domaine vit dans `site.config.ts` et non dans `.env` : il n'est pas secret,
et le build en a besoin pour le sitemap, les `hreflang` et l'Open Graph.

## Le paquet Claude Code

Deux fichiers, avec deux durées de vie opposées.

**`CLAUDE.md`** est écrit une fois par `init` et t'appartient. Il pose les
règles du dépôt et importe le reste. Rien ne le régénère jamais.

**`docs/CONTEXT.md` et `docs/DESIGN.md`** portent le contexte du site : qui est
le client, ce qu'il vend, à qui, comment il parle — et ce que sa direction
artistique cherche, ce qu'elle évite, pourquoi chaque token s'écarte du défaut.
`CLAUDE.md` les importe, donc ils sont chargés à chaque session : un agent qui
ouvre le dépôt sait pour qui il écrit avant d'avoir lu une ligne de contenu.

`init` les écrit en squelette de sections marquées « à compléter », jamais en
page blanche, et la skill `contexte` les remplit par entretien — une question à
la fois, et rien d'inventé : ce qui est écrit là sera relu comme vrai pendant
des mois. Ils sont tenus hors de `CLAUDE.md` parce qu'ils sont longs, révisés
souvent, et d'une autre nature que des règles de dépôt.

**`.claude/basalte.md`** est **régénéré à chaque `npm install`**. Il contient ce
qui vient du socle : les règles absolues, les commandes, et l'inventaire des
blocs disponibles avec leurs champs, produit par `basalte inventory`. Il porte
un en-tête « fichier généré, ne pas modifier ».

Le lien entre les deux est un import, en tête du `CLAUDE.md` :

```md
# Atelier Duvallon

@.claude/basalte.md

## Ce site
…
```

C'est ce qui règle le problème de synchronisation : monter le socle de version
met à jour la doc agent du dépôt client dans le même geste, sans jamais écraser
ce que tu as écrit. Le fichier généré est versionné — son diff dit exactement
ce qu'une montée de version a changé pour ce site.

## Créer le dépôt distant

`init` fait `git init` et le premier commit. Pour le distant :

- si un `GITHUB_TOKEN` est présent, `init --repo Leo-BERNARD38/atelier-duvallon`
  crée le dépôt privé et y pousse la branche
- sinon, `init` affiche les deux commandes à lancer

Ce jeton reste sur ta machine et ne part jamais sur un VPS. La **clé de
déploiement, elle, naît sur la machine** au premier `deploy` : sa moitié privée
n'en sort jamais, et sa moitié publique est enregistrée sur le dépôt quand le
jeton est là, affichée à recopier sinon (D91). Un dépôt créé à la main y a donc
droit au même titre qu'un dépôt créé par `--repo` — voir `securite.md`.
