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

Treize phases, et ce que chacune a mis en place. Le détail de leurs choix est
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
| 12 | Constater | `basalte content`, la description requise, les constats de trouvabilité de `check` | D136 à D141 |
| 13 | S'outiller | `basalte release`, la skill « reutiliser », la convention de commit | D142 à D146 |

Entre les phases 6 et 7, le panel a repris sa direction artistique (D95 à D97).
Entre la 11 et la 12, `basalte lint` a rendu vérifiables des conventions qui
n'étaient que de la prose (D135).

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
| la publication du socle | un dépôt jetable avec son distant, et un npm injecté qui porte vraiment le numéro sans rien installer — l'ordre des cinq étapes, chaque refus, et le retour à l'état d'avant, la note gardée |
| la trouvabilité | `findableIssues` sur des pages écrites à la main, et `basalte content` relu sur le site de démonstration — le seul contenu qui ait toutes les formes à la fois |
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
