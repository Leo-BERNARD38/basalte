# Panel d'édition

## Structure technique

Le panel est **une island React unique** montée en `client:only="react"`.

Astro ne partage pas de contexte React entre islands séparées ; un arbre unique
supprime le problème, et `client:only` évite tout souci d'hydratation. Le panel
n'a besoin ni de SEO ni de rendu serveur, puisqu'il est derrière une
authentification.

Il n'ajoute **aucune dépendance** (D57, D175) : dnd-kit pour le
réordonnancement, et rien d'autre. Ses composants sont écrits dans le dépôt,
dans le langage de Material Design 3 (D194).

### Deux modes, deux durées de vie

Le même projet Astro produit le site et le panel, selon le mode (D55) :

| Commande | Ce qui sort | Quand |
|---|---|---|
| `astro dev` | le site *et* le panel | développement |
| `astro build` | le site public, statique | à chaque mise en ligne |
| `BASALTE_MODE=panel astro build` | le panel, sortie serveur, adaptateur Node | à un déploiement |

C'est ce qui évite qu'un processus se reconstruise lui-même : le panel n'est
rebâti qu'au déploiement, tandis que le site l'est à chaque publication.

En mode panel, une erreur de contenu **n'arrête pas** la construction : c'est le
panel qui sert à la corriger.

### Le moteur de formulaires

Le navigateur reçoit la **description des champs**, jamais une liste d'écrans
écrite à la main. Une table unique fait correspondre un `kind` du DSL à un
composant (D59) : ajouter un type à `f.*` demande un composant et une ligne,
jamais une retouche des écrans.

L'état d'édition est le document entier, recomposé de bas en haut — chaque
champ rend une nouvelle valeur à son parent (D58). Il n'y a donc pas de
validation dans le panel : les contraintes viennent des descripteurs (`max`
devient un `maxLength`), et le verdict vient du serveur.

Les schémas arrivent embarqués dans le module généré au démarrage plutôt que
reparcourus à chaque requête (D56) — une fois le serveur groupé,
`import.meta.url` ne désigne plus le dossier des blocs du socle.

## Structure de l'interface

Le panel aura beaucoup de fonctions. Elles ne doivent jamais être visibles en
même temps.

**Six pages au plus, et deux d'entre elles n'existent que si le site les
déclare.** L'hypothèse de départ en comptait six ; « Réglages » a été supprimée
(D63) : langues et informations du site vivent dans `site.config.ts`, versionné,
que le client n'édite pas. « Actualités » a pris sa place, et pour la raison
inverse (D154) : ce n'était pas un écran vide.

| Page | Contenu |
|---|---|
| Édition | l'aperçu de la page, ses sections, et le panneau de la section choisie — l'écran par défaut |
| Actualités | les billets du journal, leur formulaire et leur aperçu — seulement si le site déclare un `journal` |
| Médias | la médiathèque |
| Messages | les leads du formulaire de contact |
| Statistiques | le rapport d'audience — seulement si le site déclare `analytics` |
| Compte | apparence, mot de passe, appareils, journal de connexion — derrière l'avatar, pas dans le rail (D204) |

Ce que le socle a gagné depuis n'en a ajouté aucune : l'en-tête, le pied de page
et la fiche d'entreprise s'éditent depuis « Édition », comme des entrées de plus
dans la liste des pages. C'est là que les deux premiers se règlent bien,
puisque c'est là qu'on les voit ; et la troisième n'a pas de quoi remplir un
écran à elle seule.

**« Actualités » ne ressemble pas à « Édition », et c'est le fond de la
chose.** Un billet n'a ni sections à choisir, ni ordre à régler : on ouvre, on
écrit, on enregistre. La liste tient les billets par date décroissante — le
client vient y chercher ce qu'il a écrit hier, pas ce qu'il a écrit il y a deux
ans —, « Nouveau billet » ne demande qu'un titre, et un interrupteur dit si le
billet paraît. C'est le seul écran d'où le client **crée** et **détruit** du
contenu ; le sélecteur de « Édition » ne pouvait pas l'accueillir, étant un menu
déroulant qu'une trentaine d'entrées rend inutilisable.

La destination « Messages » porte une pastille tant qu'un message n'est pas lu ;
ouvrir un message le marque lu, sans que le client coche quoi que ce soit. Le
badge orange « non transmis » ne paraît que sur une notification **réellement
manquée** (D128) : sur un site qui ne prévient personne, l'afficher partout
serait une alarme qui ne veut rien dire.

Arriver à dix pages signifie que deux d'entre elles auraient dû fusionner. La
hiérarchie suit la fréquence d'usage : le client édite chaque semaine, il
consulte ses statistiques une fois par mois.

### Le « ? » de l'en-tête

Le panel ne s'explique pas dans un écran d'aide — ce serait la septième page que
D63 refuse, et il faudrait l'ouvrir en sachant qu'elle existe. Ce qui n'est pas
clair se dit **là où la question se pose** (D134), mais **quand on le demande**
(D169) : un « ? » dans l'en-tête déplie ce que cet écran-là explique, et rien
d'autre.

Les phrases étaient posées en permanence. Elles occupaient huit paragraphes gris
sur les six écrans, tous les jours, pour expliquer des boutons à quelqu'un qui
les connaît depuis sa deuxième visite — et le premier reproche fait au panel a
été celui-là. Une réponse qu'on n'a pas demandée est du bruit ; la même, à un
clic, ne coûte rien.

Elles vivent toutes dans `src/admin/Help.tsx`, et nulle part ailleurs : deux
endroits auraient divergé à la première correction. La première note est sur
tous les écrans — les deux boutons y sont aussi, et c'est la question que le
client pose le plus souvent.

L'adresse vient d'`EMAIL_ADMIN`, déjà dans le `.env` : aucune variable nouvelle,
et pas de seconde source à faire diverger. Vide, les phrases s'arrêtent avant
l'adresse plutôt que de nommer un destinataire qui n'existe pas.

Ce qui reste dans les écrans est ce qui n'est pas de l'explication : ce qui
décrit un **état** — « L'aperçu montre le dernier enregistrement », « Employée
par une section : retirez-la d'abord » — et ce qui accompagne un **geste** dans
la fenêtre où on le fait.

**Deux niveaux de navigation au maximum.** Menu, puis page. Jamais un troisième
étage d'onglets : une page qui réclame des onglets est deux pages.

**Trois informations lisibles en permanence**, sans cliquer :

- ai-je des modifications non publiées ?
- quand ai-je publié pour la dernière fois ?
- est-ce que quelque chose est cassé ?

Elles suppriment l'essentiel des questions que le client poserait autrement.

**Un seul endroit pour agir sur l'état du site** : la barre d'enregistrement et
de publication, toujours à la même place à l'écran. Jamais deux boutons
« Publier » à deux endroits.

**Rien ne fait perdre un brouillon sans le dire.** Ouvrir une autre page — ou un
autre billet — sur des modifications non enregistrées demande confirmation, fermer l'onglet passe par
celle du navigateur, et tout le reste — ajouter une image, en corriger la
description — recharge la médiathèque sans toucher au texte en cours.

**Le vocabulaire est celui du client.** Ni « bloc », ni « schéma », ni
« build », ni « commit », ni « déployer ». On dit *section*, *enregistrer*,
*mettre en ligne*. Une dizaine de mots fixés une fois et tenus partout.

Le panel emploie **sa propre échelle**, jamais les tokens du site (D65) : la
DA d'un client ne décide pas de la lisibilité de son outil de travail. La règle
des tokens de `design.md` reste donc bornée aux blocs. Ce que le panel prend
d'un client, c'est une graine de couleur (D195), et rien d'autre.

### La couche de tokens

Le panel porte sa propre couche de tokens (D95). Les valeurs vivent dans
`src/admin/tokens.ts` : les rôles de couleur dans les deux modes, les opacités
des couches d'état, le mouvement, les cinq ombres, le voile, les hachures,
l'échelle de forme, les espacements, les tailles de texte, les polices, les
hauteurs de contrôle et les largeurs de lecture. `panel.css` les pose en
variables `--panel-*` — le clair sur `:root`, le sombre sous
`prefers-color-scheme: dark` — et ne consomme rien d'autre.

Les deux ne peuvent pas diverger : `src/admin/tokens.test.ts` relit les deux
blocs et les compare au module — chaque token doit y être, à la même valeur,
et la feuille ne peut en poser aucun que le module ne porte. La feuille reste
donc écrite à la main, sans étape de génération, et reste juste.

Le module des valeurs n'importe rien : `basalte lint` doit les relire depuis une
commande Node (D164).

#### La couleur vient d'une graine

Le panel parle Material Design 3 (D194), et ses couleurs sont des **rôles** :
`primary`, `onPrimary`, `primaryContainer`, `secondaryContainer`, `surface`
et ses cinq conteneurs, `onSurface`, `outline`, `error`, `inverseSurface` —
quarante et un, plus le vert qui dit « en ligne » et l'ambre qui demande un
regard, que Material n'a pas. Chaque rôle est un **ton** fixe d'une palette,
et toutes les palettes se tirent d'une seule **graine** (D195).

`src/admin/scheme.ts` fait ce travail : la teinte et le chroma se lisent en
OKLCH, le ton est la clarté L\* de CIELAB (D196). C'est L\* qui porte la
garantie de Material — deux tons séparés de quarante se lisent à 3:1, de
cinquante à 4,5:1, quelle que soit la graine —, et c'est ce que le lint mesure
ensuite. Une graine grise garde tout gris : le neutre du panel est
`#5c5c60`, et les deux schémas que `tokens.ts` écrit en clair sont sa sortie,
que `scheme.test.ts` vérifie (D198).

Un site déclare sa graine dans `site.config.ts` :

```ts
panel: { seed: '#2f5bea' }
```

`admin.astro` calcule alors les rôles côté serveur et les pose en `<style>`
inline, sur `:root[data-seed]` (D199) — avant que l'island monte, et avec une
spécificité qui gagne quel que soit l'ordre des feuilles. Le sombre suit
`prefers-color-scheme` (D197).

Ce qu'un client règle par-dessus — un mode forcé, une graine à lui — se
choisit dans « Compte » et vit dans son navigateur, pas sur le serveur (D208) :
`src/admin/appearance.ts` range la préférence avec les deux schémas déjà
calculés, et un script inline émis par `admin.astro` les pose sur `<html>`
avant toute feuille, en variables inline qui gagnent sur `:root[data-seed]`.
Revenir au défaut efface tout, et le panel repart du site et du système.

#### Ce que le lint mesure

Le plancher est **vérifié par `basalte lint`** (D164) : `design/panel-contrast`
mesure les paires que Material superpose vraiment — chaque encre sur la surface
et ses cinq conteneurs, chaque « on » sur son conteneur, le texte coloré à même
un plan, la snackbar — sur le schéma clair, sur le sombre, et sur la graine
qu'un site déclare, au lint de son dépôt. Les règles `style/*` refusent une
longueur ou une couleur écrite en clair dans `panel.css`.

Le seuil du dessin, 3:1, ne vaut que pour ce qui **porte une information**
(D177) : la barre d'un histogramme, l'anneau de focus, le contour d'un champ,
le point « en ligne ». Le filet qui sépare (`outlineVariant`), les couches
d'état et le ton d'un contrôle éteint en sont tenus dehors, et
`panel.test.ts` vérifie qu'ils y restent.

Le reste du plancher — focus visible, cible tactile de 44 px sous 600 px,
jamais la couleur seule pour porter un état — demande encore de regarder un
écran.

### Les composants

Le panel n'emploie aucune bibliothèque d'interface (D175). Ses composants vivent
dans `src/admin/ui/`, un fichier par famille : la mise en place, la
typographie, les boutons, le champ et ce qui l'entoure, la ligne de liste, les
marques, les interrupteurs, la puce et les onglets, les surfaces, ce qui
flotte, la navigation, ce qui dit qu'une chose se passe, et le jeu d'icônes.

Quatre mécaniques portent l'allure :

- **Une surface s'élève par sa couleur** (D200). La surface, puis cinq
  conteneurs de plus en plus clairs ; l'ombre ne vient qu'à ce qui se détache
  vraiment — une carte élevée, un menu, une fenêtre, le bouton flottant.
- **Ce qui se presse porte une couche d'état.** La couleur de son contenu,
  posée dessus à huit pour cent au survol, dix au focus et à l'appui — une
  seule règle, pour le bouton, la ligne, la puce et la destination du rail.
- **Le bouton plein dit « fais »** (D201). Il change l'état du site ; le tonal
  agit sur l'écran, le contour propose, le texte annule, et le ton d'erreur se
  pose sur n'importe lequel.
- **La forme pleine est celle de ce qui agit**, le rayon moyen celle de ce qui
  contient (D202) : 0, 4, 8, 12, 16, 28 et le plein. Une ligne de liste de
  deux hauteurs garde le rayon moyen, la forme pleine restant aux menus (D211).

L'échelle est celle de Material **resserrée d'un cran** (D209) : le corps à
13 px, le champ à 40 px, le bouton à 36 px, l'icône à 20 px. Le panel est un
outil de bureau, et les tailles dessinées pour le pouce y faisaient tout
paraître écrasé. Dans le même geste, un contour est un filet sur
`outlineVariant` et non un cadre sur `outline`, un tonal éteint perd son fond,
et l'état « enregistré » de la barre se lit sans cadre. Un interrupteur qui
accompagne un titre se pose en **ligne d'interrupteur** sous lui — `SwitchRow`
—, jamais à côté (D211).

Deux composants portent plus qu'une allure. `Field` tient l'affichage d'un
refus de validation : son render-prop remet à chaque contrôle l'identifiant,
l'`aria-invalid` et l'`aria-describedby` qui font qu'une erreur atteint le champ
qui la cause (D166) — et c'est pourquoi le libellé se tient **au-dessus** du
contrôle, jamais dedans (D203) : un champ composite n'a pas de bord où le
faire flotter. `Modal` piège le focus, ferme à Échap et au clic sur le
voile, et ne rend rien tant qu'elle est fermée — le composant qui la porte reste
monté, ce qui évite qu'un sélecteur rouvert propose le choix du précédent.

Ce qui vient de réussir se dit dans une **snackbar** — « Enregistré », « Mise
en ligne lancée » — qui s'efface d'elle-même (D205) ; ce qui a échoué au
niveau du site reste un bandeau sous la barre d'application, jusqu'à ce que la
cause disparaisse.

La **police** est Roboto Flex, avec Roboto Mono pour le chiffre, en fontes
variables auto-hébergées (D206) : le panel est servi depuis le VPS du client, et
n'appelle pas un tiers pour s'afficher. Les deux `.woff2` vivent dans
`src/admin/fonts/`, et `scripts/build.mjs` les recopie dans le paquet au même
titre que la feuille. Les icônes sont des Material Symbols recopiés en chemins
inline (D207).

### Ce qui tient sur l'écran qu'on a

Le panel suit les classes de fenêtre de Material. À partir de **1 200 px**, un
écran à colonnes les garde : l'aperçu à gauche, les sections et leurs réglages
à droite. En dessous, tout s'empile, et ce qu'on règle vient avant ce qu'on
relit. À partir de **840 px**, la navigation est un rail à gauche, avec la
marque du site en tête et l'avatar du compte au pied ; en dessous, c'est une
barre en bas de l'écran, et l'avatar rejoint la barre d'application (D204).
Sous **600 px**, la barre d'application s'empile et tout ce qui se presse
atteint 44 px.

L'écran de connexion tient en **deux volets** (D210) : le site à gauche, sur un
dégradé tiré de sa graine ; le formulaire à droite, sur la surface. Sous
840 px, le volet devient un bandeau au-dessus du formulaire.

## Authentification

Flux : email + mot de passe, puis code à six chiffres reçu par email.

- **Mot de passe généré** par le socle à la création du compte, modifiable
  ensuite. Minimum 12 caractères, refus des mots de passe les plus courants via
  une liste embarquée (aucun appel réseau). Hachage Argon2id.
- **Il ne transite jamais par email** : affiché une seule fois à la création du
  compte, ou communiqué de vive voix. L'email portant déjà le second facteur,
  l'y envoyer réunirait les deux facteurs dans la même boîte — et le second
  facteur ne protégerait plus de rien.
- **Code** valable 10 minutes, à usage unique, **lié à la tentative de connexion
  en cours** et non au seul compte — sans quoi il serait rejouable ailleurs.
  Trois envois maximum par quart d'heure, cinq essais avant invalidation,
  comparaison en temps constant.
- **Appareil de confiance 30 jours** : le code n'est demandé que sur un appareil
  inconnu. Chaque nouvel appareil reconnu déclenche une notification par email,
  et un bouton révoque tous les appareils.
- **Sessions** : cookie `HttpOnly`, `Secure`, `SameSite=Strict`, jeton aléatoire
  de 256 bits stocké haché. 12 h d'inactivité, 7 jours en absolu, révocables
  côté serveur.
- **Force brute** : limitation par IP *et* par compte, verrouillage temporaire
  progressif, notification au client après plusieurs échecs — cette notification
  vaut plus que le verrouillage.
- **Journal** des connexions réussies et échouées (date, IP, navigateur),
  consultable par le client dans le panel.
- **Secours hors email** : `basalte admin:login --user <email>` exécuté en SSH
  génère un lien de connexion valable dix minutes. Indispensable, puisque
  l'email est devenu un composant d'authentification.

Les emails d'authentification empruntent un **canal distinct** de ceux du
formulaire de contact, pour qu'un robot spammant le formulaire ne puisse pas
épuiser le quota qui sert à se connecter. En pratique : `AUTH_EMAIL_API_KEY` et
`AUTH_EMAIL_FROM` dans `.env` ; sans elles le canal retombe sur celui du
formulaire, et `doctor` le signalera.

### Les adresses de l'authentification

Le flux vit dans `src/server/`, en fonctions `Request` vers `Response` (D51) que
le panel monte sans les réécrire. Il ne sait rien d'Astro et se déroule
entièrement dans les tests, cookies compris.

| Adresse | Ce qu'elle fait |
|---|---|
| `POST /api/auth/sign-in` | adresse et mot de passe ; renvoie `step: code` ou `step: panel` |
| `POST /api/auth/code` | le code à six chiffres, et `remember` pour l'appareil |
| `POST /api/auth/sign-out` | ferme la session |
| `GET /api/auth/session` | le compte, ses appareils, son journal |
| `POST /api/auth/password` | change le mot de passe, et coupe les autres sessions |
| `POST /api/auth/devices/forget` | oublie tous les appareils, et coupe les sessions |
| `GET /admin/rescue?token=…` | le lien de `basalte admin:login` |

Trois cookies, tous `HttpOnly`, `Secure`, `SameSite=Strict`, tous limités au
site : `basalte_session`, `basalte_attempt` (le temps du code),
`basalte_device`. Aucun n'est lisible par du JavaScript, et aucun ne porte
autre chose qu'un jeton dont la base ne garde que l'empreinte.

Le CSRF est arrêté par deux gardes indépendantes plutôt que par un jeton
synchronisé (D52) : le corps doit être annoncé en JSON, et l'en-tête `Origin`
doit désigner le même hôte que la requête. Un formulaire hébergé ailleurs
échoue sur les deux, et `SameSite=Strict` a déjà retenu le cookie.

Les comptes, sessions, appareils, tentatives et le journal vivent dans
`data/basalte.db`, ouvert par `node:sqlite` (D47). Le fichier n'est pas
versionné ; c'est lui que sauvegarde le dump quotidien de `deploiement.md`.

Le premier compte se crée en console : `basalte admin:login --user <email>
--create` affiche le mot de passe généré une seule fois, puis le lien de
connexion (D53). Ce lien porte le domaine du site — ce qu'il faut sur la
machine, où la commande est faite pour tourner. En local, `--origin
http://localhost:4321` l'ouvre là où le serveur de développement répond.

`--reset` repose le mot de passe d'un compte qui existe, et c'est la seule voie
pour un client qui a oublié le sien : l'écran « Compte » n'en change un qu'en
demandant l'actuel, et le lien de secours ouvre une session sans rien y
changer. La réinitialisation coupe les sessions ouvertes et oublie les
appareils reconnus — un accès à rétablir ne se laisse pas ouvert ailleurs — et
laisse au journal une ligne que le client voit. Aucune route ne l'expose :
ouvrir au réseau une remise à zéro qui ne demande rien ferait de l'accès à la
boîte email un accès au compte, alors que l'email n'est qu'un facteur.

### Les adresses du contenu

Le panel monte le flux d'authentification sans le réécrire, et lui ajoute ses
propres adresses, de la même forme.

| Adresse | Ce qu'elle fait |
|---|---|
| `GET /api/panel` | tout ce qu'il faut pour démarrer : site, langues, champs, bibliothèque de sections, pages, médias, ce qui est cassé |
| `PUT /api/pages/<nom>` | valide, écrit la page, commit |
| `PUT /api/chrome` | valide, écrit `content/chrome.json`, commit |
| `POST /api/media` | téléverse une image, avec son texte alternatif |
| `PATCH /api/media/<clé>` | texte alternatif et point focal |
| `DELETE /api/media/<clé>` | supprime, sauf si une section l'emploie |
| `GET /admin` | la coquille qui monte l'island |
| `GET /admin/preview/<slug>` | l'aperçu du dépôt tel qu'il est |
| `GET /media/<fichier>` | les images du dépôt, pas celles de la version en ligne (D64) |

### Les adresses de la mise en ligne

| Adresse | Ce qu'elle fait |
|---|---|
| `POST /api/publish` | demande la mise en ligne, et rend la main sans attendre le build |
| `GET /api/publish` | où en est la file, et ce qu'a donné la dernière mise en ligne |

Le panel revient lire la seconde toutes les secondes et demie tant que la file
tourne : un build dure des secondes, une requête ne les attend pas
(`publication.md`).

### Les adresses du cadrage et de la fiche d'entreprise

| Adresse | Ce qu'elle fait |
|---|---|
| `PUT /api/business` | valide, écrit `content/business.json`, commit |

### Les adresses des messages et de l'audience

| Adresse | Ce qu'elle fait |
|---|---|
| `POST /api/contact` | l'envoi du formulaire ; **la seule adresse ouverte à un visiteur anonyme** |
| `GET /api/leads` | les messages reçus, du plus récent au plus ancien |
| `PATCH /api/leads/<id>` | marque un message lu |
| `DELETE /api/leads/<id>` | supprime un message, définitivement |
| `GET /api/stats` | le rapport d'audience des trente derniers jours |

`POST /api/contact` passe **avant** le reste du panel, qui refuse tout ce qui
n'a pas de session. Elle est gardée par l'origine seule — un formulaire HTML ne
peut pas annoncer un corps JSON — et par ses propres compteurs de débit
(`services.md`).

Ni l'adresse IP ni le navigateur du visiteur ne sortent de `GET /api/leads` :
ils sont gardés en base pour le jour où un envoi doit se retracer, et n'ont rien
à faire dans un écran.

Les fichiers du panel sont servis depuis `/_panel/`, ceux du site public depuis
`/_astro/` (D85). Le proxy sert le site depuis le disque et le panel depuis
l'application : un dossier commun ferait chercher l'island du panel parmi les
fichiers du site, et la page resterait vide sans la moindre erreur côté
serveur.

Les mêmes gardes que l'authentification, avec une nuance : un formulaire
hébergé ailleurs *peut* annoncer `multipart/form-data`. Le téléversement n'est
donc protégé que par l'origine et par `SameSite=Strict`, là où les autres
écritures exigent en plus un corps annoncé en JSON.

`GET /media/<fichier>` ne sert que les noms produits par l'ingestion —
empreinte, largeur, WebP. Aucun autre chemin ne peut être demandé.

**Le panel lit le contenu brut, et n'enregistre que du contenu valide.** Une
page cassée doit rester ouvrable, sinon le seul écran capable de la réparer est
celui qui refuse de s'afficher. À l'enregistrement, en revanche, un contenu
invalide est refusé avec les messages français de `check` (D60) : chaque commit
reste constructible.

**Ce qui bloque se montre là où on le corrige** (D166). Le refus rend les
incidents entiers, pas des phrases : `ContentIssue` porte la section, le champ,
la langue et le chemin machine. Chaque niveau du formulaire retire le segment
qu'il porte, si bien que le champ affiche son erreur, qu'un élément de liste
replié se marque et s'ouvre, que la ligne de la section se marque dans la
colonne, et que chaque ligne du résumé ouvre la section qu'elle nomme. Le panel
ne valide toujours rien (D58) : il range un verdict qui vient du serveur.

**Ce qui n'est pas dans le panel.** Le client n'ajoute ni page ni section
(D3) : il modifie, réordonne, masque, et remplit ou vide une liste répétable.

### L'écran d'édition

Trois colonnes, et l'aperçu au centre (D96) :

| Colonne | Ce qu'elle porte |
|---|---|
| gauche | la page ouverte, la liste de ses sections — sélection, réordonnancement, et la seule prise sur une section masquée |
| centre | `GET /admin/preview/<slug>` dans un cadre, en bureau ou en mobile |
| droite | le panneau de la section choisie, ou les informations de la page |

**Une liste répétable se parcourt repliée** (D163). Chaque élément est une
ligne qui porte le champ que le bloc a désigné en `itemLabel` — la question
d'une FAQ, le nom d'une personne — et, à défaut, son rang. Un clic ouvre
l'élément et referme le précédent : une liste de trente questions se lit comme
une table des matières, là où trente formulaires dépliés faisaient un ruban.
L'élément qu'on vient d'ajouter s'ouvre de lui-même, et celui qui est ouvert
suit son contenu quand la liste se réordonne, jamais son rang.

L'aperçu montre **le dernier enregistrement** : c'est ce que le dépôt contient,
donc ce qui partira en ligne. Tant que des modifications ne le sont pas,
l'écran le dit et le cadre se recharge au premier enregistrement réussi.
Modifier le texte directement dans l'aperçu demande une route de rendu qui
accepte un contenu en transit — ce n'est pas fait.

La bascule « Bureau / Mobile » redimensionne le cadre, et **demande aussi le
rendu du support** sur un site qui en a deux : elle passe `?support=` à
l'aperçu. Sur un site à un seul rendu elle ne change que la largeur, ce qu'elle
faisait déjà — le client ne voit donc rien de nouveau (D25).

**« En-tête et pied de page »** est la dernière entrée du sélecteur de page.
Elle ouvre les deux emplacements du chrome comme deux sections, dans le même
panneau et avec les mêmes champs — mais sans poignée, sans suppression et sans
interrupteur de visibilité : ils sont sur toutes les pages, et `hidden` n'a
d'axe que la langue (D107). L'aperçu montre alors l'accueil, où ils se voient
en entier.

**« Fiche de l'entreprise »** est la dernière entrée du sélecteur. Elle porte ce
que les moteurs de recherche affichent du client — raison sociale, type
d'activité, adresse, téléphone, horaires, zone desservie — et rien de tout cela
ne s'affiche sur le site : la phrase sous la liste le dit. C'est la source
structurée que D120 introduit, et la seule.

Le brouillon garde sa forme — des sections, pas de métadonnées — si bien que le
suivi des modifications non enregistrées, la confirmation avant de quitter et le
refus d'un contenu invalide marchent sans une ligne de plus. Les entrées qui ne
sont pas des pages sont nommées au même endroit, `src/admin/asides.ts` : une
quatrième s'y ajoute sans qu'une condition se répande dans les écrans.

L'enregistrement et la mise en ligne vivent dans l'en-tête, à droite du titre :
un seul endroit pour agir sur l'état du site, à la même place sur les six
écrans. « Enregistrer » suit le badge et rien d'autre : un avertissement à côté
d'un bouton éteint vaut moins que pas d'avertissement.

## Médias

**Rien de ce que le client envoie n'est conservé tel quel** : chaque image est
ré-encodée par sharp avant stockage, ce qui neutralise les fichiers polyglottes
et les charges utiles en métadonnées sans avoir à les reconnaître.

Autour de cette règle :

- taille limitée à 10 Mo
- type vérifié sur les **octets réels**, jamais sur l'extension ni sur le
  `Content-Type` annoncé
- nom de fichier dérivé de l'empreinte du contenu, jamais le nom d'origine
  (vecteur de traversée de chemin)
- EXIF supprimé, ce qui efface aussi la géolocalisation
- redimensionnement à 2560 px maximum

**SVG interdit au téléversement** : c'est un document XML pouvant contenir du
JavaScript, donc une XSS permanente sur le site public. Les logos vectoriels
sont déposés dans le dépôt.

**Les largeurs sont produites au téléversement**, dans la même passe que le
ré-encodage, et versionnées (D40). Le build ne traite donc aucune image, et il
n'y a aucun cache à préserver d'une publication à l'autre. Une image déposée à
la main dans le dépôt passe par la même fonction, appelée par `basalte check`.

Ce que le socle sait d'une image vit dans `content/media.json`, à côté des
pages : dimensions, largeurs produites, texte alternatif par langue, point
focal. Un contenu ne référence qu'une clé — l'empreinte — et le rendu y trouve
le reste.

Les médias vivent dans `public/media/`, versionnés avec le contenu : un
`git revert` restaure texte et images ensemble. Le nom dérivé de l'empreinte
déduplique au passage — remplacer dix fois la même image ne la stocke qu'une
fois. Git ne supprimant jamais rien, le seuil de vigilance reste 200 Mo par
site.

**Texte alternatif obligatoire** au téléversement, et traduisible.

### Les documents

L'écran « Médias » porte aussi les documents, quand le site déclare la capacité
`documents` — pas un sixième écran, D63 tient. Un document n'a rien à décrire :
il n'est jamais affiché, seulement téléchargé, et le nom du fichier est tout ce
que le manifeste retient.

Ils vivent dans `public/documents/`, décrits par `content/documents.json`, et
suivent les mêmes règles qu'une image pour tout ce qui peut l'être : type lu
sur les octets réels, nom dérivé de l'empreinte, suppression refusée tant
qu'une section l'emploie. Ce qui les sépare — le ré-encodage impossible, et les
conditions qui le compensent — est dans `securite.md`.

**Point focal** réglable, transformé en `object-position`, et **seul réglage
d'image** (D178). Le client clique le sujet ; le site cadre autour de lui, quelle
que soit la forme de l'emplacement — un bandeau en 16/9 et une vignette en 4/3
se servent du même point, et le corriger ne réencode rien.

Le panel ne recadre plus. Un site monté de version peut porter des recadrages
faits avant : ce sont des médias comme les autres, leur filiation reste lue, et
supprimer l'originale d'un recadrage encore employé reste refusé.

La suppression d'un média encore référencé est refusée : le panel affiche
« employée par une section » à la place du bouton. `basalte check` signale
l'inverse — une image que plus aucune section ne cite. Il ne la supprime pas :
git ne perd rien, et l'effacer casserait un retour en arrière.

Le point focal se règle en cliquant sur le sujet de l'image ; le repère montre
où il est. Le texte alternatif est demandé **avant** l'envoi, dans chaque langue
en ligne — c'est la seule occasion où le client a l'image sous les yeux.
