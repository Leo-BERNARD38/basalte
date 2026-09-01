# Implémentation

Ce que les phases ont laissé derrière elles, et le format d’un cahier pour
celle qui viendra.

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

Dix-sept phases, et ce que chacune a mis en place. Le détail de leurs choix est
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
| 14 | Partager | huit sections de référence de plus, la fiche d'entreprise affichée, le critère d'un bloc de référence rouvert | D147 à D150 |
| 15 | Tenir un journal | les billets, `f.date`, le sixième écran du panel, le flux RSS, le bloc de liste | D151 à D159 |
| 16 | Allonger | les listes délivrées de leur borne haute, la règle qui dit quand une borne se justifie, le poids d'une page mesuré au build, les éléments repliés dans le panel | D160 à D163 |
| 17 | Relire le panel | `lint` étendu à la feuille et aux tokens du panel, l'encre ramenée au-dessus du plancher, douze défauts corrigés, une seule voix et une seule forme par geste, l'erreur de validation posée sous son champ, l'écran de connexion refait, le panel qui tient sur un portable et sur un téléphone, l'aide sous un « ? », et une allure qui porte un accent | D164 à D171 |

Entre les phases 6 et 7, le panel a repris sa direction artistique (D95 à D97).
Entre la 11 et la 12, `basalte lint` a rendu vérifiables des conventions qui
n'étaient que de la prose (D135).

Ce qui a été identifié et volontairement laissé de côté est dans `roadmap.md`,
avec ce qui le ferait revenir : c'est là que se prend une phase, quand un
déclencheur se produit.

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

Le socle livre seize blocs. C'est la seule base commune que les sites
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

**Un seizième démontre une mécanique de plus** : `journal` (une liste que le
contenu ne porte pas — les billets arrivent en prop, comme la fiche
d'entreprise, D149).

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

Création de **pages** par le client · ajout de blocs par le client · éditeur
visuel WYSIWYG · back-office multi-sites · commerce · comptes multiples avec
rôles différenciés (un seul niveau : éditeur) · un troisième rendu — une
tablette tombe d'un côté ou de l'autre.

Le blog en sortait jusqu'à la phase 15 : le client tient désormais un journal,
et il ne crée toujours pas de pages (D151). C'est la différence qui tient tout :
un billet n'a ni adresse choisie, ni place dans le menu, ni mise en page.

Ces exclusions sont des choix de v1, pas des impossibilités : le modèle de
contenu les accueille sans réécriture.

## Points ouverts

Aucun qui ne relève d'une phase. Ce qui a été identifié et volontairement laissé
de côté est dans `roadmap.md`, avec ce qui le ferait revenir.
