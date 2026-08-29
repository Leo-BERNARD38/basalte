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
│   │   ├── design/        régler les tokens, implémenter une maquette
│   │   ├── contenu/       rédiger et traduire
│   │   └── mettre-a-jour/ monter le socle de version
│   └── commands/          /check · /deploy
├── astro.config.mjs       4 lignes
├── site.config.ts         DA, langues, domaine — versionné
├── .env                   secrets — jamais versionné
├── .env.example
├── content/*.json
├── public/media/
├── src/blocks/            les blocs sur mesure de ce site
├── compose.yml
├── Caddyfile
├── data/                  la base SQLite — jamais versionnée
├── .gitignore             .env, node_modules, dist, data
└── package.json
```

Aucune de ces entrées ne contient de logique du socle.

*Hypothèse de départ — la phase 6 arrête le contenu exact du paquet Claude Code
et la liste des skills. Ce qui ne bouge pas : aucune logique du socle dans ce
dépôt (invariant 8), et une doc agent régénérée plutôt que recopiée (D27).*

## Cinq commandes

| Commande | Quand |
|---|---|
| `npm run dev` | développer — site et panel en local |
| `npm run check` | valider avant de pousser |
| `npm run deploy` | provisionner la machine, ou la mettre à jour (`mise-en-prod.md`) |
| `npm run doctor` | prouver que la configuration fonctionne (`mise-en-prod.md`) |
| `npm run update` | monter le socle de version (`mise-a-jour.md`) |

C'est toute la surface. Un sixième script serait le signe qu'une commande
manque au CLI.

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
  tokens: { /* la DA — voir design.md */ },
})
```

**`.env`** — jamais versionné (D26) :

```
EMAIL_API_KEY=…                    la clé du fournisseur
EMAIL_FROM=bonjour@exemple.fr      expéditeur des emails du site
EMAIL_ADMIN=leo@exemple.fr         où partent les erreurs
AUTH_EMAIL_API_KEY=…               le canal des codes de connexion
AUTH_EMAIL_FROM=connexion@exemple.fr
```

Les deux dernières lignes sont facultatives : sans elles, les codes de
connexion partent par le canal du formulaire de contact, et `doctor` le
signale. Les remplir est ce qui empêche un robot spammant le formulaire
d'épuiser le quota qui sert à se connecter (`panel.md`).

Aucune variable ne porte de secret de session : les jetons sont tirés au
hasard et stockés hachés dans `data/basalte.db`, il n'y a rien à dériver d'une
clé.

`init` écrit ce fichier avec ses lignes vides. Reste **une clé à coller et deux
adresses** pour un site monocanal, deux clés et trois adresses pour séparer les
canaux : c'est toute la configuration email d'un site. `npm run doctor` dit ce
qui manque, et prouve que ce qui est rempli fonctionne vraiment.

Le domaine vit dans `site.config.ts` et non dans `.env` : il n'est pas secret,
et le build en a besoin pour le sitemap, les `hreflang` et l'Open Graph.

## Le paquet Claude Code

Deux fichiers, avec deux durées de vie opposées.

**`CLAUDE.md`** est écrit une fois par `init` et t'appartient. Il décrit *ce
site* : le client, le ton, la DA, ce qu'il ne faut pas toucher. Rien ne le
régénère jamais.

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
  crée le dépôt privé, pousse, et génère sa clé de déploiement
- sinon, `init` affiche les deux commandes à lancer

Ce jeton reste sur ta machine et ne part jamais sur un VPS. La machine, elle,
ne reçoit qu'une clé de déploiement limitée à son propre dépôt : voir
`securite.md`.
