# Roadmap

Les six phases d’`implementation.md` sont faites. Ce document décrit les cinq
suivantes, à la même règle : chacune dit pourquoi elle existe, ce qu’elle doit
produire, ce qui est en jeu, et où passe la frontière entre ce qui est tranché
et ce qui lui appartient.

## Ce que ce document engage

Rien ici n’est un ordre d’exécution. Le document porte trois choses, qui n’ont
pas le même poids :

- **des constats** — vérifiés dans le code, avec leur fichier. Vrais jusqu’à ce
  que le code change ;
- **des contraintes** — venues d’un invariant, d’une décision numérotée, ou de
  l’extérieur : le protocole HTTP, la façon dont Google indexe, le droit. Une
  phase ne les contourne pas ;
- **des hypothèses** — *en italique*. Un point de départ pour ne pas repartir de
  zéro. Une phase les remplace librement, et consigne ce qu’elle retient.

Tout le reste appartient à la phase : les noms de fichiers, les formes d’API,
les commandes, les écrans, l’ordre des travaux. **Si ce document nomme un
fichier ou une commande, c’est une hypothèse, jamais une spécification.**

La session qui ouvre une phase lit son cahier, décide, et consigne ce qu’elle a
décidé — dans le document concerné, et dans `decisions.md` si le choix engage
le reste. C’est la règle d’`implementation.md`, elle ne change pas.

## Le geste que ces phases visent

```
basalte init                   tu as l’atelier : contexte, DA, pages légales,
        │                      capacités du site réglées
        ▼
    tu fais la landing         blocs sur mesure, tokens, contenu — avec un
        │                      agent qui sait pour qui il écrit
        ▼
    le client reçoit son panel il édite, il voit ses messages, il met en ligne
```

Aujourd’hui la première flèche produit vingt-huit fichiers dont aucun ne porte
de contexte, la deuxième se fait sans outil de mise au point, et la troisième
livre un site sans navigation ni mentions légales.

## Constats, et où ils sont traités

| Constat | Vérifié dans | Phase |
|---|---|---|
| `init` écrit le même site pour tout le monde : rien n’est réglable | `src/client/files.ts` | 7 |
| Aucun fichier ne dit qui est le client, ce qu’il vend, ni ce que sa DA cherche | `src/client/files.ts` | 7 |
| Aucun moyen de voir tous les blocs d’un site d’un coup pour régler la DA | — | 7 |
| Le Markdown restreint ne produit que des `<p>` : pas de titres, pas de listes | `src/fields/richtext.ts` | 7 |
| Aucune page légale, et le client ne peut pas en créer (D3) | `src/client/files.ts` | 7 |
| La mention de consentement du formulaire est du texte plat : elle ne peut pas porter de lien | `src/blocks/contact/schema.ts` | 7 |
| Un bloc est un composant unique, dont le CSS plie au media query | `src/blocks/*/` | 8 |
| Ni header, ni footer, ni navigation : le `<body>` ne contient que `<slot />` | `src/astro/Layout.astro` | 9 |
| Les pages qu’`init` génère ne sont reliées que par le bouton du bandeau | `src/client/files.ts` | 9 |
| `f.image({ ratio })` existe et n’est appliqué nulle part | `src/fields/types.ts` | 10 |
| Aucun `og:`, JSON-LD, sitemap, `robots.txt`, favicon ni page 404 | `src/astro/Layout.astro`, `src/client/docker.ts` | 10 |
| Le Caddyfile généré n’a aucun `handle_errors` ni aucune redirection | `src/client/docker.ts` | 10 |
| SPF, DKIM et DMARC ne sont vérifiés nulle part, alors que l’email porte aussi les codes de connexion | `src/cli/doctor.ts` | 11 |
| Le formulaire répond par un fragment : aucune adresse distincte après un envoi | `src/blocks/contact/`, D76 | 11 |
| Un lead est écrit en base, et rien ne garantit que le client le lise | `src/server/leads.ts` | 11 |

## Les cinq phases

| # | Nom | Ce qu’elle règle |
|---|---|---|
| 7 | **Outiller** | un `init` réglable, le contexte d’un site, les documents légaux |
| 8 | **Adapter** | deux rendus servis selon le support, une seule source de contenu |
| 9 | **Encadrer** | le chrome — navigation, pied de page |
| 10 | **Cadrer** | le cadrage des images, et `src/seo/` |
| 11 | **Joindre** | ne pas perdre un lead, ne pas être appelé pour rien |

L’ordre proposé est celui des dépendances, avec deux points à valider plutôt
qu’à suivre :

- **Les documents légaux sont en phase 7**, séparés du chrome, parce qu’une page
  légale ne dépend de rien — c’est de la génération, et la génération est le
  sujet de la phase. Ce qui dépend du chrome, c’est de l’atteindre depuis
  n’importe où ; en attendant, le lien qui compte au regard du RGPD est celui de
  la mention de consentement du formulaire.
- **La phase 8 précède la 9** parce qu’elle change la forme d’un bloc : la faire
  quand il y en a cinq coûte moins que lorsqu’il y en aura trente, et le chrome
  s’écrit alors directement en deux variantes — c’est lui qui diffère le plus
  d’un support à l’autre. L’inverse se défend si naviguer tôt compte plus que
  d’écrire le chrome une seule fois.

---

## Le principe qui tient l’ensemble

> **`init` ne décide de rien d’irréversible.**

Trois interrupteurs et un choix à trois valeurs font vingt-quatre sites. Si
chacun bifurque la génération, il y a vingt-quatre socles à maintenir, et la
promesse de D5 — « un correctif publié ici atteint un site en changeant un
numéro » — ne tient plus.

La contrainte qui en découle : **ce qu’un site fait se lit à l’exécution, et se
change après coup.** Un choix posé au jour zéro se révise au deux-centième,
quand on connaît enfin le client. Comment ce réglage s’écrit, où il vit, et
sous quel nom on regroupe des réglages fréquents — tout cela appartient à la
phase 7.

Trois choses au moins se règlent ainsi, et la première marche déjà : sans
`CONTACT_EMAIL`, aucun email ne part et le message reste au panel
(`services.md`). Il reste à la rendre explicite plutôt que déduite d’une
variable vide.

---

## Phase 7 — Outiller

**Pourquoi.** `init` produit le même site pour tout le monde, et aucun de ses
fichiers ne dit qui est le client, ce qu’il vend, à qui, ni ce que sa direction
artistique cherche. Un agent qui ouvre ce dépôt repart de zéro à chaque
session, et toi aussi. C’est aussi la phase qui rend un site livrable au regard
du droit.

**Ce qu’elle doit produire.**

- Un `init` réglable : ce qu’un site fait — nombre de rendus, notification des
  leads, formats de documents acceptés — se déclare, se relit, et se change
  après coup.
- Le contexte d’un site écrit une fois et lu par tout ce qui en a besoin : les
  faits de l’entreprise, le métier et le ton, l’intention de la DA.
- De quoi produire ce contexte sans page blanche.
- De quoi voir tous les blocs d’un site d’un coup pendant qu’on règle sa DA.
- Des documents légaux qui sont de vraies pages, et une prose assez riche pour
  les écrire.
- De quoi ajouter une page au jeu fixé : D3 borne le client, pas toi.

*Pistes notées pour ne pas repartir de zéro : des capacités déclarées dans
`site.config.ts` et un `--profile` qui les pré-remplit ; un fichier typé pour
les faits de l’entreprise à côté d’une prose lue par l’agent ; des skills
d’entretien qui écrivent l’un et l’autre ; une route de développement qui rend
tous les blocs ; une commande pour ajouter une page ; un `f.document`. Chacune
est à confirmer ou à remplacer.*

**Enjeux.**

*Le piège des options est la phase.* La contrainte est écrite plus haut : rien
ne bifurque, tout se lit. Ce qui reste à trancher, c’est jusqu’où elle porte —
une option qui demande une branche dans le rendu n’a pas le même coût qu’une
option qui demande un second fichier généré, et la limite se pose ici.

*Couper le mailing du site ne coupe pas celui de l’authentification.* Le code à
six chiffres passe par email (D9). Un site « sans mailing » cesse de notifier
les leads ; il garde son canal d’authentification. Tant que le second facteur
n’a pas changé de nature — piste de la phase 11 — un réglage qui promettrait un
site sans aucun email mentirait.

*Le PDF ne peut pas entrer dans le pipeline média.* Toute image est ré-encodée,
ce qui neutralise ce qu’elle transporte (invariant 3) ; rien ne fait cela d’un
PDF, qui est un format à script. S’il est accepté, c’est comme exception
explicite à l’invariant 3, écrite dans `securite.md`, avec la page Markdown qui
reste celle que Google lit. *Les conditions — pièce jointe, isolation, absence
de rendu dans la page — sont à établir dans la phase, pas ici.*

*Les faits de l’entreprise ne sont pas du contexte d’agent.* Une raison
sociale, un SIREN, une adresse et un directeur de publication remplissent les
mentions légales, le pied de page et le JSON-LD. Les laisser en prose, c’est
les ressaisir trois fois et les voir diverger deux fois. La contrainte est
qu’ils n’aient qu’une source ; la forme de cette source appartient à la phase.

*Le Markdown restreint ne sait pas écrire un document légal.* `renderRichtext`
échappe tout puis réintroduit gras, italique et liens : le résultat est une
suite de `<p>`. Des mentions légales rendues ainsi sont un mur de texte sans
structure de titres — illisible, et opaque à un lecteur d’écran. Ce qui s’ajoute
doit passer par la même mécanique — échappement complet, puis liste blanche —
pour qu’aucune balise ne vienne du contenu (invariant 1).

*La mention de consentement doit pouvoir porter un lien.* C’est le seul endroit
où le RGPD en attend un, vers la politique de confidentialité, et le champ est
aujourd’hui du texte plat.

*Régler une DA en rechargeant la page d’accueil, c’est régler un bloc sur
cinq.* Ce qui manque est un endroit où ils se voient tous, dans les contrastes
réels — c’est aussi ce qui rendrait le plancher de `design.md` vérifiable à
l’œil.

**Déjà tranché.** Invariants 1, 3, 8 · D3, D5, D25, D26, D27, D89.

**À décider dans la phase.** Comment et où se déclare ce qu’un site fait · s’il
existe des regroupements nommés de ces réglages, et lesquels · ce qui est un
fait structuré et ce qui reste en prose, et où chacun vit · comment ce contexte
se produit sans page blanche · la grammaire de la prose enrichie, et si elle
étend `f.richtext` ou lui succède · si un document légal est un type de page,
un bloc, ou autre chose · ce qu’`init` pré-remplit d’un document légal, et
depuis quoi · si le PDF est accepté, et à quelles conditions · la forme du banc
de blocs, et s’il vit au socle ou dans le dépôt client · comment une page
s’ajoute · comment la mention de consentement gagne son lien.

**Finie quand.** Deux sites générés avec deux réglages n’ont pas le même
comportement, sans qu’une ligne du socle ait été dupliquée. Un agent qui ouvre
le dépôt sait pour qui il écrit avant d’avoir lu une ligne de contenu. Et les
mentions légales d’un site neuf sont en ligne.

---

## Phase 8 — Adapter

**Pourquoi.** Un seul HTML plié par des media queries produit un mobile qui est
un bureau compressé, et un bureau qui est un mobile étiré. Deux rendus séparés
laissent dessiner deux mises en page réellement pensées pour leur support.

**Ce qu’elle doit produire.** Deux rendus construits depuis le même contenu, et
servis chacun à son support — activable par site, un site à un seul rendu ne
devant rien payer de ce mécanisme. Une mise en ligne qui reste atomique quand
elle porte deux rendus. Un aperçu qui montre les deux. Une validation qui
couvre les deux.

*Pistes notées : un mode de build supplémentaire à côté de ceux de D55 ; un
dossier par rendu sous la version ; l’aiguillage confié à Caddy, qui sert déjà
le site depuis le disque ; une variante de composant à côté du composant, avec
repli sur lui quand elle n’existe pas.*

**Enjeux.**

*Le contrat SEO est la phase, et il vient de l’extérieur.* Google indexe avec
son robot smartphone, et sa documentation demande que contenu, métadonnées et
données structurées correspondent entre les deux versions, faute de quoi seul
le mobile est vu. D’où la contrainte, qui n’est pas négociable dans la phase :
**le mobile porte tout le contenu, le bureau ne fait que le présenter
autrement.** Un texte, une métadonnée ou un JSON-LD présent au seul bureau est
un défaut. *Comment `check` le vérifie est à trouver — comparer deux rendus
n’est pas gratuit.*

*`Vary: User-Agent` est obligatoire* sur les réponses HTML : c’est du protocole,
pas une préférence. Sans lui, tout cache intermédiaire sert le mauvais rendu au
visiteur suivant. Aujourd’hui Caddy répond en direct, sans CDN devant, donc la
règle est gratuite — et elle devient un piège le jour où un CDN apparaît,
plusieurs ignorant `Vary` par défaut.

*Le User-Agent se réduit.* Les navigateurs figent leur chaîne depuis quelques
années ; `Sec-CH-UA-Mobile` est le signal moderne, mais il faut l’annoncer et
il n’arrive qu’à la seconde requête. Aucun signal seul ne suffit, et le choix
de la combinaison est celui de la phase — y compris ce qu’on fait des
tablettes, et ce qu’on sert à un robot.

*Le gain de poids est faible, et il ne faut pas s’en réclamer.* La page
n’embarque aucun JavaScript et son CSS est déjà découpé par composant : la
séparation économise de l’ordre de un à deux kilo-octets compressés, sur une
page dont le poids est fait d’images déjà servies en `srcset`. Le gain réel est
la mise en page — c’est la justification qui tient.

*Un bloc écrit avant cette phase doit continuer de marcher.* Cinq blocs de
référence et les blocs sur mesure déjà écrits ne se réécrivent pas : ce qui est
introduit s’ajoute, il ne remplace pas.

*Le temps de build double.* D67 plafonne le processus enfant à dix minutes et un
gigaoctet ; la phase décide de la série ou du parallèle, et révise le plafond si
elle choisit le second.

**Déjà tranché.** Invariants 5, 7, 11 · D55, D67, D68, D70, D85.

**À décider dans la phase.** La forme d’une variante de bloc · comment les deux
rendus sont produits, et en série ou en parallèle · comment ils sont rangés et
servis · le signal d’aiguillage, et le sort des tablettes et des robots · si
`hidden` gagne un axe de support · comment `check` prouve le contrat SEO · ce
que l’aperçu du panel montre, lui qui a déjà une bascule bureau/mobile (D96).

**Finie quand.** Un téléphone et un ordinateur reçoivent deux HTML différents à
la même adresse, et le rendu mobile contient tout le texte du rendu bureau.

---

## Phase 9 — Encadrer

**Pourquoi.** Un site livré aujourd’hui n’a pas de menu, pas de logo cliquable
et pas de pied de page. Les documents légaux de la phase 7 existent ; il leur
manque un endroit d’où être atteints depuis n’importe où.

**Ce qu’elle doit produire.** Ce qui entoure les sections d’une page : la
navigation et le pied de page, dans les deux rendus. Un site neuf doit se
naviguer sans que tu aies écrit une ligne, et l’apparence doit se remplacer par
site sans qu’une ligne du socle soit recopiée (invariant 8).

*Pistes notées : un contenu de site distinct des pages ; une implémentation par
défaut au socle, surchargée par convention comme les blocs le sont ; les
coordonnées lues depuis les faits de l’entreprise plutôt que ressaisies.*

**Enjeux.**

*Le partage socle / dépôt client est la question centrale*, et elle se pose
exactement comme pour les blocs — sauf que le chrome, lui, ne peut pas manquer.
Un site sans navigation n’est pas un site incomplet, c’est un site cassé.

*Le chrome n’est pas une page.* Il est sur toutes. Le traiter comme un fichier
de `content/` ordinaire demande une exception dans `getStaticPaths`, dans la
liste des pages du panel et dans le sitemap — trois endroits où une exception
s’oublie.

*Le panel a cinq pages, et la règle existe pour forcer l’arbitrage* (D63) : une
sixième se justifie ou se refuse, elle ne se glisse pas.

*Une partie du pied de page ne s’édite pas, elle se lit.* L’adresse, le
téléphone et les liens légaux viennent des faits de l’entreprise : les rendre
éditables au panel crée une seconde source de vérité pour les mêmes faits. Ce
que le client édite est ce qui n’est écrit nulle part ailleurs — reste à savoir
où passe la frontière.

*Le DSL n’a ni booléen, ni email, ni téléphone.* Huit types, dont aucun ne dit
oui ou non : un pied de page qui affiche ou masque une ligne n’a que `f.select`
pour rustine, et une adresse email y est un `f.text` que rien ne valide.

*Le menu en mobile est le seul endroit du site public où un script se
discuterait.* L’invariant 5 ne l’interdit pas — il exige que ce soit un choix
déclaré, bloc par bloc. Un menu qui s’ouvre sans script existe ; la phase
décide, et assume.

**Déjà tranché.** Invariants 5, 7, 8, 9 · D3, D8, D25, D28, D63.

**À décider dans la phase.** Où vivent les données du chrome et comment le
panel les expose · la frontière entre ce qui est lu et ce qui est édité · le
mécanisme de remplacement par site · la forme du menu en mobile, script ou non
· si `f.boolean`, `f.email` et `f.tel` entrent au DSL maintenant.

**Finie quand.** Un site neuf se navigue d’une page à l’autre sans taper une
URL, et ses mentions légales sont atteintes depuis n’importe quelle page, dans
les deux rendus.

---

## Phase 10 — Cadrer

**Pourquoi.** Le ratio qu’un champ déclare n’est aujourd’hui qu’une annotation
morte : rien ne l’applique, et une photo en 4/3 se dépose dans un emplacement
dessiné pour du 16/9. Et un lien partagé sur une messagerie n’affiche aucune
carte, faute d’une seule balise `og:`.

**Ce qu’elle doit produire.** Un ratio déclaré qui est réellement obtenu, avec
la main laissée au client sur ce qui reste dans le cadre. Et ce que le socle
promet depuis le début sans le tenir : carte de partage, données structurées,
sitemap, `robots.txt`, favicon, page 404, redirections.

*Pistes notées : le recadrage traité comme une ingestion, l’image stockée étant
déjà au ratio attendu ; le lien vers l’original conservé pour pouvoir
recommencer ; la carte de partage produite par la même mécanique ; les
redirections déclarées avec le site et appliquées par Caddy.*

**Enjeux.**

*Le recadrage renverse une décision.* `panel.md` acte le point focal « plutôt
qu’un outil de recadrage » : le renversement se consigne avec sa raison — le
point focal déplace un cadrage, il ne transforme pas un 4/3 en 16/9. Les deux
coexistent ensuite : même recadrée, une image est re-cadrée par le CSS d’un
support à l’autre.

*Le build ne traite aucune image, et cela ne change pas* (D40). Ce qui produit
des pixels le fait à l’entrée de l’image dans le site, jamais à la publication.
C’est ce qui garantit qu’une mise en ligne ne sature pas un petit VPS.

*Le ratio attendu doit être connu au moment où l’on cadre.* La médiathèque,
elle, ne connaît aucun ratio : c’est le champ qui le déclare. Le chemin qui
relie les deux est à trouver, et il conditionne l’écran.

*Une image sert parfois deux fois, à deux ratios.* Ce qui arrive alors — une
seconde image, un refus, un repli sur le point focal — est un choix de la
phase, mais il doit être fait consciemment : c’est le cas qui casse les
solutions simples.

*La phase 8 multiplie les ratios.* Un même champ peut vouloir du 16/9 au bureau
et du 4/5 au téléphone : le ratio cesse d’être une valeur pour devenir une
valeur par support.

*Les données structurées sortent des faits de l’entreprise, pas d’une saisie.*
Pour un artisan ou un commerce, la fiche locale — adresse, horaires, zone,
téléphone — pèse plus lourd dans le référencement que tout le reste de la phase
réuni, et les données existent depuis la phase 7.

*Les redirections sont ce qu’on oublie à chaque refonte.* Un client qui refait
son site a des adresses qui existaient : sans elles, le référencement acquis se
perd sans que rien ne le signale.

*La page 404 dépend des deux phases précédentes* : elle a besoin du chrome pour
ramener quelque part, et elle existe en deux rendus.

**Déjà tranché.** Invariants 2, 3, 5 · D12, D40 · `seo-performances.md`.

**À décider dans la phase.** Comment le ratio attendu atteint l’outil de
cadrage · ce qui advient d’une image réemployée à un autre ratio · si le
cadrage est destructif, et ce qu’on garde alors de l’original · la forme du
ratio quand il varie par support · ce que la médiathèque montre de tout cela ·
la source de la carte de partage quand aucune n’est choisie · le jeu de types
de données structurées, et le bloc `faq` qui l’attend depuis la phase 1 · le
vocabulaire de tout cela dans le panel (D25).

**Finie quand.** Une photo au mauvais ratio se cadre sans quitter l’écran, et
le lien d’une page partagé sur une messagerie affiche une carte avec son image.

---

## Phase 11 — Joindre

**Pourquoi.** Un lead écrit en base que personne ne va lire ne vaut pas mieux
qu’un lead perdu, et un artisan n’ouvre pas son panel tous les jours. Quant à
l’email, il porte à la fois les leads et les codes de connexion, et rien ne
vérifie qu’il arrive.

**Ce qu’elle doit produire.** Un message qui atteint le client par un canal
qu’il consulte réellement. Une preuve que l’email d’un site est configuré pour
arriver, et pas seulement pour partir. Et les quelques phrases qui suppriment
les appels que le panel provoque aujourd’hui.

*Pistes notées : une notification hors email — push sur le panel, ou webhook
vers une messagerie déjà consultée ; les trois enregistrements DNS vérifiés par
`doctor`, qui résout déjà du DNS ; un expéditeur mutualisé sur un sous-domaine
que tu contrôles ; un second facteur qui ne passerait plus par l’email ; une
page de remerciement à son adresse.*

**Enjeux.**

*L’email est sur le chemin critique de l’authentification.* Une notification
hors email est un confort pour les leads ; pour l’authentification, c’en est
une nécessité, et les deux n’ont pas la même exigence. Le secours existant —
`basalte admin:login` en SSH — c’est toi, à toute heure. C’est ici que se
décide si le second facteur change de nature, et donc si un site peut vraiment
fonctionner sans email.

*Toute notification poussée sur le panel demande un service worker.* Sur le
panel uniquement, jamais sur le site public (invariant 5). Et iOS ne l’accepte
que si le panel est installé sur l’écran d’accueil, ce qui fait une étape à
expliquer au client — un canal externe n’a aucune de ces contraintes, au prix
d’une dépendance de plus.

*Prouver qu’un email part n’est pas prouver qu’il arrive.* `doctor` en envoie
un vrai (D30, D93), ce qui vérifie la clé et le fournisseur. Ce que personne ne
vérifie, ce sont les enregistrements DNS du domaine, dont l’absence explique
l’essentiel des messages classés en spam.

*Un expéditeur mutualisé supprime toute configuration DNS chez le client*, au
prix d’un email qui ne part pas de son domaine — acceptable pour une
notification interne, discutable pour le reste. C’est un arbitrage, pas une
évidence.

*Le formulaire n’a pas d’adresse après l’envoi.* Il répond par un fragment que
`:target` révèle (D76) : élégant, sans script, et sans URL distincte. Donc
aucune conversion mesurable, rien à donner à un client qui paie de la
publicité, et rien à partager. Y remédier coûte un rechargement — l’arbitrage
appartient à la phase, et il peut conclure que le fragment reste.

*Ce qui n’est pas clair pour le client* tient en quatre points : la différence
entre enregistrer et mettre en ligne, ce qu’il ne peut pas faire (D3), qui
appeler quand ça casse, et que ses messages sont effacés au bout du délai de
`leads.purgeAfterMonths`, aujourd’hui invisible depuis le panel. Chacun se
règle par une phrase, sans ajouter d’écran.

**Déjà tranché.** Invariant 12 · D9, D13, D25, D30, D76, D80, D83, D93.

**À décider dans la phase.** Le ou les canaux de notification · si le second
facteur passe hors email · si l’expéditeur mutualisé devient le défaut · ce que
`doctor` fait d’un enregistrement DNS manquant, avertir ou refuser · si le
formulaire gagne une adresse après l’envoi · où chacune des quatre phrases se
pose dans le panel.

**Finie quand.** Un message atteint le client sans email. `doctor` nomme un
enregistrement DNS manquant. Et le panel dit qui appeler.

---

## Décisions que ces phases auront à acter

Ce ne sont pas des décisions prises : ce sont les questions dont la réponse
engagera le reste, et qui devront rejoindre `decisions.md` avec leur
alternative écartée. Une phase peut répondre autrement que ce que ce document
suppose — c’est même pour cela qu’elles sont listées.

| Phase | Ce qui devra être acté |
|---|---|
| 7 | Ce qu’un site peut régler, et la règle qui l’encadre : rien de ce qu’`init` choisit ne doit être irréversible |
| 7 | Si le PDF est accepté comme document légal, et sous quelle exception écrite à l’invariant 3 |
| 7 | Que les faits de l’entreprise n’ont qu’une source, et laquelle |
| 7 | Qu’un site sans mailing garde son canal d’authentification, tant que le second facteur passe par email |
| 8 | Que deux rendus sont servis selon le support, et qu’un site peut n’en avoir qu’un |
| 8 | Que le rendu mobile porte tout le contenu — contrainte externe, pas préférence |
| 10 | Ce qu’il advient du point focal, dont le cadrage renverse la décision |
| 11 | Si le second facteur cesse de dépendre de l’email |

## Vu, et pas retenu maintenant

Identifié, volontairement laissé de côté, avec ce qui le ferait revenir.

| Sujet | Ce qui le ferait revenir |
|---|---|
| **Une bibliothèque de blocs entre sites** — un bloc écrit pour le client A ne peut pas servir au client B : `src/blocks/` d’un dépôt client est un cul-de-sac | La première fois qu’un bloc est recopié d’un dépôt à l’autre. C’est le coût principal à partir du troisième site, pas du premier |
| **Le plancher d’accessibilité vérifié automatiquement** — `design.md` pose 4,5:1, 44 px et le focus visible, et `check` ne teste rien | Le banc de blocs de la phase 7 le rend visible à l’œil, ce qui suffit tant qu’il y a peu de sites. Une promesse écrite non vérifiée reste une dette |
| **Un budget de poids par page**, vérifié au build | Le jour où un bloc charge un script. Un site sans JavaScript ne dépasse pas un budget par accident |
| **Un aperçu partageable** sans compte, pour montrer au client avant mise en ligne | Le premier client qui demande à voir avant. Cela contourne l’authentification : à concevoir, pas à improviser |
| **La provenance des leads** (campagne, source) | Le premier client qui paie de la publicité |
| **Un jeu d’icônes complet** au-delà du favicon | Personne ne l’a réclamé |

## Hors périmètre, toujours

Les exclusions d’`implementation.md` tiennent : blog et collections répétées,
création de pages par le client, ajout de blocs par le client, éditeur visuel,
back-office multi-sites, commerce, rôles différenciés.

Une s’y ajoute : **un troisième rendu.** Deux supports, pas trois — une tablette
tombe d’un côté ou de l’autre, ce que la phase 8 tranche une fois.
