# Outillage IA — noté, non développé

Deux chantiers distincts, à traiter après l'implémentation du socle.
Rien ici n'est décidé : c'est un inventaire.

---

## Chantier A — Le socle développé par Claude Code

Objectif : que ce dépôt soit un environnement où un agent code juste, vérifie
son travail seul, et ne casse pas les invariants.

**Contexte**
- `CLAUDE.md` racine — fait, à maintenir à chaque évolution de la stack
- Convention de commit et procédure de release (tag, semver, changelog)
- Session-start hook pour Claude Code sur le web (install, build, checks prêts)

**Skills**
- créer un bloc (schéma + composant + entrée dans la démo)
- ajouter un champ à un bloc existant, avec migration si le format change
- écrire une migration de format de contenu
- audit sécurité du panel avant release

**Commandes**
- `/nouveau-bloc <nom>`
- `/check` — enveloppe de `basalte check` avec sortie lisible par un agent
- `/release <version>` — vérifs, tag, notes de version

**Agents**
- revue de schéma : cohérence entre `schema.ts` et le composant `.astro`
- revue sécurité : les 11 règles absolues du CLAUDE.md

**Vérifiabilité**
- Le critère : un agent doit pouvoir savoir seul s'il a cassé quelque chose.
- Pistes : `basalte check` sur le site de démo, diff du HTML généré avant/après,
  tests du DSL de champs, tests du flux d'authentification.
- À trancher : jusqu'où va la couverture de tests, et sur quoi précisément.

---

## Chantier B — Package IA embarqué dans les dépôts clients

Objectif : qu'un agent puisse produire une landing complète dans un dépôt
client, puis la maintenir, sans relire le socle.

**Généré par `basalte init`**
- `CLAUDE.md` du dépôt client : DA du site, langues, blocs disponibles,
  commandes, ce qu'il ne faut pas toucher
- inventaire des blocs disponibles, **généré depuis les schémas** plutôt
  qu'écrit à la main
- skills du dépôt client : créer un bloc sur mesure, régler les tokens de DA,
  rédiger et traduire le contenu, mettre à jour le socle

**Le point dur : la synchronisation des versions**

Un `CLAUDE.md` généré une fois à l'init devient faux dès que le socle évolue.
Piste à évaluer : le socle expose sa doc agent depuis le package
(`node_modules/@leobernard/basalte/AGENTS.md` + inventaire des blocs généré), et le
`CLAUDE.md` du dépôt client s'y réfère au lieu de la dupliquer. Mettre à jour
le socle mettrait alors à jour la doc automatiquement.
À vérifier : est-ce qu'un agent lit correctement une doc située dans
`node_modules`, ou faut-il la recopier au `postinstall` ?

**Reste à cadrer**
- comment un agent découvre le contenu actuel d'un site sans tout lire
- garde-fous : un agent ne doit pas modifier `content/` en production sans
  passer par `basalte check`

---

## Infra et déploiement

- Reverse proxy : exemples de configuration complets, avec en-têtes de sécurité
  (CSP, HSTS, X-Frame-Options), cache des assets, logs pour l'analytics
- `compose.yml` de référence
- Script de provisionnement d'un nouveau VPS
- Auto-déploiement : déclencheur à définir — le panel pousse et déploie
  lui-même, ou un webhook, ou une action manuelle
- Procédure de restauration, à tester réellement une fois

---

## Points ouverts

Voir `implementation.md`.
