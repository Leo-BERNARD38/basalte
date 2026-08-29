# Outillage IA — ce qui reste à construire

Deux chantiers distincts, à traiter pendant et après l'implémentation du socle.

Ce qui était en question ici et se trouve désormais décidé a rejoint les
documents concernés : la discipline de code dans `conventions.md`, la commande
de mise à jour et le format des notes de version dans `mise-a-jour.md`, la
couverture de tests dans `implementation.md`.

---

## Chantier A — Le socle développé par Claude Code

Objectif : que ce dépôt soit un environnement où un agent code juste, vérifie
son travail seul, et ne casse pas les invariants.

**Contexte**
- `CLAUDE.md` racine — fait, à maintenir à chaque évolution de la stack
- `docs/conventions.md` — fait
- Convention de commit et procédure de release (tag, semver, notes de version)
- Session-start hook pour Claude Code sur le web (install, build, checks prêts)

**Skills**
- créer un bloc (schéma + composant + entrée dans la démo)
- ajouter un champ à un bloc existant, avec migration si le format change
- écrire une migration de format de contenu
- audit sécurité du panel avant release

**Commandes**
- `/nouveau-bloc <nom>`
- `/check` — enveloppe de `basalte check` avec sortie lisible par un agent
- `/release <version>` — vérifs, tag, notes de version au format figé

**Agents**
- **revue de réutilisation** : cette diff réécrit-elle quelque chose qui existe
  déjà ? C'est le plus rentable des quatre — la duplication discrète est le
  défaut le plus coûteux d'un agent
- revue de schéma : cohérence entre `schema.ts` et le composant `.astro`
- revue sécurité : les règles absolues du `CLAUDE.md`

**Vérifiabilité**

Le critère : un agent doit pouvoir savoir seul s'il a cassé quelque chose. Les
moyens sont arrêtés dans `implementation.md` — tests sur l'auth et le DSL,
`basalte check` sur le site de démonstration, diff du HTML généré.

Reste à outiller : rendre le diff HTML avant/après exécutable en une commande.

---

## Chantier B — Package IA embarqué dans les dépôts clients

Objectif : qu'un agent puisse produire une landing complète dans un dépôt
client, puis la maintenir, sans relire le socle.

**Généré par `basalte init`**
- `CLAUDE.md` du dépôt client : DA du site, langues, blocs disponibles,
  commandes, ce qu'il ne faut pas toucher
- inventaire des blocs disponibles, **généré depuis les schémas** par
  `basalte inventory`, jamais écrit à la main
- skills du dépôt client : créer un bloc sur mesure, régler les tokens de DA,
  rédiger et traduire le contenu, et `mettre-a-jour` (voir `mise-a-jour.md`)

**Le point dur : la synchronisation des versions**

Un `CLAUDE.md` généré une fois à l'init devient faux dès que le socle évolue.
Piste à évaluer : le socle expose sa doc agent depuis le package
(`node_modules/@leobernard/basalte/AGENTS.md` + inventaire généré), et le
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

- Caddyfile de référence complet : en-têtes de sécurité, cache des assets,
  format de logs exploitable par l'analytics (le squelette est dans
  `deploiement.md`)
- `compose.yml` de référence
- Script de provisionnement d'un nouveau VPS, clé de déploiement comprise
- Auto-déploiement : second déclencheur à décider (voir `implementation.md`)
- Procédure de restauration, à tester réellement une fois

---

## Points ouverts

Voir `implementation.md`.
