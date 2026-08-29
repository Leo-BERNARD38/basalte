# Architecture

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  VPS du client (un par client, aucun compte partagé)        │
│                                                             │
│   Caddy ──► /srv/site/current ──► HTML statique (public)   │
│     │                                                       │
│     └────► app Node (Astro SSR)                            │
│              ├── /admin/*        panel d'édition           │
│              └── /api/contact    formulaire                │
│                                                             │
│   Dépôt git du client : contenu JSON + médias + config     │
│   SQLite : comptes, sessions, leads, journal               │
└─────────────────────────────────────────────────────────────┘
```

Le site public ne dépend **pas** du panel : couper le processus d'édition
n'interrompt pas le service.

## Répartition socle / dépôt client

```
@leobernard/basalte (ce dépôt)      dépôt client (un par client)
├── intégration Astro               ├── astro.config.mjs      (4 lignes)
├── moteur de rendu de blocs        ├── site.config.ts        DA, langues, domaine
├── DSL de champs + validation      ├── src/blocks/           blocs sur mesure
├── panel d'édition complet         ├── content/*.json        éditable
├── helpers SEO                     ├── public/media/         images
├── endpoint contact + anti-spam    ├── compose.yml
├── CLI (init, check, migrate…)     └── Caddyfile
└── bibliothèque de blocs de base
```

**Règle d'or :** plus un dépôt client contient de code, moins il est
maintenable. Tout copier-coller depuis le socle vers un dépôt client crée une
divergence permanente. Un besoin non couvert se traite en ajoutant un point
d'extension au socle, jamais en le contournant localement.

La DA vit dans `site.config.ts` sous forme de tokens (couleurs, typographies,
échelles d'espacement, rayons) injectés en variables CSS. Le même bloc `hero`
a donc une allure radicalement différente d'un client à l'autre.

## Distribution

Installation dans le dépôt client :

```json
"dependencies": { "@leobernard/basalte": "github:Leo-BERNARD38/basalte#v1.4.0" }
```

Aucun accent circonflexe nulle part. Un tag git étant mutable, le point de
figement réel est le `package-lock.json`, qui enregistre le commit résolu :
**le déploiement utilise `npm ci`, jamais `npm install`.**

Semver appliqué strictement : *patch* sans action côté client, *minor* pour un
ajout rétrocompatible, *major* quand le format de contenu change.

## Mises à jour

```bash
npm install github:Leo-BERNARD38/basalte#v1.5.0
npm run check      # valide tous les contenus contre les schémas, puis build
git commit -am "socle v1.5.0" && git push
```

`check` est le filet : une mise à jour qui casserait un contenu existant échoue
au build, pas en production. Le HTML produit étant déterministe, un diff vide
sur un patch prouve l'absence de régression.

Ordre de déploiement invariable : site de démonstration du socle → client le
moins critique → les autres.

Un site figé sur une version ancienne continue de fonctionner. On ne met à jour
que pour un correctif de sécurité, une fonctionnalité demandée, ou à l'occasion
d'une intervention.

`basalte update-all` itère sur une liste de sites, pour le cas où un correctif
de sécurité du panel doit atteindre tous les VPS rapidement.
