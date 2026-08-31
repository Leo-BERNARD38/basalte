# basalte

Socle technique pour landing pages éditables par leurs propriétaires. Le site
public est statique ; l'édition passe par un panel hébergé à côté.

Ce dépôt est l'outil. Il ne contient aucun site : chaque site client vit dans
son propre dépôt, qui installe celui-ci comme un package npm.

**Tu découvres le projet ?** Ce fichier est le guide complet, dans l'ordre :
prendre en main le socle, publier une version, créer un site, le mettre en
ligne, tenir le compte de son client, le maintenir. Les `docs/` répondent au
*pourquoi* ; ce README répond au *dans quel ordre*.

---

## Ce que c'est

Deux dépôts, deux durées de vie.

|  | Contient | Qui y touche |
|---|---|---|
| **basalte** (ici) | le code : rendu, panel, CLI, blocs de référence | toi |
| **dépôt client** | config, contenu JSON, images, blocs sur mesure | toi, et le client via le panel |

Le dépôt client ne contient **aucun code du socle** (invariant 8). Il en
déclare une version :

```json
"@leobernard/basalte": "github:Leo-BERNARD38/basalte#v1.4.0"
```

C'est un package installé, pas un template copié : un correctif publié ici
atteint tous les sites en changeant un numéro. C'est toute l'architecture —
`docs/architecture.md` la détaille.

Trois acteurs, à ne pas confondre : **toi** (tu produis la DA, les blocs, les
pages), **le client** (il édite textes, images, ordre et visibilité des
sections, via le panel, sans jamais voir de code), **le dépôt client** (le
dépôt git d'un site donné).

## Prérequis

| Pour | Il te faut |
|---|---|
| travailler sur le socle | Node 24 (`.nvmrc`), git |
| créer un site client | les mêmes, plus un compte GitHub |
| mettre un site en ligne | un VPS Ubuntu 2 Go, un domaine, une clé d'API email (Brevo) |

Node 24 exactement : `.npmrc` porte `engine-strict=true`, et `npm ci` refuse de
s'exécuter sous Node 22.

```bash
nvm install 24 && nvm use 24
```

---

## 1. Prendre en main le socle

```bash
git clone git@github.com:Leo-BERNARD38/basalte.git
cd basalte
npm install        # compile dist/ au passage, via le script prepare
npm run setup      # branche les hooks git de .githooks/
npm run verify     # compile, typecheck, construit le site et son panel, teste
```

`npm run verify` doit passer avant tout le reste. Il enchaîne build, typecheck,
`astro check` sur le site de démonstration, build du panel, plus de 780 tests,
formatage et lockfile.

Pour voir le socle à l'œuvre :

```bash
npm run demo:dev
```

Construit `dist/`, crée le compte de démonstration s'il manque, et sert le site
de démonstration **et son panel** sur `localhost:4321`. Sans clé d'email, le
code à six chiffres de connexion s'affiche dans le terminal.

| Adresse | Ce qu'on y voit |
|---|---|
| `localhost:4321` | le site public |
| `localhost:4321/admin` | le panel, tel que le client le voit |
| `localhost:4321/__blocs` | tous les blocs, avec du contenu d'exemple |

Écrire du code ici : lis `docs/conventions.md` d'abord, puis le document du
domaine concerné (`docs/README.md` est l'index).

---

## 2. Publier une version du socle

**À faire avant le premier `init`.** Un dépôt client s'installe par
`github:<compte>/basalte#vX.Y.Z` : **le tag est la publication**, et ce qu'aucun
tag ne désigne n'existe pas pour un client. `basalte init` refuse de commencer
si la version courante n'est pas taguée — il le dit avant d'écrire quoi que ce
soit.

```bash
npm run verify                        # il doit passer
# porter le numéro dans package.json, écrire notes/vX.Y.Z.md
git commit -am "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main --follow-tags
```

Le numéro se choisit sur **ce qu'un site existant a à faire**, pas sur le
travail accompli :

| Rang | Pour un site existant | « Action requise » des notes |
|---|---|---|
| patch | rien — correction, texte, performance | `aucune` |
| mineure | des blocs ou des champs s'ajoutent ; une migration tourne seule | `aucune` ou `automatique` |
| majeure | quelque chose est à toucher à la main dans le dépôt client | `manuelle` |

Chaque version porte ses notes dans `notes/vX.Y.Z.md`, au format fixe — c'est
ce que `npm run update` affiche au client. Format et règles d'écriture :
`docs/mise-a-jour.md`.

> **Le `v` fait partie du tag.** Le socle ne lit que `vX.Y.Z` strict : un tag
> `0.1.0` est ignoré, et la version se lit alors comme jamais publiée. `init`
> reconnaît ce cas et donne les deux commandes qui le réparent.

---

## 3. Créer le site d'un client

Sept étapes, de la commande vide au site complet en local.

### 3.1 Générer le dépôt

Depuis le dossier où tu ranges tes projets :

```bash
npx github:Leo-BERNARD38/basalte init mon-client
```

Trois questions : le nom affiché, le domaine, les langues. Un quatrième choix,
le profil, se passe en option : `--profile artisan` ajoute une page
« services » et active les documents PDF. Un profil n'est qu'un jeu de réponses
— tout ce qu'il pose se change ensuite en éditant un fichier.

La commande écrit une trentaine de fichiers d'un seul coup, installe le socle,
fait le premier commit. Rien n'est posé sur le disque tant que la liste n'est
pas complète.

```bash
cd mon-client
```

Le détail de ce qui a été généré : `docs/depot-client.md`.

### 3.2 Ouvrir le panel en local

```bash
npm run dev
```

Sert le site sur `localhost:4321` et le panel sur `localhost:4321/admin`, dans
un seul processus. Le panel demande une session comme en production : il n'y a
pas encore de compte. Crée-le une fois, dans un second terminal :

```bash
npx basalte admin:login --user toi@exemple.fr --create --origin http://localhost:4321
```

La commande affiche le mot de passe — **une seule fois**, jamais par email — et
un lien de connexion valable dix minutes. Sans `--origin`, le lien porte le
domaine du site : celui de la production, qui ne répond pas en local.

### 3.3 Raconter le client à Claude

Ouvre Claude Code dans le dépôt. Le `CLAUDE.md` généré importe déjà
`.claude/basalte.md` — les règles et l'inventaire des blocs, régénérés à chaque
installation — et les deux fichiers de contexte du site.

```
/contexte
```

La skill mène un entretien, une question à la fois, et remplit `docs/CONTEXT.md`
(qui est le client, ce qu'il vend, à qui, comment il parle) et `docs/DESIGN.md`
(ce que la DA cherche, ce qu'elle évite, pourquoi). Elle n'invente rien : une
section laissée « à compléter » est un trou visible, une section inventée est
un mensonge qui sera relu comme vrai pendant des mois.

Ces deux fichiers sont chargés à chaque session : tout ce que tu feras ensuite
part de là.

### 3.4 Régler la direction artistique

```
/design
```

La DA vit dans les `tokens` de `site.config.ts`, et nulle part ailleurs. La
liste est **fermée** — six familles : `color`, `font`, `text`, `space`,
`radius`, `width` — et un nom que le socle ne porte pas est refusé au
chargement. C'est ce qui rend tenable l'interdiction des valeurs de style en
dur dans un bloc.

Juge le réglage sur `localhost:4321/__blocs` : tous les blocs disponibles y
sont rendus avec du contenu d'exemple, dans les tokens réels du site, entourés
de l'en-tête et du pied de page. La page d'accueil n'en montre que deux ou
trois.

Pour redessiner l'en-tête ou le pied de page, écris `src/chrome/header/` ou
`src/chrome/footer/` dans le dépôt client : le dossier du site remplace celui
du socle, emplacement par emplacement.

### 3.5 Écrire les blocs qui manquent

```
/nouveau-bloc
```

**Cherche avant d'écrire** : `npx basalte inventory` liste les blocs du socle
et leurs champs. Le socle en fournit sept — `hero`, `features`, `gallery`,
`faq`, `richtext`, `download`, `contact`. Une variante locale d'un bloc
existant est un défaut, même quand elle marche.

Un bloc sur mesure vit dans `src/blocks/<nom>/`, en deux fichiers, et rien
d'autre n'est à déclarer nulle part :

- `schema.ts` — les champs par le DSL `f.*`, exportant
  `block({ name, label, help, fields })`. Aucune validation écrite à la main.
- `<Nom>.astro` — le rendu, en PascalCase, sans une valeur de style en dur et
  sans JavaScript.

Le panel affiche le formulaire du bloc sans qu'il y ait rien à y brancher. Un
troisième fichier, `<Nom>.desktop.astro`, porte la mise en page bureau quand le
site déclare `capabilities: { desktopRender: true }`.

**Puis `npx basalte lint`.** Il refuse ce que les conventions interdisent, à
l'endroit fautif : une couleur, un espacement, une taille ou une police écrits
en dur plutôt qu'en token ; un schéma qui valide à la main au lieu de passer
par `f.*` ; un fourre-tout ; une paire de tokens dont le contraste tombe sous
4,5:1. Il tourne aussi en pré-commit, à côté de `check`. C'est ce qui fait
qu'une règle du projet est tenue plutôt que rappelée — et un agent qui écrit un
bloc sait tout de suite s'il a dérivé.

### 3.6 Assembler les pages

```
/nouvelle-page
```

Une page est un fichier `content/<nom>.json`, et son nom donne sa route :
`tarifs.json` sert `/tarifs`. Ni route, ni entrée de menu, ni registre à
éditer — le menu se déduit des pages tant que personne ne l'a rangé.

`init` a déjà posé l'accueil, le contact, la page de remerciement et les deux
documents légaux. Ajoute les onglets du site, puis :

```
/contenu
```

pour rédiger et traduire. Chaque `id` de section est stable et ne se renomme
jamais : c'est lui qui porte l'historique d'édition de la section.

### 3.7 Valider et pousser

```bash
npm run check
```

Refuse un champ requis vide, un texte trop long, une traduction manquante dans
une langue en ligne, une image absente du disque, un format de contenu en
retard. Il tourne aussi en pré-commit.

```bash
git push --set-upstream origin main
```

Si `init` n'a pas créé le dépôt distant, il a affiché les deux commandes à
lancer. Avec un `GITHUB_TOKEN` sur ta machine, `init --repo <compte>/<nom>` le
crée et pousse tout seul.

---

## 4. Mettre le site en ligne

Deux gestes manuels — aucun outil ne peut les faire à ta place — puis une
commande.

### 4.1 Les deux gestes manuels

1. Commander un VPS (Ubuntu, 2 Go de RAM) et noter son IP.
2. Chez le registrar du client : un enregistrement **A** du domaine vers cette
   IP, et les enregistrements qui font arriver ses emails — **DKIM**
   obligatoire, SPF et DMARC recommandés. `docs/mise-en-prod.md` donne le
   tableau ; `npm run doctor` nomme ce qui manque et donne le texte à coller.

### 4.2 Remplir le `.env`

Jamais versionné. Une clé à coller et trois adresses :

```
EMAIL_API_KEY=…                    la clé du fournisseur
EMAIL_FROM=bonjour@exemple.fr      expéditeur des emails du site
CONTACT_EMAIL=contact@exemple.fr   où arrivent les messages du formulaire
EMAIL_ADMIN=toi@exemple.fr         où partent les erreurs de la machine
```

`CONTACT_EMAIL` est l'adresse du client, `EMAIL_ADMIN` la tienne. Trois lignes
facultatives suivent — un canal d'email séparé pour les codes de connexion, et
une adresse web prévenue à chaque message. `docs/depot-client.md` les détaille.

### 4.3 Déployer

```bash
npm run deploy -- --host 51.75.12.34
```

En SSH : installe Docker, engendre la clé de déploiement de la machine, clone
le dépôt, dépose le `.env`, démarre les deux conteneurs (Node et Caddy), attend
qu'une version soit servie, et **crée le compte du client en affichant son mot
de passe**.

Chaque étape est idempotente : la même commande, relancée, met la machine à
jour. Elle ne touche jamais au contenu, qui appartient au panel.

`--dry-run` affiche la séquence, commande par commande, sans qu'une seule
connexion ne parte.

### 4.4 Prouver que ça marche

```bash
npm run doctor
```

`doctor` **prouve** au lieu de vérifier : il envoie un vrai email, appelle
vraiment l'adresse de notification, résout vraiment le DNS. Une clé présente
mais fausse passe un contrôle de forme, et se découvre le jour où le client ne
peut plus se connecter.

Il tourne là où on l'appelle : depuis ta machine il éprouve la configuration du
dépôt, sur le VPS il éprouve aussi les siennes. `--host <ip>` lui donne
l'adresse que le domaine doit désigner.

### 4.5 Remettre le site au client

Transmets-lui l'adresse `/admin` et le mot de passe affiché par `deploy` — **de
vive voix ou par un canal autre que l'email**, qui porte déjà le second facteur
(invariant 12). Il se connecte, un code à six chiffres arrive dans sa boîte, et
il édite.

---

## 5. Le compte du client

Tu n'as **jamais de mot de passe à choisir, à hacher ni à ranger quelque part**.
Le socle s'en charge, et rien de ce qui est lisible n'est conservé.

### Ce qui se passe vraiment

À la création du compte, le socle **tire un mot de passe au hasard** — quatre
groupes de cinq caractères, dans un alphabet sans les signes qu'on confond en
les dictant (ni `O` ni `0`, ni `l` ni `1`) — puis le hache en **Argon2id** aux
paramètres de l'OWASP, et n'écrit que l'empreinte dans `data/basalte.db`.

Le mot de passe en clair n'existe qu'une fois, dans le terminal, le temps que
tu le lises. Il n'est ni en base, ni dans le `.env`, ni dans un fichier de la
machine, ni dans un email. **Il ne peut donc pas fuiter d'un serveur volé** —
il n'y est pas.

Il est tiré et jamais choisi, ce qui le rend non réutilisé : un mot de passe
récupéré dans une fuite ailleurs ne vaut rien ici. Et le mot de passe seul ne
suffit pas — la connexion demande ensuite un **code à six chiffres** envoyé par
email, puis reconnaît l'appareil pour ne plus le redemander.

### Les quatre moments

| Quand | Le geste | Où |
|---|---|---|
| première mise en ligne | rien à faire — `deploy` crée le compte et affiche le mot de passe | ta machine |
| le client veut le changer | il le fait seul, écran « Compte » du panel | son navigateur |
| il l'a oublié | `npx basalte admin:login --user <email> --reset` | en SSH sur la machine |
| sa boîte email est en panne | `npx basalte admin:login --user <email>` — un lien qui ouvre une session, dix minutes, à usage unique | en SSH sur la machine |

Un second compte, pour un associé ou pour toi :

```bash
npx basalte admin:login --user autre@client.fr --create
```

### Réinitialiser un mot de passe oublié

Le panel ne change un mot de passe qu'en demandant l'actuel — ce dont un client
qui l'a perdu est justement incapable. La console le repose sans le demander :

```bash
ssh root@51.75.12.34
cd /srv/mon-client
docker compose exec -T app npx basalte admin:login --user contact@client.fr --reset
```

```
  ✓ mot de passe reposé pour « contact@client.fr »
  ✓ 2 session(s) fermée(s), 1 appareil(s) oublié(s)

  Mot de passe : Kf7dm-2mQxr-vRd9p-Lpqt

  Il ne s'affichera plus. Note-le, ou transmets-le de vive voix —
  jamais par email, qui porte déjà le second facteur.
```

Une réinitialisation dit que l'accès est à rétablir : elle **coupe les sessions
ouvertes et oublie les appareils reconnus**, pour que rien ne continue de
porter l'ancien accès. Le client se reconnecte avec le nouveau mot de passe et
un code par email, puis le change depuis le panel s'il le souhaite.

Elle laisse une ligne dans le journal du compte, que le client voit sur son
écran « Compte » : c'est sa preuve que le changement vient de toi et non de
quelqu'un d'autre.

### Ce que tu ne dois jamais faire

- **Envoyer un mot de passe par email.** L'email porte déjà le second facteur :
  y mettre le premier réunit les deux dans la même boîte, et un accès à cette
  boîte devient un accès au site. C'est l'invariant 12.
- **Le noter dans le dépôt, le `.env`, ou un gestionnaire partagé avec le
  client.** Il est à usage unique dans les faits : le client le change, ou ne
  le change pas, mais toi tu n'en as plus besoin — `--reset` en repose un.
- **Réutiliser le même mot de passe entre deux clients.** La question ne se
  pose pas : tu ne les choisis pas.

---

## 6. Corriger le socle, et propager

C'est la boucle de tous les jours. Un défaut du panel, un bloc à enrichir, une
contrainte à ajouter à `f.*` :

```bash
# 1. dans ce dépôt
git checkout -b une-branche
# … le code, avec Claude
npm run verify

# 2. publier
# porter le numéro dans package.json, écrire notes/vX.Y.Z.md
git commit -am "release: vX.Y.Z"
git tag vX.Y.Z && git push origin main --follow-tags

# 3. dans chaque dépôt client
npm run update
npm run deploy -- --host <ip>
```

Rien n'atteint un site tant que son dépôt n'a pas monté sa version. Un site
figé sur une version ancienne continue de fonctionner : on monte de version
pour un correctif de sécurité, une fonctionnalité demandée, ou à l'occasion
d'une intervention. Jamais « parce qu'il y a une nouvelle version ».

Ordre de déploiement, invariable : le site de démonstration du socle, puis le
client le moins critique, puis les autres.

Pour un correctif de sécurité qui doit atteindre tous les VPS vite :

```bash
basalte update-all sites.txt
```

La commande s'arrête au premier site en échec au lieu de continuer.

---

## 7. Mettre à jour un site client

Depuis le dépôt du client :

```bash
npm run update -- --dry-run   # la version cible, les notes, ce qui changerait
npm run update                # pour de vrai
```

Elle lit la dernière version publiée, affiche les notes de chaque version
traversée, épingle la nouvelle, installe, applique les migrations de contenu,
valide, construit, et commit.

**Si une seule étape échoue, tout est annulé** et le dépôt revient à l'état
d'avant. C'est pour cela qu'elle exige un arbre de travail propre au départ :
sur un dépôt qui porte déjà des modifications, l'annulation effacerait un
travail qu'elle n'a pas écrit.

`update` prépare le dépôt ; il ne met rien en ligne. C'est `npm run deploy` qui
remplace le site.

Assisté par Claude, dans le dépôt client :

```
/mettre-a-jour
```

La skill lance le `--dry-run`, traduit les notes en français simple, signale ce
qui demande une décision, puis lance la mise à jour ou s'arrête en expliquant
pourquoi.

### Revenir en arrière

| Ce qui a cassé | Le geste |
|---|---|
| un contenu | `git revert`, ou la version précédente depuis le panel |
| un build | rien à faire — le site en place n'a pas bougé |
| une montée de version du socle | repointer la version dans `package.json`, puis `npm run deploy` |
| la machine entière | `git clone` + `deploy` sur un VPS neuf + restauration du SQLite |

---

## Aide-mémoire

**Dans ce dépôt :**

| Commande | Effet |
|---|---|
| `npm run verify` | tout : build, typecheck, site, panel, tests, format, lockfile |
| `npm run demo:dev` | le site de démonstration et son panel, sur `localhost:4321` |
| `npm run test:watch` | Vitest en continu |
| `npm run format` | applique Prettier |

**Dans un dépôt client :**

| Commande | Effet |
|---|---|
| `npm run dev` | le site et le panel en local, sur la même adresse |
| `npm run check` | valide les contenus contre les schémas |
| `npx basalte lint` | vérifie les conventions du code que Claude écrit |
| `npm run deploy -- --host <ip>` | provisionne la machine, ou la met à jour |
| `npm run doctor` | prouve que la configuration fonctionne |
| `npm run update` | monte le socle de version, ou annule tout |
| `npx basalte admin:login --user <email> [--create\|--reset] [--origin <url>]` | connexion de secours, création du compte, mot de passe reposé |
| `npx basalte inventory` | les blocs disponibles et leurs champs |

**Le CLI complet :**

| Commande | Effet |
|---|---|
| `basalte init <nom> [--profile <nom>]` | génère un dépôt client complet |
| `basalte check [--build]` | valide les contenus, et construit sous `--build` |
| `basalte lint` | vérifie les conventions du code : blocs, styles, schémas |
| `basalte inventory [--json\|--agent]` | liste blocs et champs, ou régénère la doc agent |
| `basalte update [--dry-run] [--json]` | monte un site de version, ou annule tout |
| `basalte deploy --host <ip> [--dry-run]` | provisionne le VPS, ou le met à jour |
| `basalte doctor [--host <ip>] [--no-email]` | prouve que la configuration fonctionne |
| `basalte migrate [--dry-run]` | applique les migrations de format |
| `basalte admin:login --user <email> [--create\|--reset] [--origin <url>]` | lien de secours, création du compte, mot de passe reposé |
| `basalte update-all <liste>` | monte de version une liste de sites |

## Quand ça coince

| Le symptôme | La cause, et le geste |
|---|---|
| `init` refuse : « pas de version publiée » | la version de `package.json` n'est pas taguée — voir §2. `--no-install` écrit le dépôt sans l'installer |
| `init` refuse : « un tag sans le `v` » | `git tag vX.Y.Z X.Y.Z && git push origin vX.Y.Z` |
| `npm ci` refuse de s'exécuter | Node n'est pas en 24 — `nvm use 24` |
| le panel demande une session et tu n'as pas de compte | `npx basalte admin:login --user <email> --create` |
| le client a oublié son mot de passe | `npx basalte admin:login --user <email> --reset`, en SSH — voir §5 |
| la boîte email du client est en panne, il ne reçoit plus ses codes | `npx basalte admin:login --user <email>` — le lien ouvre une session sans code |
| le lien de connexion pointe vers le domaine, pas vers localhost | ajoute `--origin http://localhost:4321` |
| `update` refuse de commencer | l'arbre de travail n'est pas propre — commite ou remise d'abord |
| `check` échoue sur un `$format` | le format de contenu est en retard : `npx basalte migrate` |
| `lint` refuse une valeur de style | c'est un token à employer, ou à ajouter au socle — jamais une valeur en dur |
| un bloc s'affiche sans son CSS | il est importé depuis un module purement virtuel — voir D45 |
| `doctor` refuse le domaine | DKIM n'est pas publié : c'est la signature qui authentifie, pas SPF |
| le client ne reçoit plus ses codes | sépare les canaux : `AUTH_EMAIL_API_KEY` et `AUTH_EMAIL_FROM` |

## Les règles qu'on n'enfreint pas

Douze invariants portent la sécurité et les performances. Les enfreindre donne
un projet qui fonctionne et une garantie détruite — c'est ce qui les rend
dangereuses. Ils sont listés dans `CLAUDE.md` et justifiés dans
`docs/securite.md`. Les quatre qu'on croise le plus vite :

1. Jamais de HTML libre dans le contenu — Markdown restreint, assaini au build.
2. Le site public n'embarque aucun JavaScript par défaut.
3. Un bloc = un dossier, deux fichiers ; aucun registre central à éditer.
4. Aucun code du socle copié dans un dépôt client.

## Où lire quoi

`docs/README.md` est l'index. En résumé :

| Tu travailles sur… | Lis |
|---|---|
| comprendre le projet en cinq minutes | `docs/contexte.md` puis `docs/architecture.md` |
| n'importe quoi dans ce dépôt | `docs/conventions.md` |
| l'outillage, les versions, la CI | `docs/environnement.md` |
| un bloc, un schéma, du contenu | `docs/modele-contenu.md` |
| le panel, l'auth, les médias | `docs/panel.md` + `docs/securite.md` |
| le build, la mise en ligne | `docs/publication.md` |
| une montée de version | `docs/mise-a-jour.md` |
| ce que contient un dépôt client | `docs/depot-client.md` |
| les tokens, une maquette à implémenter | `docs/design.md` |
| le référencement, le cadrage des images | `docs/seo-performances.md` |
| la mise en ligne d'un site | `docs/mise-en-prod.md` |
| email, contact, analytics | `docs/services.md` |
| Docker, Caddy, sauvegardes | `docs/deploiement.md` |
| comprendre un choix passé | `docs/decisions.md` |
| ce qui a été laissé de côté | `docs/roadmap.md` |

## Statut

Les onze phases d'implémentation sont faites : rendu, authentification, panel,
mise en ligne, formulaire de contact, livraison, outillage, double rendu,
chrome, cadrage des images et SEO, notification des messages. Un site se crée,
se met en production et se monte de version en une commande chacune.

Ce qui a été identifié et volontairement laissé de côté est listé dans
`docs/roadmap.md`, avec ce qui le ferait revenir. Les chantiers d'outillage IA
restants sont dans `docs/roadmap-outillage-ia.md`.
