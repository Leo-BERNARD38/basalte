# Implémentation

Les phases à venir, et ce que les précédentes ont laissé derrière elles.

## Comment lire ce document

Une phase n'est pas une liste de tâches. Chacune dit pourquoi elle existe, ce
qu'elle doit produire, ce qui est en jeu, et où passe la frontière entre ce qui
est déjà tranché et ce qui lui appartient.

Le *comment* n'est pas ici, et c'est volontaire. Décider maintenant, à
l'aveugle, des détails d'une phase qu'on n'a pas commencée produit de la dette :
des choix qu'on ne peut pas encore évaluer, qu'on suivra par discipline, et
qu'on paiera plus tard. Une session entière consacrée à une phase, qui en
connaît les enjeux, décidera mieux.

**Si ce document nomme un fichier ou une commande, c'est une hypothèse, jamais
une spécification.** Les noms, les formes d'API, les écrans et l'ordre des
travaux appartiennent à la phase.

**Une phase, une session.** Elle commence par lire son cahier ci-dessous et les
documents qu'il désigne. Elle finit par consigner ce qu'elle a décidé — dans le
document concerné, et dans `decisions.md` si le choix engage le reste. Puis elle
retire son cahier d'ici : ce document ne porte que ce qui reste à faire.

## Trois niveaux d'engagement

Toute la documentation se lit à travers ces trois niveaux. Ils disent ce qu'une
phase a le droit de changer.

| Niveau | Ce que c'est | Une phase peut-elle le changer ? |
|---|---|---|
| **Invariant** | les douze règles absolues (`securite.md`) | non |
| **Décidé** | une décision numérotée (`decisions.md`) | seulement en actant la décision inverse, avec sa raison |
| **Hypothèse** | un point de départ noté pour ne pas repartir de zéro | oui, librement — en consignant ce qu'elle retient |

Les hypothèses sont signalées en italique. Les remplacer n'est pas un écart :
c'est ce pour quoi elles sont là.

---

## Ce qui est fait

Onze phases, et ce que chacune a mis en place. Le détail de leurs choix est
dans `decisions.md`, qui est la seule mémoire dont on ait besoin : ce que le
code fait aujourd'hui se lit dans le code, et pourquoi il le fait se lit là.

| # | Nom | Ce qu'elle a mis en place | Décisions |
|---|---|---|---|
| 1 | Rendre | le DSL `f.*`, le moteur de blocs, l'intégration Astro, les médias, `check` et `inventory` | D40 à D46 |
| 2 | Authentifier | mot de passe généré et haché, code email, appareil de confiance, sessions, journal, `admin:login` | D47 à D53 |
| 3 | Éditer | le panel : formulaires produits des schémas, enregistrement commité, médiathèque, réordonnancement, aperçu | D55 à D65 |
| 4 | Publier | rebase, build en processus enfant, bascule atomique, push, file à une place | D67 à D75 |
| 5 | Servir | formulaire de contact sans JavaScript, anti-spam, leads gardés en base, purge, audience | D76 à D85 |
| 6 | Livrer | `init`, le paquet Claude Code du dépôt client, `deploy`, `doctor`, `update`, les migrations | D87 à D94 |
| 7 | Outiller | `f.richtext` enrichi, documents légaux, PDF, contexte du site, banc de blocs, capacités, profils | D98 à D102 |
| 8 | Adapter | deux rendus depuis un seul contenu, la variante bureau d'un bloc, le contrat entre les deux | D103 à D108 |
| 9 | Encadrer | l'en-tête et le pied de page, remplaçables par site, le menu déduit des pages, le `h1` | D109 à D116 |
| 10 | Cadrer | le recadrage au ratio déclaré, la fiche d'entreprise, `src/seo/`, le bloc `faq` | D117 à D124 |
| 11 | Joindre | le second canal de notification, les sondes DNS, la page de remerciement | D126 à D134 |

Entre les phases 6 et 7, le panel a repris sa direction artistique (D95 à D97).
Après la 11, `basalte lint` a rendu vérifiables des conventions qui n'étaient
que de la prose (D135).

---

## Phase 12 — Constater

**Pourquoi.** Un agent qui ouvre un dépôt client sait quels blocs existent
— `inventory` les lui donne — et quelles règles tenir — `lint` les lui refuse.
Rien ne lui dit **ce que le site contient déjà** : il lit tous les JSON, ou il
devine. Et `check` valide un contenu contre son schéma sans jamais juger ce qui
fait qu'une page est trouvée et lisible : un titre en double entre deux pages,
une description absente, une image sans texte alternatif ne l'arrêtent pas.

Les deux manques ont la même racine. Le socle sait **valider** — cette valeur
est-elle conforme à ce schéma — et il ne sait pas encore **constater** : de quoi
ce site est-il fait, et qu'est-ce qui, dedans, ne tiendra pas dehors.

**Ce qu'elle produit.** Une vue compacte du contenu d'un site, produite depuis
le code, sur laquelle un agent se repose au lieu de tout lire. Et des refus de
plus dans `check`, sur ce qui fait qu'une page est trouvée.

**Enjeux.**

Le point dur est le **format de la vue**. Trop détaillée, elle vaut la lecture
des JSON et ne fait économiser rien ; trop maigre, elle oblige à les ouvrir
quand même. Un critère utile pour trancher : un agent doit pouvoir répondre
« quelle page porte tel bloc », « quelles langues sont remplies », « quelle page
n'a pas de description » sans ouvrir un seul fichier.

Le second est la **frontière entre refuser et avertir**. `check` tourne à
l'enregistrement d'un client dans le panel : ce qui l'arrête doit être
corrigeable par lui, depuis le panel, avec ce qu'il y voit. Un titre en double
l'est. Une image de partage manquante l'est moins. Se tromper de côté rend soit
le contrôle inutile, soit le panel bloquant — et un panel bloquant sur un défaut
que le client ne comprend pas est pire que pas de contrôle du tout.

Le troisième est de **ne pas redire ce que `lint` dit déjà**. Le contraste des
tokens est fait. La ligne ne bouge pas (D135) : `check` regarde le contenu,
`lint` regarde le code.

**Déjà tranché.** Invariants 1 et 5 · `check` ne bloque jamais le site public ·
le panel commite en `--no-verify` (D17), ce qui garde `lint` hors de son chemin ·
`meta.title` est borné à 60 et `meta.description` à 160 par le schéma
(`src/content/page.ts`) — les longueurs sont faites, ce sont les absences et les
doublons qui manquent · une contrainte qui manque s'ajoute à `f.*`, jamais au
bloc.

**À décider dans la phase.** La forme de la vue, et par quelle commande elle
sort · ce qui devient une erreur et ce qui reste un avertissement · si le texte
alternatif d'une image devient un champ requis du DSL plutôt qu'un contrôle —
la règle ci-dessus pousse dans ce sens, la phase dira si elle tient · si un
contrôle a besoin du HTML construit ou se contente du JSON.

**Finie quand.** Un agent qui ouvre un dépôt client peut dire ce que le site
contient sans avoir lu un fichier de `content/`, et `check` refuse une page que
Google afficherait mal.

---

## Phase 13 — S'outiller

**Pourquoi.** La quatrième contrainte fondatrice dit que ce projet est fait pour
être développé avec Claude Code. Le dépôt client en a tout l'appareillage : six
skills, une doc régénérée à chaque installation, deux commandes. **Ce dépôt-ci
n'a rien** — `.claude/` n'y contient qu'un hook de démarrage. C'est pourtant ici
que se fait le travail le plus fréquent et le plus délicat : un correctif du
panel, un champ ajouté au DSL, une montée de version.

Et le geste le plus dangereux du projet est entièrement manuel : **publier une
version**. Le numéro, les notes, le commit, le tag, le push, dans cet ordre,
sans en oublier un. Bumper sans taguer est la panne que `mise-a-jour.md` nomme
lui-même « discrète » : le socle continue de fonctionner, `verify` passe, et
c'est `init` qui tombe — chez un client.

**Ce qu'elle produit.** De quoi qu'une session qui ouvre ce dépôt code juste, se
vérifie seule, et publie sans se tromper d'ordre. La tenue de la documentation
est déjà faite : restent les gestes qui touchent au code et à sa publication.

**Enjeux.**

Une skill qui **récite les conventions** ne sert à rien : elles sont dans
`CLAUDE.md`, chargé à chaque session, et `lint` les fait respecter. Ce qui
manque n'est pas du rappel, ce sont les **gestes** — les suites d'étapes qu'on
rate quand on les fait de mémoire.

La publication est le cas dur. Elle touche à git, elle est irréversible une fois
poussée, et son échec est différé : il se manifeste chez quelqu'un d'autre,
plus tard. Ce qu'on lui demande n'est pas d'aller vite, c'est de **rendre
impossible l'ordre faux**.

La revue de réutilisation est nommée dans `conventions.md` comme le défaut le
plus coûteux d'un agent — la duplication discrète, celle qui marche et que
personne ne remarque avant six mois. Elle demande de lire l'inventaire *et* la
diff : c'est le seul de ces outils qui ne se ramène pas à une suite d'étapes,
et le seul dont on ne sache pas d'avance s'il vaut son coût.

**Déjà tranché.** La quatrième contrainte (`contexte.md`) · `conventions.md` ·
`mise-a-jour.md` fixe l'ordre de publication et le format des notes ·
`init` refuse une version non taguée, et reconnaît un tag privé de son `v` ·
`lint` et `verify` **sont** les vérifications : une skill ne les remplace pas et
ne les double pas · deux skills existent déjà, `phase` et `consigner`, qui
tiennent la documentation — la phase les complète, elle ne les refait pas, et
elles donnent la forme que les autres suivront.

**À décider dans la phase.** Ce qui est une skill et ce qui est une commande du
CLI · si la publication devient `basalte release` ou une skill qui enchaîne des
gestes — la première se teste, la seconde s'adapte, et l'une des deux est
probablement en trop · la forme de la revue de réutilisation, et si elle mérite
d'être un agent ou un contrôle · la convention de commit, de fait dans
l'historique et jamais écrite.

**Finie quand.** Publier une version ne demande plus de se souvenir de l'ordre,
et une session qui ouvre ce dépôt trouve les gestes du projet là où elle les
cherche.

---

## Phase 14 — Partager

**Pourquoi.** `src/blocks/` d'un dépôt client est un cul-de-sac. Un bloc écrit
pour le client A ne peut servir au client B qu'en étant recopié — ce que
l'invariant 8 interdit pour le code du socle, et que rien n'encadre entre deux
sites. Le déclencheur est écrit depuis la phase 7 : **la première fois qu'un
bloc est recopié d'un dépôt à l'autre.** C'est le coût principal à partir du
troisième site, pas du premier.

La réponse n'est pas d'ouvrir la liste des blocs de référence du socle. Elle est
close pour une raison qui tient toujours (D19) : ce sont des démonstrations de
mécanique, pas un catalogue de sections. Le besoin est réel, et il est ailleurs.

**Ce qu'elle produit.** Un chemin pour qu'un bloc quitte un dépôt client sans
être recopié, et pour qu'un autre site le reçoive comme il reçoit le socle : par
une version qu'il épingle.

**Enjeux.**

Le premier piège est de **rouvrir la liste close**. Un bloc qui sert à trois
clients n'est pas devenu une démonstration de mécanique. Le faire entrer dans le
socle ferait grossir ce que *chaque* site installe, et rendrait le correctif
d'un bloc solidaire d'une version du socle — donc d'une migration de contenu
pour des sites qui n'emploient pas ce bloc.

Le deuxième est **l'invariant 8**. Ce qui circule doit rester du code installé,
jamais du code copié. Sinon la promesse de D5 — un correctif atteint tous les
sites en changeant un numéro — tombe précisément pour les blocs qu'on partage
le plus.

Le troisième est la **direction artistique**. Un bloc partagé ne tient que par
les tokens : il doit être neutre, et un bloc qui a besoin d'une valeur en dur
n'est pas partageable. `lint` le refuse déjà, ce qui donne à cette phase une
garantie qu'elle n'a pas à construire.

**Déjà tranché.** Invariants 7 et 8 · D5, D19 · `lint` garantit qu'un bloc ne
porte aucune valeur de style en dur · `findBlocks` sait déjà parcourir plusieurs
racines, et le chrome sait déjà qu'une racine en remplace une autre (D109) : la
mécanique de découverte existe, c'est sa provenance qui est neuve.

**À décider dans la phase.** Où vivent ces blocs — un second paquet, un dossier
du socle exclu de son inventaire, autre chose · comment un site en choisit un
sans les installer tous · ce qu'un bloc partagé promet de plus qu'un bloc de
site : la migration de son contenu quand son schéma change, et qui la porte.

**Finie quand.** Un bloc écrit pour un client sert à un deuxième sans qu'une
ligne ait été recopiée.

---

## Ordre

Les trois phases sont indépendantes, et c'est ce qui les distingue des onze
précédentes : aucune n'attend le code d'une autre.

L'ordre proposé suit ce qu'elles font gagner tout de suite. La 12 sert à chaque
session dans un dépôt client, la 13 à chaque session ici, la 14 ne se paie qu'au
troisième site. Prendre la 14 avant les deux autres se défend si le troisième
site arrive avant.

## Tests

Ce qui est couvert, et par quel moyen. Écrits en même temps que le code qu'ils
couvrent.

| Ce qui est éprouvé | Comment |
|---|---|
| l'authentification | base en mémoire, horloge avancée à la main, canal email qui retient au lieu d'envoyer (`src/server/auth.fixture.ts`) — c'est ce qui rend éprouvables expirations, rejeux et verrouillages |
| le DSL de champs | directement : tout le reste en dépend |
| le formulaire de contact | le banc du panel, un envoi étant une requête de formulaire écrite à la main |
| le panel | sa partie serveur, sur un dépôt de site jetable (`src/server/panel.fixture.ts`) ; son interface dans un vrai navigateur, seul endroit où se voient les cookies `HttpOnly` et le réordonnancement au clavier |
| la mise en ligne | build injectable — la file, la bascule et les chemins d'échec sans lancer Astro ; le rebase et le push contre de vrais dépôts git |
| la livraison | le dépôt qu'`init` produit comparé fichier par fichier sans qu'un seul soit écrit ; `deploy` contre un runner qui retient les commandes ; `doctor` avec ses résolutions DNS et son canal email ; `update` contre un dépôt jetable |
| les conventions | `lint` rejoué sur les blocs du socle, qui les tiennent : une dérive future s'y verra |
| le reste | `basalte check` sur le site de démonstration, et le diff du HTML produit — sur un correctif, un diff vide prouve l'absence de régression |

Le seul morceau qui ne se teste pas est celui qui ne peut pas l'être : la
machine réelle. C'est `doctor`, lancé dessus, qui en répond.

`basalte check` **n'est pas un test d'intégration** : il valide des contenus
contre des schémas. Il ne touche ni à l'authentification, ni au traitement
d'images, ni à la bascule atomique.

## Blocs de référence

Les blocs livrés par le socle ne sont pas un catalogue de sections — chaque
client aura les siennes, sur mesure. Ce sont des **exemples de référence**,
choisis pour la mécanique que chacun démontre (D19).

`hero` (texte traduisible, image, point focal, bouton) · `richtext` (Markdown
restreint) · `features` (liste répétable) · `gallery` (plusieurs images,
`srcset`) · `contact` (endpoint serveur, réponse sans script) · `download`
(document PDF) · `faq` (données structurées déclarées dans le schéma, dépliage
natif). Plus deux emplacements de chrome, `header` et `footer`.

**La liste est close.** Le critère tient : un bloc de référence gagne sa place
s'il démontre une mécanique qu'aucun autre ne montre. `testimonials`, `logos` ou
`stats` sont des `features` habillés autrement — ils relèvent du sur-mesure
client, et de la phase 14 quand ils serviront à plusieurs.

Aucun bloc de référence ne charge de script : `faq` devait démontrer le
JavaScript opt-in, `<details>` fait mieux, et l'invariant 5 n'a pas eu à être
payé. La mécanique reste ouverte, elle n'a simplement pas trouvé de
démonstration qui la mérite.

## Hors périmètre

Blog et collections répétées · création de pages par le client · ajout de blocs
par le client · éditeur visuel WYSIWYG · back-office multi-sites · commerce ·
comptes multiples avec rôles différenciés (un seul niveau : éditeur) · un
troisième rendu — une tablette tombe d'un côté ou de l'autre.

Ces exclusions sont des choix de v1, pas des impossibilités : le modèle de
contenu les accueille sans réécriture.

## Points ouverts

Aucun qui ne relève d'une phase. Ce qui a été identifié et volontairement laissé
de côté est dans `roadmap.md`, avec ce qui le ferait revenir.
