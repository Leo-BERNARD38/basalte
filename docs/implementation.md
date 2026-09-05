# Ce que le socle garantit

Ce que le socle tient, et comment on le prouve : les tests, les blocs de
référence, et ce qui reste dehors pour de bon.

**Ce document ne porte rien de ce qui reste à faire.** Le suivi vit dans les
issues du dépôt, et nulle part ailleurs : un fichier de suivi n'a pas d'état —
rien ne force à le tenir, rien ne signale qu'il est périmé, et il diverge en
silence. Ce document en a fait la démonstration : il a porté une table des
phases qui s'est arrêtée douze décisions avant le code (D224).

Ce que le socle **a fait** se lit dans `decisions.md`, qui est sa seule mémoire :
ce que le code fait aujourd'hui se lit dans le code, et pourquoi il le fait se
lit là.

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

Le *comment* d'une phase se décide dans la phase. Une issue dit **quoi**, jamais
comment : les noms, les formes d'API, les écrans et l'ordre des travaux
appartiennent à la session qui les prend. Le format d'un cahier de phase, et les
quatre épreuves qu'il doit passer, sont dans la skill « phase ».

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
| les conventions | `lint` rejoué sur les blocs du socle, qui les tiennent : une dérive future s'y verra — la feuille commune et le gabarit de billet y sont entrés en phase 19 (D186) |
| la publication du socle | un dépôt jetable avec son distant, et un npm injecté qui porte vraiment le numéro sans rien installer — l'ordre des cinq étapes, chaque refus, et le retour à l'état d'avant, la note gardée |
| la trouvabilité | `findableIssues` sur des pages écrites à la main, et `basalte content` relu sur le site de démonstration — le seul contenu qui ait toutes les formes à la fois |
| le poids d'une page | `checkWeight` sur un dossier de sortie écrit à la main — un `srcset` dont une seule dérivée compte, une page de redirection écartée, un budget franchi |
| le repli du panel | les trois fonctions pures qui le portent : où passe l'élément ouvert après un déplacement, ce qu'il devient après un retrait, et le nom qu'une ligne repliée affiche |
| le journal | `pageOfPost` sur des billets écrits à la main — entrée JSON, sortie `Page`, aucun disque ; le flux comparé chaîne pour chaîne ; les trois gestes du panel sur le dépôt jetable, la création et la suppression comprises |
| le reste | `basalte check` sur le site de démonstration, et le diff du HTML produit — sur un correctif, un diff vide prouve l'absence de régression |

Le seul morceau qui ne se teste pas est celui qui ne peut pas l'être : la
machine réelle. C'est `doctor`, lancé dessus, qui en répond.

`basalte check` **n'est pas un test d'intégration** : il valide des contenus
contre des schémas. Il ne touche ni à l'authentification, ni au traitement
d'images, ni à la bascule atomique.

## Blocs de référence

Le socle livre dix-neuf blocs. C'est la seule base commune que les sites
partagent : un bloc absent d'ici se réécrit dans chaque dépôt client, et aucun
correctif n'y redescend jamais (D147).

**Sept démontrent une mécanique du socle** — c'est par eux qu'on apprend ce que
le socle sait faire :

`hero` (texte traduisible, image, point focal, bouton) · `richtext` (Markdown
restreint) · `features` (liste répétable) · `gallery` (plusieurs images,
`srcset`) · `contact` (endpoint serveur, réponse sans script) · `download`
(document PDF) · `faq` (données structurées déclarées dans le schéma, dépliage
natif).

**Huit sont des sections que la plupart des sites demandent** (D148) :

`testimonials` (avis, avec portrait facultatif) · `steps` (étapes numérotées par
le rang) · `stats` (chiffres clés, l'unité dans la valeur) · `cta` (bandeau de
relance) · `contact-details` (la fiche d'entreprise affichée, sans un champ de
coordonnée) · `team` · `logos` · `pricing`.

**Un de plus démontre une mécanique que nul autre ne montre** : `journal` (une liste que le
contenu ne porte pas — les billets arrivent en prop, comme la fiche
d'entreprise, D149).

**Trois derniers sont venus avec la phase 19** (D188) : `showcase` (une chose
expliquée, média et texte en regard, dont la variante bureau inverse l'ordre) ·
`bento` (une liste dont chaque élément décide de la place qu'il prend) ·
`comparison` (deux colonnes nommées, cartes au téléphone et vrai tableau au
bureau).

Plus deux emplacements de chrome, `header` et `footer`, et un gabarit de billet,
`post` — remplaçables, jamais ajoutables (D109, D153).

**Le critère d'entrée** : un bloc gagne sa place s'il démontre une mécanique
qu'aucun autre ne montre, **ou** s'il est une section que la plupart des sites
demandent. Ce qui reste dehors est ce qui n'est ni l'un ni l'autre — une
variante visuelle d'un bloc existant, ou une section propre à un métier.

Aucun bloc de référence ne charge de script : `faq` devait démontrer le
JavaScript opt-in, `<details>` fait mieux, et l'invariant 5 n'a pas eu à être
payé. La mécanique reste ouverte, elle n'a simplement pas trouvé de
démonstration qui la mérite.

Deux déclarent des données structurées : `faq`, et le gabarit `post` en
`BlogPosting`. Les autres n'en portent pas — un avis auto-décerné est un
balisage que Google sanctionne, `HowTo` n'a plus de résultat enrichi, et
`Offer` demande un prix chiffré qu'un champ de texte ne porte pas (D150).

## Hors périmètre

Création de **pages** par le client · éditeur visuel WYSIWYG · back-office
multi-sites · commerce · comptes multiples avec rôles différenciés (un seul
niveau : éditeur) · un troisième rendu — une tablette tombe d'un côté ou de
l'autre.

Le blog en sortait jusqu'à la phase 15, et l'ajout d'une section jusqu'à la
phase 18 : le client tient désormais un journal (D151) et pose les sections
d'une page (D179). Il ne crée toujours pas de pages, et c'est la différence qui
tient tout : ni un billet ni une section n'a d'adresse choisie, de place dans le
menu, ni d'entrée de sitemap.

Ces exclusions sont des choix de v1, pas des impossibilités : le modèle de
contenu les accueille sans réécriture.

