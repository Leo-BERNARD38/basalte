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
n'interrompt pas le service. Le formulaire de contact, lui, passe par ce
processus — couper l'édition coupe aussi le formulaire, et pas les visites.

## Répartition socle / dépôt client

```
@leobernard/basalte (ce dépôt)      dépôt client (un par client)
├── intégration Astro               ├── astro.config.mjs      (4 lignes)
├── moteur de rendu de blocs        ├── site.config.ts        DA, langues, domaine
├── DSL de champs + validation      ├── src/blocks/           blocs sur mesure
├── panel d'édition complet         ├── content/*.json        éditable
├── helpers SEO                     ├── public/media/         images
├── endpoint contact + anti-spam    ├── CLAUDE.md + .claude/  paquet agent
├── CLI (init, check, deploy…)      ├── compose.yml
└── blocs de référence              └── Caddyfile
```

**Règle d'or :** plus un dépôt client contient de code, moins il est
maintenable. Tout copier-coller depuis le socle vers un dépôt client crée une
divergence permanente. Un besoin non couvert se traite en ajoutant un point
d'extension au socle, jamais en le contournant localement.

La DA vit dans `site.config.ts` sous forme de tokens (couleurs, typographies,
échelles d'espacement, rayons) injectés en variables CSS. Le même bloc `hero`
a donc une allure radicalement différente d'un client à l'autre.

## Package, pas template

Deux façons de réutiliser du code, et une seule convient.

**Un template de dépôt, on le copie.** GitHub duplique les fichiers dans un
nouveau dépôt, puis chaque copie vit sa vie. Un correctif publié ici n'atteint
aucune des copies : il faut le reporter à la main, autant de fois qu'il y a de
clients, en espérant ne rien oublier.

**Un package, on l'installe.** Le code reste ici. Le dépôt client en déclare
une version, et le code arrive dans `node_modules/` au `npm install` :

```json
"@leobernard/basalte": "github:Leo-BERNARD38/basalte#v1.4.0"
```

Un correctif publié ici atteint un site en changeant un numéro.

**Le dépôt client, lui, est fabriqué par une commande**, pas par un bouton
GitHub : `basalte init` écrit les fichiers de départ, dont aucun ne contient de
logique — config, contenu, blocs sur mesure, et le paquet Claude Code du site.
Le détail est dans `depot-client.md`.

C'est toute la différence : un template laisse deux cents fichiers à maintenir
par client, `init` en laisse une dizaine.

## Distribution

Le socle est un **dépôt public**. Aucun identifiant à distribuer sur les VPS,
et `npm ci` fonctionne partout sans configuration. La sécurité du projet tient
à son architecture, jamais à la discrétion de son code.

Un tag git étant mutable, le point de figement réel est le `package-lock.json`,
qui enregistre le commit résolu : **le déploiement utilise `npm ci`, jamais
`npm install`.** Aucun accent circonflexe nulle part.

Installer depuis git installe du TypeScript non compilé : le package porte un
script `prepare` qui le compile à l'installation. À traiter dès l'étape 1, sans
quoi la surprise arrive à l'étape 11.

Semver appliqué strictement : *patch* sans action côté client, *minor* pour un
ajout rétrocompatible, *major* quand le format de contenu change.

## Accès git des VPS

Le panel commit et pousse : chaque VPS peut donc écrire dans le dépôt de son
site.

- une **clé de déploiement par dépôt client**, jamais un jeton de ton compte —
  une machine compromise n'ouvre que le dépôt de son propre site
- **protection de branche** sur les dépôts clients comme sur le socle : sans
  elle, un intrus dans le panel réécrit l'historique et détruit le `git revert`
  qui est ton retour arrière

## Mises à jour

Une commande, depuis le dépôt du client :

```bash
npm run update
```

Elle installe, migre, valide, construit et commit — ou annule tout. Le détail,
le format des notes de version et la mise à jour assistée sont dans
`mise-a-jour.md`.

`check` est le filet : une mise à jour qui casserait un contenu existant échoue
avant le déploiement, pas en production. Le HTML produit étant déterministe, un
diff vide sur un patch prouve l'absence de régression.

Un site figé sur une version ancienne continue de fonctionner. On ne met à jour
que pour un correctif de sécurité, une fonctionnalité demandée, ou à
l'occasion d'une intervention.
