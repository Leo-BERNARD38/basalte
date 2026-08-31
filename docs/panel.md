# Panel d'édition

## Structure technique

Le panel est **une island React unique** montée en `client:only="react"`.

Astro ne partage pas de contexte React entre islands séparées ; un arbre unique
supprime le problème, et `client:only` évite tout souci d'hydratation. Le panel
n'a besoin ni de SEO ni de rendu serveur, puisqu'il est derrière une
authentification.

Il n'ajoute **aucune dépendance** (D57) : `@mantine/core` et `@mantine/hooks`
pour les composants, dnd-kit pour le réordonnancement. `@mantine/form`,
`@mantine/notifications`, `@mantine/modals` et `@mantine/dropzone` ont été
écartés — quatre paquets de plus sur chaque VPS pour ce que `@mantine/core`
porte déjà.

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

**Cinq pages, et pas davantage.** L'hypothèse de départ en comptait six ;
« Réglages » a été supprimée (D63) : langues et informations du site vivent dans
`site.config.ts`, versionné, que le client n'édite pas.

| Page | Contenu | Depuis |
|---|---|---|
| Édition | l'aperçu de la page, ses sections, et le panneau de la section choisie — l'écran par défaut | phase 3 |
| Médias | la médiathèque | phase 3 |
| Compte | mot de passe, appareils, journal de connexion | phase 3 |
| Messages | les leads du formulaire de contact | phase 5 |
| Statistiques | le rapport d'audience | phase 5 |

Les cinq sont là, et ni la phase 9 ni la phase 10 n'en ajoutent : l'en-tête, le
pied de page et la fiche d'entreprise s'éditent depuis « Édition », comme des
entrées de plus dans la liste des pages. C'est là que les deux premiers se
règlent bien, puisque c'est là qu'on les voit ; et la troisième n'a pas de quoi
remplir un écran à elle seule.

L'onglet « Messages » porte une pastille tant qu'un message n'est pas lu ;
ouvrir un message le marque lu, sans que le client coche quoi que ce soit. Le
badge orange « non transmis » ne paraît que sur une notification **réellement
manquée** (D128) : sur un site qui ne prévient personne, l'afficher partout
serait une alarme qui ne veut rien dire.

Arriver à dix pages signifie que deux d'entre elles auraient dû fusionner. La
hiérarchie suit la fréquence d'usage : le client édite chaque semaine, il
consulte ses statistiques une fois par mois.

### Les quatre phrases

Le panel ne s'explique pas dans un écran d'aide — ce serait la sixième page que
D63 refuse, et personne ne l'ouvrirait. Ce qui n'était pas clair pour le client
se dit **là où la question se pose** (D134) :

| Où | Ce qui est dit |
|---|---|
| sous les deux boutons | enregistrer garde le travail, mettre en ligne le montre aux visiteurs |
| sous la liste des sections | ce que le client fait — modifier, réordonner, masquer — et que le reste se demande à toi (D3) |
| au bas de « Compte » | à qui écrire quand quelque chose casse |
| en tête de « Messages » | combien de temps ses messages sont gardés |

L'adresse vient d'`EMAIL_ADMIN`, déjà dans le `.env` : aucune variable nouvelle,
et pas de seconde source à faire diverger. Vide, les phrases s'arrêtent avant
l'adresse plutôt que de nommer un destinataire qui n'existe pas.

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

**Rien ne fait perdre un brouillon sans le dire.** Ouvrir une autre page sur des
modifications non enregistrées demande confirmation, fermer l'onglet passe par
celle du navigateur, et tout le reste — ajouter une image, en corriger la
description — recharge la médiathèque sans toucher au texte en cours.

**Le vocabulaire est celui du client.** Ni « bloc », ni « schéma », ni
« build », ni « commit », ni « déployer ». On dit *section*, *enregistrer*,
*mettre en ligne*. Une dizaine de mots fixés une fois et tenus partout.

Mantine fournit des composants corrects, pas une hiérarchie. Dessinée depuis
les écrans réels, la couche maison s'est révélée plus courte que prévu : le
cadre (`Shell`), le panneau d'une section, la grille de médias, et le moteur de
champs. `PageHeader` et `EmptyState` n'ont pas eu lieu d'être — deux titres et
une phrase suffisaient.

Le panel emploie l'**échelle de Mantine**, jamais les tokens du site (D65) : la
DA d'un client ne décide pas de la lisibilité de son outil de travail. La règle
des tokens de `design.md` reste donc bornée aux blocs.

### La couche de tokens

Cette échelle, le panel la **configure** plutôt que de la subir (D95). Tout vit
dans `src/admin/theme.ts` : surfaces, encre, couleurs, échelle de texte,
espacements, rayons, ombres. L'objet alimente `createTheme` — et donc chaque
composant Mantine — puis, par son résolveur, les variables `--panel-*` que
`panel.css` consomme. Une valeur n'est écrite qu'une fois.

Trois principes portent l'allure :

- **Aucune bordure** (D97). Ce qui sépare deux plans est un écart de valeur et
  une ombre très douce. Entre deux lignes d'une liste, c'est l'écart seul.
- **La couleur est réservée** aux actions et aux données. Le reste est neutre.
  L'action qui change l'état du site est noire, une fois par écran ; l'action
  fréquente est bleue et douce ; ce qui détruit est rouge.
- **Le contraste vient de la graisse et de la taille**, pas de la couleur :
  38 / 22 / 16 / 14 / 13 / 11, en 700 ou 500, et rien entre les deux.

Le plancher est vérifié : 4,5:1 sur les trois premiers niveaux d'encre, focus
visible à 3 px, cible tactile de 48 px sous 60 rem, et jamais la couleur seule
pour porter un état.

`panel.css` ne dessine plus que ce que Mantine ne sait pas dessiner : la mise
en page des écrans, la poignée de déplacement, la vignette, la jauge, le point
focal, et le cadre de recadrage. Ce cadre est le seul trait du panel : ce n'est
pas une bordure qui sépare deux plans (D97), c'est la commande elle-même — hors
de lui, tout est assombri, et c'est cet écart qui montre ce qui sera gardé.

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

### Ce que la phase 2 a posé

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

### Ce que la phase 3 a posé

Le panel monte le flux d'authentification sans le réécrire, et lui ajoute ses
propres adresses, de la même forme.

| Adresse | Ce qu'elle fait |
|---|---|
| `GET /api/panel` | tout ce qu'il faut pour démarrer : site, langues, champs, bibliothèque de sections, pages, médias, ce qui est cassé |
| `PUT /api/pages/<nom>` | valide, écrit la page, commit |
| `PUT /api/chrome` | valide, écrit `content/chrome.json`, commit (phase 9) |
| `POST /api/media` | téléverse une image, avec son texte alternatif |
| `PATCH /api/media/<clé>` | texte alternatif et point focal |
| `DELETE /api/media/<clé>` | supprime, sauf si une section l'emploie |
| `GET /admin` | la coquille qui monte l'island |
| `GET /admin/preview/<slug>` | l'aperçu du dépôt tel qu'il est |
| `GET /media/<fichier>` | les images du dépôt, pas celles de la version en ligne (D64) |

### Ce que la phase 4 a ajouté

| Adresse | Ce qu'elle fait |
|---|---|
| `POST /api/publish` | demande la mise en ligne, et rend la main sans attendre le build |
| `GET /api/publish` | où en est la file, et ce qu'a donné la dernière mise en ligne |

Le panel revient lire la seconde toutes les secondes et demie tant que la file
tourne : un build dure des secondes, une requête ne les attend pas
(`publication.md`).

### Ce que la phase 10 a ajouté

| Adresse | Ce qu'elle fait |
|---|---|
| `POST /api/media/crop` | recadre une image, et rend la nouvelle clé |
| `PUT /api/business` | valide, écrit `content/business.json`, commit |

### Ce que la phase 5 a ajouté

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

**Ce qui n'est pas dans le panel.** Le client n'ajoute ni page ni section
(D3) : il modifie, réordonne, masque, et remplit ou vide une liste répétable.

### L'écran d'édition

Trois colonnes, et l'aperçu au centre (D96) :

| Colonne | Ce qu'elle porte |
|---|---|
| gauche | la page ouverte, la liste de ses sections — sélection, réordonnancement, et la seule prise sur une section masquée |
| centre | `GET /admin/preview/<slug>` dans un cadre, en bureau ou en mobile |
| droite | le panneau de la section choisie, ou les informations de la page |

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
un seul endroit pour agir sur l'état du site, à la même place sur les cinq
écrans.

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

**Point focal** réglable, transformé en `object-position`. Il a longtemps tenu
lieu de recadrage ; la phase 10 lui adjoint un vrai outil, sans le remplacer
(D118) : le recadrage donne le format, le point focal dit où est le sujet à
l'intérieur de ce format — et c'est encore lui qui travaille quand le CSS
re-cadre d'un support à l'autre.

**Recadrage** au format que l'emplacement attend. Il ne s'ouvre pas depuis la
médiathèque, qui ne connaît aucun format, mais depuis le champ, qui le déclare.
Le cadre est verrouillé au ratio : le client le déplace et le redimensionne, à
la souris ou aux flèches du clavier, il ne le déforme pas. Ce qui en sort est
une **nouvelle** image, dérivée de l'originale, qui reste (D117) — la
médiathèque affiche « Recadrée », et supprimer une originale dont un recadrage
est en ligne est refusé.

La suppression d'un média encore référencé est refusée : le panel affiche
« employée par une section » à la place du bouton. `basalte check` signale
l'inverse — une image que plus aucune section ne cite. Il ne la supprime pas :
git ne perd rien, et l'effacer casserait un retour en arrière.

Le point focal se règle en cliquant sur le sujet de l'image ; le repère montre
où il est. Le texte alternatif est demandé **avant** l'envoi, dans chaque langue
en ligne — c'est la seule occasion où le client a l'image sous les yeux.
