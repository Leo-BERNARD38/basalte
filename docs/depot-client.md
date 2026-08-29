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
│   └── commands/          /check · /deploy · /nouveau-bloc
├── site.config.ts         DA, langues, domaine — versionné
├── .env                   secrets — jamais versionné
├── .env.example
├── content/*.json
├── public/media/
├── src/blocks/            les blocs sur mesure de ce site
├── compose.yml
├── Caddyfile
└── package.json
```

Aucune de ces entrées ne contient de logique du socle.

## Quatre commandes

| Commande | Quand |
|---|---|
| `npm run dev` | développer — site et panel en local |
| `npm run check` | valider avant de pousser |
| `npm run deploy` | mettre la machine à jour (`mise-en-prod.md`) |
| `npm run update` | monter le socle de version (`mise-a-jour.md`) |

C'est toute la surface. Un cinquième script serait le signe qu'une commande
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

**`.env`** — jamais versionné, quatre lignes :

```
EMAIL_API_KEY=…                    la clé du fournisseur
EMAIL_FROM=bonjour@exemple.fr      expéditeur des emails du site
EMAIL_ADMIN=leo@exemple.fr         où partent les erreurs
SESSION_SECRET=…                   généré par init, à ne jamais toucher
```

`init` génère `SESSION_SECRET` lui-même. Reste **une clé à coller et deux
adresses** : c'est toute la configuration email d'un site.

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
  crée le dépôt privé, pousse, et installe la clé de déploiement
- sinon, `init` affiche les deux commandes à lancer

Une clé de déploiement par dépôt, jamais un jeton de compte : voir
`securite.md`.
