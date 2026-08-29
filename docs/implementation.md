# Implémentation

## Comment lire ce document

Ce document décrit **six phases**, pas une suite de tâches. Chacune dit
pourquoi elle existe, ce qu'elle doit produire, ce qui est en jeu, et où passe
la frontière entre ce qui est déjà tranché et ce qui lui appartient.

Le *comment* n'est pas ici, et c'est volontaire. Décider maintenant, à l'aveugle,
des détails d'une phase qu'on n'a pas commencée produit de la dette : des choix
qu'on ne peut pas encore évaluer, qu'on suivra par discipline, et qu'on paiera
plus tard. Une session entière consacrée à une phase, qui en connaît les enjeux,
décidera mieux.

**Une phase, une session.** Elle commence par lire son cahier ci-dessous et les
documents qu'il désigne. Elle finit par consigner ce qu'elle a décidé — dans le
document concerné, et dans `decisions.md` si le choix engage le reste.

## Trois niveaux d'engagement

Toute la documentation se lit à travers ces trois niveaux. Ils disent ce qu'une
phase a le droit de changer.

| Niveau | Ce que c'est | Une phase peut-elle le changer ? |
|---|---|---|
| **Invariant** | les douze règles absolues (`securite.md`) | non |
| **Décidé** | une décision numérotée (`decisions.md`) | seulement en actant la décision inverse, avec sa raison |
| **Hypothèse** | un point de départ noté pour ne pas repartir de zéro | oui, librement — en consignant ce qu'elle retient |

Les hypothèses sont signalées en italique dans les documents. Les remplacer
n'est pas un écart : c'est ce pour quoi elles sont là.

---

## Phase 1 — Rendre  ·  faite

**Ce qu'elle a retenu.** Les quatre blocs de rendu pur — `hero`, `richtext`,
`features`, `gallery` ; `faq` et `contact` attendent leurs phases. Huit types
`f.*`, dont seuls les trois qui portent de la prose acceptent `i18n`. Une carte
de langues systématique, même en monolingue (D41). Les dérivées d'images
produites à l'ingestion, pas au build (D40) — ce qui remplace le passage par
`import.meta.glob` que `seo-performances.md` prévoyait. Un Markdown restreint
écrit ici plutôt que tiré d'une dépendance (D42). Les routes par langue
produites par `getStaticPaths` (D44). Détail : D40 à D46.

**Ce qui reste ouvert.** Le sitemap, `robots.txt`, le JSON-LD et les images
Open Graph : `meta` porte le titre et la description, le reste attend un
`src/seo/`.

**Pourquoi.** Tout le reste consomme le DSL et le moteur de blocs. C'est la
seule phase dont un défaut se paie dans toutes les autres.

**Ce qu'elle produit.** Un site statique construit depuis un JSON, un bloc
`hero` qui s'affiche, `basalte check` qui valide, `basalte inventory` qui liste.
Un site de démonstration qui sert de banc d'essai à partir de là.

**Enjeux.** Le DSL doit émettre le schéma Zod *et* la description d'interface
depuis une déclaration unique — s'ils se dédoublent, ils divergeront. Le point
dur est l'i18n : l'endroit où les langues s'insèrent dans un champ conditionne
le panel, la validation et le rendu. Une erreur là se répare par une migration
de format, donc tôt et pour pas cher — d'où le site de démonstration dès
maintenant, plutôt qu'à la fin.

**Déjà tranché.** Invariants 1, 5, 7, 9, 10 · D7, D8 · D32 à D38 ·
`modele-contenu.md`, `environnement.md`. L'outillage, la compilation et le
script `prepare` sont en place : la phase démarre sur un dépôt qui s'installe,
se vérifie et se construit.

**À décider dans la phase.** La liste des types `f.*` et leur signature · la
sortie de `basalte inventory` · la résolution des images venues d'un JSON · la
forme réelle des tokens.

**Finie quand.** Le site de démonstration se construit depuis son JSON, et
`check` refuse un contenu invalide comme il accepte un contenu valide.

---

## Phase 2 — Authentifier  ·  faite

**Ce qu'elle a retenu.** `node:sqlite` plutôt qu'un pilote installé (D47), et
Argon2id par `@node-rs/argon2` aux paramètres OWASP (D48). Le code à six
chiffres est haché avec le jeton de la tentative, qui ne vit que dans le
navigateur (D49) — une base volée seule ne le retrouve pas. La limitation de
débit est un compteur en fenêtre fixe (D50). Le flux s'expose en fonctions
`Request` vers `Response`, que le panel montera sans les réécrire (D51), et le
CSRF est arrêté par deux gardes indépendantes plutôt qu'un jeton synchronisé
(D52). `admin:login --create` crée le compte plutôt qu'une dixième commande
(D53). Détail : D47 à D53, application dans `panel.md`.

**Ce qui reste ouvert.** La purge automatique du journal est écrite mais rien
ne la déclenche : elle attend la phase 5, qui pose la même purge pour les leads
et les logs Caddy. `doctor` dira si les deux canaux email partagent une clé —
phase 6.

**Pourquoi.** C'est le seul endroit du projet où un bug se traduit par une
intrusion. C'est aussi le seul morceau réellement isolable : il ne dépend de
rien de la phase 1, et se teste seul.

**Ce qu'elle produit.** Le flux complet — mot de passe, code, appareil de
confiance, sessions, journal — et `basalte admin:login`.

**Enjeux.** Trois pièges connus, tous documentés : code lié à la tentative de
connexion et non au compte, mot de passe jamais transmis par email, canal email
distinct de celui du formulaire. Le reste est du travail standard, mais il ne se
rattrape pas après coup : réécrire l'authentification plus tard, c'est réécrire
le panel avec.

**Déjà tranché.** Invariant 12 · D9 · `panel.md`, section Authentification.

**Finie quand.** Les tests couvrent le flux entier, rejeu d'un code et
expiration compris.

---

## Phase 3 — Éditer

**Pourquoi.** C'est le produit, tel que le client le voit. Tout le reste lui est
invisible.

**Ce qu'elle produit.** Le panel : formulaires générés depuis les schémas,
enregistrement, médias, réordonnancement, `hidden`, langues en préparation,
preview.

**Enjeux.** C'est la phase où la complexité s'accumule sans qu'on la voie. Deux
dettes guettent. La première : un moteur de formulaires qui traite les types de
champs un par un au lieu d'être piloté par le DSL — chaque nouveau type coûte
alors une modification du panel, et le levier de la phase 1 est perdu. La
seconde : une interface qui gagne un écran à chaque besoin. La contrainte de six
pages existe pour forcer l'arbitrage, pas pour l'interdire.

**Déjà tranché.** Invariant 6 · D3, D10, D25 · `panel.md`.

**À décider dans la phase.** La couche de composants · la forme de l'état · le
dialogue panel ↔ serveur · la médiathèque · le découpage réel des écrans.

**Finie quand.** Un client édite sa page de bout en bout sans toi.

---

## Phase 4 — Publier

**Pourquoi.** Elle porte la promesse qui rend le reste tenable : une publication
ratée ne casse pas un site qui fonctionne.

**Ce qu'elle produit.** Build, bascule atomique, file d'attente, push, gestion
d'échec.

**Enjeux.** Tout se joue sur ce qui arrive quand ça rate — un build interrompu,
un conflit git, un VPS à court de mémoire. Le chemin nominal est court à écrire ;
les chemins d'échec sont la phase. Deux endroits coûtent du temps si on les
découvre tard : le cache d'images d'Astro et le conflit avec tes propres
modifications.

**Déjà tranché.** Invariant 11 · D11, D17 · `publication.md`.

**À décider dans la phase.** Comment le build est lancé depuis le processus du
panel · la limite mémoire · la conservation des releases · la remontée des
erreurs.

**Finie quand.** Un build volontairement cassé laisse le site en ligne intact,
et le client lit un message qui ne l'inquiète pas.

---

## Phase 5 — Servir

**Pourquoi.** Un formulaire qui perd un lead coûte plus cher que tout le reste
du site réuni.

**Ce qu'elle produit.** Formulaire de contact, anti-spam, envoi d'email,
stockage local, purge, analytics par logs.

**Enjeux.** L'interface `EmailProvider` doit être posée avant la première
implémentation, sinon le socle est marié à Brevo sans qu'on l'ait décidé.
L'analytics par logs est, assumé, le morceau le plus approximatif du projet :
c'est un ordre de grandeur, et il ne mérite pas trois jours.

**Déjà tranché.** D4, D13, D14 · `services.md`.

**À décider dans la phase.** Le stockage des leads · le réglage de l'anti-spam ·
le format de log et son analyse.

**Finie quand.** Un lead arrive par email *et* se retrouve dans le panel — même
quand l'envoi échoue.

---

## Phase 6 — Livrer

**Pourquoi.** C'est ce qui sépare un socle d'un site. Sans elle, tu as fait un
site pour un client.

**Ce qu'elle produit.** `basalte init` et le paquet Claude Code du dépôt client,
`deploy`, `doctor`, `update`, les migrations, `update-all`.

**Enjeux.** Cette phase décide si tu gagnes du temps sur le deuxième et le
troisième client. Deux morceaux à ne pas bâcler : le générateur de
`.claude/basalte.md`, qui rend la doc agent vraie en permanence, et `doctor`,
qui remplace un guide de provisionnement. Tout ce qui est bâclé ici se paie à
chaque nouveau site.

**Déjà tranché.** Invariant 8 · D5, D16, D23, D26, D27, D29, D30 ·
`depot-client.md`, `mise-en-prod.md`, `mise-a-jour.md`.

**À décider dans la phase.** Le contenu exact du paquet Claude Code · la forme
du `CLAUDE.md` généré · le mécanisme des migrations · le second déclencheur de
déploiement.

**Finie quand.** Un nouveau client est en ligne en deux commandes, sans que tu
ouvres un guide.

---

## Ordre

L'ordre ci-dessus est celui des dépendances : chaque phase s'appuie sur les
précédentes.

Le choix laissé ouvert en fin de phase 1 — avancer la phase 6 pour mettre un
site en ligne édité par git, ou suivre la numérotation — est tranché : on suit
la numérotation (D54). Rien n'est donc utilisable par un client avant la phase
4, et le premier site sortira complet.

**Prochaine phase : la 3, éditer.**

## Tests

Deux endroits, écrits en même temps que le code qu'ils couvrent :

- **l'authentification** (phase 2) — le seul endroit où un bug devient une
  intrusion
- **le DSL de champs** (phase 1) — tout le reste en dépend

Le flux d'authentification se teste de bout en bout sans serveur : une base en
mémoire, une horloge qu'on avance à la main, un canal email qui retient au lieu
d'envoyer (`src/server/auth.fixture.ts`). C'est ce qui rend éprouvables les
expirations, les rejeux et les verrouillages, qui sinon demanderaient d'attendre
sept jours.

Le reste est couvert par `basalte check` sur le site de démonstration et par le
diff du HTML produit : sur un correctif, un diff vide prouve l'absence de
régression.

`basalte check` **n'est pas un test d'intégration** : il valide des contenus
contre des schémas. Il ne touche ni à l'authentification, ni au traitement
d'images, ni à la bascule atomique.

## Blocs de référence

Les blocs livrés par le socle ne sont pas un catalogue de sections — chaque
client aura les siennes, sur mesure. Ce sont des **exemples de référence**,
choisis pour la mécanique que chacun démontre (D19).

Livrés en phase 1 : `hero` (texte traduisible, image, point focal, bouton) ·
`richtext` (Markdown restreint) · `features` (liste répétable) · `gallery`
(plusieurs images, `srcset`). Restent à écrire avec la phase qui leur donne
leur mécanique : `faq` (JS opt-in, JSON-LD) et `contact` (endpoint serveur).

Le critère, lui, tient : un bloc de référence gagne sa place s'il démontre une
mécanique qu'aucun autre ne montre. `testimonials`, `logos` ou `stats` sont des
`features` habillés autrement — ils relèvent du sur-mesure client.

Plus deux éléments configurés hors flux de blocs : `header` et `footer`.

## Hors périmètre

Blog et collections répétées · création de pages par le client · ajout de blocs
par le client · éditeur visuel WYSIWYG · back-office multi-sites · commerce ·
comptes multiples avec rôles différenciés (un seul niveau : éditeur).

Ces exclusions sont des choix de v1, pas des impossibilités : le modèle de
contenu les accueille sans réécriture.

## Points ouverts

Ceux qui ne relèvent d'aucune phase en particulier.

| Sujet | Question |
|---|---|
| Portée de la règle des tokens | `basalte check` refuse les valeurs de style en dur dans un bloc. Faut-il l'étendre aux composants du panel ? |
| Purge des données personnelles | Le journal, les leads et les logs Caddy partagent une durée. Qui la déclenche sur la machine — le panel, un cron du conteneur ? Phase 5 |
