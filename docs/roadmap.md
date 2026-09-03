# Roadmap

Ce qui a été identifié, et volontairement laissé de côté.

Ce document ne porte que cela. Les phases à faire sont dans
`implementation.md` ; ce que les phases faites ont décidé est dans
`decisions.md`.

Chaque ligne dit **ce qui la ferait revenir**. C'est la seule chose qui compte
ici : un sujet sans déclencheur est un sujet qu'on reprendra par ennui ou
qu'on oubliera, jamais un sujet qu'on reprendra au bon moment.

## Vu, et pas retenu maintenant

| Sujet | Ce qui le ferait revenir |
|---|---|
| **`f.boolean` et `f.number`** — le DSL porte dix types, et aucun n'exprime un interrupteur ni une quantité : un « afficher le badge » passe aujourd'hui par un `select` à deux valeurs | Le premier bloc qui a vraiment besoin d'un des deux. La question est moins le type que ce que le panel en rend, et un type de champ est un engagement de migration. `f.date` a montré ce que coûte l'ajout d'un type : le typecheck nomme chaque endroit à toucher, et le contrôle natif du navigateur évite un paquet de plus (D155) |
| **Le reste du plancher d'accessibilité** — `design.md` pose 4,5:1, 44 px et le focus visible ; `lint` fait le contraste des deux systèmes de tokens (D164), le reste demande de regarder un écran | Le premier site livré à quelqu'un qui navigue au clavier ou à la loupe. Le banc de blocs le rend visible à l'œil, ce qui suffit tant qu'il y a peu de sites |
| **Un budget de poids qui refuse**, plutôt que d'avertir — `check --build` nomme les pages au-delà de deux mégaoctets (D162), rien ne les empêche de partir | Le premier site mis en ligne avec une page que l'avertissement nommait et que personne n'a corrigée. Tant que l'avertissement suffit à faire agir, un refus ne ferait que déplacer le problème à la publication |
| **Un bloc `carousel`** — une piste qui défile en `scroll-snap`, sans une ligne de script : ce serait la démonstration la plus directe d'une liste qu'aucune borne ne protège (D160) | Le premier client qui a plus d'images à montrer qu'une page n'en porte. `gallery` montre déjà plusieurs images qui s'allongent sans casser, et un vingtième bloc de référence doit apporter une mécanique que les dix-neuf autres ne montrent pas (D148) |
| **Un aperçu partageable** sans compte, pour montrer au client avant mise en ligne | Le premier client qui demande à voir avant. Cela contourne l'authentification : à concevoir, pas à improviser |
| **La provenance des leads** (campagne, source) | Le premier client qui paie de la publicité |
| **La couleur dynamique** — tirer la graine du panel de l'accent du site, sans la déclarer | Le troisième site dont la graine déclarée est exactement l'accent. D195 garde les deux séparés, et `panel.seed` coûte une ligne |
| **Les quinze styles de type en utilitaires** — la feuille pose les rôles par composant, pas par classe | Le premier écran qui a besoin d'un style que ses composants ne portent pas. Quinze classes de plus sont quinze façons d'écrire à côté du composant |
| **La restauration après sinistre jouée pour de vrai** — la procédure est celle d'une nouvelle installation, donc validée à chaque site créé, mais jamais exécutée depuis une sauvegarde | La première machine qui porte un site dont la perte coûterait quelque chose. Une procédure jamais jouée est une hypothèse |
| **La sauvegarde du fichier SQLite** — sans propriétaire dans le socle, assumée (`deploiement.md`) | Le premier site dont les messages ont de la valeur au-delà de leur notification |
| **La CI sur les commits poussés dans `main`** — elle ne tourne que sur les pull requests (D38), et le travail passe souvent par `main` directement : elle n'y voit donc rien | Le premier `main` cassé qui n'est découvert qu'à la publication. `basalte release` lance `verify` avant de publier, ce qui tient tant que rien n'atteint un client sans passer par lui |
| **La pagination de l'index du journal** — il porte tous les billets, groupés par année, et rien ne le découpe | Le premier journal qui dépasse deux cents billets, ou dont la page d'index se fait nommer par le poids (D162). Découper demande des routes, des canoniques et des `prev`/`next` : c'est un travail, pas un réglage |
| **Des rubriques ou des mots-clés sur les billets** | Le premier client qui s'adresse à deux publics distincts depuis le même journal. Une rubrique fait une page de plus par valeur, et une page maigre indexée coûte plus qu'elle ne rapporte |
| **La publication programmée d'un billet** — « paraître le 15 » | Le premier client qui la demande. Un site statique n'a pas d'horloge : elle exige d'abord une reconstruction périodique, qu'aucune machine ne fait aujourd'hui |
| **Un segment d'URL par langue pour le journal** — `/actualites/` en français, `/news/` en anglais | Le premier site bilingue dont le référencement anglais compte vraiment. Le segment est aujourd'hui le même partout, et le préfixe de langue suffit à séparer les deux |
| **Le partage d'un bloc entre deux dépôts clients** — écarté par D147 : un bloc écrit hors socle se recopie, et le socle absorbe ce qui sert à plusieurs (D148) | Le troisième dépôt client qui reçoit le même bloc recopié à la main, **et une correction à reporter dans les trois**. C'est le report qui coûte, pas la copie |
| **La création d'une page par le client** — la moitié de D3 que D179 n'a pas renversée. Le panel ajoute une section, pas une page | Le premier client qui demande une page que son dépôt ne porte pas **et à qui la réponse « je vous l'ajoute » ne suffit plus**. Créer une page engage l'adresse, le menu, le sitemap et les deux rendus : c'est une phase, pas un bouton |
| **Un texte différent entre bureau et mobile**, et une section visible sur un seul support — dessinés dans la maquette de la phase 18, à faire | Retenu : c'est le prochain sujet du modèle de contenu. Il s'ouvre quand la question qui le précède est tranchée — ce que devient le contrat des deux rendus. D107 refuse aujourd'hui l'axe de support sur `hidden`, et sa raison tient toujours : « le mobile cesserait de porter tout le contenu, ou le bureau serait amputé sans que le panel sache le dire », pendant que `checkRenders` compare les deux HTML après chaque build (D108). La phase commence donc par décider ce qu'un support a le droit de ne pas montrer, et à quoi `checkRenders` avertit ensuite — pas par ajouter un champ. La maquette en porte déjà la forme : une surcharge à la demande, le texte du bureau repris tant que rien n'est écrit, et une marque de dix-neuf pixels sur la ligne de section |
| **Rien ne garantit qu'un bloc applique le point focal** — les sept blocs qui recadrent le posent en `object-position`, `logos` ne le fait pas et n'a pas à le faire (il est en `contain`), mais un huitième bloc écrit en `cover` sans lui recadrerait au centre sans que personne ne le voie | Le premier bloc qui rend une image sans poser son `object-position`. C'est une règle de `basalte lint` — un `object-fit: cover` sur une image de bloc exige le `object-position` qui l'accompagne — et le lint est déjà l'endroit où ce genre de règle cesse d'être une phrase à retenir (D135, D164) |

## Hors périmètre, toujours

Ce n'est pas de la dette, et rien ne le ramènera : `implementation.md` en tient
la liste, sous « Hors périmètre ».
