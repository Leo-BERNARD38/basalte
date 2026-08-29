# Outillage IA — ce qui reste à construire

Deux chantiers distincts, à traiter pendant et après l'implémentation du socle.

Ce qui était en question ici et se trouve désormais décidé a rejoint les
documents concernés : la discipline de code dans `conventions.md`, la commande
de mise à jour et le format des notes de version dans `mise-a-jour.md`, le
contenu du dépôt client dans `depot-client.md`, les règles de design dans
`design.md`, la mise en ligne dans `mise-en-prod.md`, la couverture de tests
dans `implementation.md`.

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

Le contenu du paquet et le mécanisme de synchronisation sont arrêtés dans
`depot-client.md` : `CLAUDE.md` écrit une fois, `.claude/basalte.md` régénéré à
chaque `npm install` et importé par le premier. Reste à construire en phase 6 :

- le générateur de `.claude/basalte.md` — règles, commandes, inventaire des
  blocs avec leurs champs
- les quatre skills du dépôt client : `nouveau-bloc`, `design`, `contenu`,
  `mettre-a-jour`
- le `CLAUDE.md` initial, rempli depuis les réponses données à `init`

**Reste à cadrer**
- comment un agent découvre le contenu actuel d'un site sans tout lire — piste :
  une sortie compacte de `basalte inventory --content`
- garde-fous : un agent ne doit pas modifier `content/` en production sans
  passer par `basalte check`

---

## Infra et déploiement

- Caddyfile de référence complet : en-têtes de sécurité, cache des assets,
  format de logs exploitable par l'analytics (le squelette est dans
  `deploiement.md`)
- `compose.yml` de référence
- `basalte deploy` et `basalte doctor` — conçus dans `mise-en-prod.md`, à
  écrire en phase 6
- Auto-déploiement : second déclencheur à décider (voir `implementation.md`)
- Procédure de restauration : elle est celle d'une nouvelle installation, à
  exécuter réellement une fois pour la valider

---

## Points ouverts

Voir `implementation.md`.
