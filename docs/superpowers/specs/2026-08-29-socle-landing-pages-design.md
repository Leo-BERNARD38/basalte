# Socle technique pour landing pages éditables — Design

**Date :** 2026-08-29
**Statut :** validé en brainstorming, en attente de relecture avant implémentation

---

## 1. Contexte

Trois clients (davantage à terme) veulent une landing page qu'ils puissent
**modifier eux-mêmes** : textes, images, ordre et visibilité des sections.

La direction artistique, les blocs et la template complète de départ sont
produits en amont. Le client ne compose qu'avec ce vocabulaire.

Ce dépôt n'est pas un site : c'est le **socle** réutilisable qui permet de
produire ces sites sans tout recommencer à chaque fois.

### Vocabulaire

Trois acteurs, à ne pas confondre dans la suite du document :

- **Toi** — tu produis la DA, les blocs et la template de départ, et tu
  maintiens le socle.
- **Le client** — la personne qui édite son site via le panel. Elle ne voit
  jamais de code.
- **Le dépôt client** — le dépôt git d'un site donné. Il peut contenir des
  blocs sur mesure, écrits par toi, dans `src/blocks/`. Le client final n'y
  touche pas.

Le socle est publié sous le nom npm `@leobernard/basalte` depuis ce dépôt
(`basalte`). Dans la prose, il reste désigné par le nom commun « le socle ».

## 2. Contraintes fondatrices

| # | Contrainte | Conséquence directe |
|---|---|---|
| C1 | SEO au plus haut niveau | HTML pré-rendu, servi depuis le disque, aucun contenu injecté au runtime |
| C2 | Performances | Zéro JavaScript par défaut ; images traitées automatiquement |
| C3 | Sécurité : ne pas se faire pirater, et qu'un intrus ne puisse pas « tout modifier » | Site public sans base ni serveur applicatif ; isolation par client ; plafond de dégâts borné par construction |
| C4 | Très adapté à une utilisation avec Claude Code | Contenu en fichiers texte versionnés, schémas explicites, un seul langage, build comme test |

Ces quatre contraintes convergent vers la même architecture, ce qui est le
principal indice qu'elle est la bonne.

## 3. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  VPS du client (un par client, aucun compte partagé)        │
│                                                             │
│   Caddy ──► /srv/site/current ──► HTML statique (public)   │
│     │                                                       │
│     └────► app Node (Astro SSR)                            │
│              ├── /admin/*        panel d'édition           │
│              └── /api/contact    formulaire                │
│                                                             │
│   Dépôt git du client : contenu JSON + médias + config     │
│   SQLite : comptes, sessions, leads, journal               │
└─────────────────────────────────────────────────────────────┘
```

Le site public ne dépend **pas** du panel : couper le processus d'édition
n'interrompt pas le service.

## 4. Décisions actées

| # | Décision | Alternative écartée et raison |
|---|---|---|
| D1 | Un dépôt et un VPS par client, socle commun partagé | Multi-tenant mutualisé : inutile à cette échelle, et supprime l'isolation qui répond à C3 |
| D2 | Contenu en fichiers, panel hébergé sur le VPS du client | CMS SaaS ou base de données : ajoute une surface d'attaque et rend le contenu invisible depuis le dépôt (C4) |
| D3 | Le client édite les contenus, réordonne et masque les sections ; il n'en ajoute pas et ne crée pas de pages | Liberté totale : impose de gérer URLs, navigation et sitemap, et fragilise la DA |
| D4 | Périmètre : formulaire de contact, analytics léger, multilingue. Pas de blog | — |
| D5 | Le socle est un package installé depuis git par tag, doublé d'un CLI | Template de dépôt : les améliorations ne redescendent jamais. Registre npm privé : infra inutile à cette échelle |
| D6 | Panel d'édition maison, formulaires générés depuis les schémas | Keystatic, Sveltia, Decap : aucun ne couvre « panel authentifié sur VPS écrivant sur disque », et l'authentification reste à écrire dans tous les cas |
| D7 | TypeScript partout ; Astro pour le rendu ; React + Mantine pour le panel ; CSS natif, pas de Tailwind | Tailwind : ferait un troisième paradigme de style à côté de Mantine, pour le même résultat par un chemin plus long |
| D8 | Chaînes d'interface non éditables ; contenu traduisible imbriqué dans les champs ; structure de page partagée entre langues | Un fichier par langue : la structure s'écrit deux fois, donc elle diverge |
| D9 | Authentification : email + mot de passe généré + code à usage unique par email ; appareil de confiance 30 jours | Passkeys seules : iCloud ne sort pas de l'écosystème Apple et seuls 29 % des utilisateurs vont au bout du rattrapage par QR code |
| D10 | Enregistrer et publier sont deux actions distinctes ; preview du brouillon | Publication automatique : le client ne peut pas préparer un chantier, et chaque état intermédiaire devient public |
| D11 | Publication par bascule atomique de lien symbolique entre versions datées | Écriture en place : un build interrompu casse un site en production |
| D12 | Toute image téléversée est ré-encodée ; SVG interdit à l'upload | Conserver le fichier reçu : laisse passer les fichiers polyglottes et les charges utiles en métadonnées |
| D13 | Email via Brevo par défaut, derrière une interface agnostique | Resend : société américaine, or les leads sont des données personnelles. Postmark : meilleure délivrabilité mais 100 emails/mois gratuits |
| D14 | Analytics par analyse des logs Caddy, rapport dans le panel | GoatCounter ou Umami : ajoutent un script sur les pages ou un runtime supplémentaire sur la machine |
| D15 | Déploiement par Docker Compose | Bare metal : plus léger, mais le provisionnement diverge d'un VPS à l'autre — le défaut même que ce socle corrige |

## 5. Répartition socle / dépôt client

```
@leobernard/basalte (ce dépôt)              dépôt client (un par client)
├── intégration Astro               ├── astro.config.mjs      (4 lignes)
├── moteur de rendu de blocs        ├── site.config.ts        DA, langues, domaine
├── DSL de champs + validation      ├── src/blocks/           blocs sur mesure
├── panel d'édition complet         ├── content/*.json        éditable
├── helpers SEO                     ├── public/media/         images
├── endpoint contact + anti-spam    ├── compose.yml
├── CLI (init, check, migrate…)     └── Caddyfile
└── bibliothèque de blocs de base
```

**Règle d'or :** plus un dépôt client contient de code, moins il est
maintenable. Tout copier-coller depuis le socle vers un dépôt client crée une
divergence permanente. Un besoin non couvert se traite en ajoutant un point
d'extension au socle, jamais en le contournant localement.

La DA vit dans `site.config.ts` sous forme de tokens (couleurs, typographies,
échelles d'espacement, rayons) injectés en variables CSS. Le même bloc `hero`
a donc une allure radicalement différente d'un client à l'autre.

## 6. Distribution et mises à jour

Installation dans le dépôt client :

```json
"dependencies": { "@leobernard/basalte": "github:Leo-BERNARD38/basalte#v1.4.0" }
```

Aucun accent circonflexe nulle part. Un tag git étant mutable, le point de
figement réel est le `package-lock.json`, qui enregistre le commit résolu :
**le déploiement utilise `npm ci`, jamais `npm install`.**

Semver appliqué strictement : *patch* sans action côté client, *minor* pour un
ajout rétrocompatible, *major* quand le format de contenu change.

Mise à jour d'un site :

```bash
npm install github:Leo-BERNARD38/basalte#v1.5.0
npm run check      # valide tous les contenus contre les schémas, puis build
git commit -am "socle v1.5.0" && git push
```

`check` est le filet : une mise à jour qui casserait un contenu existant échoue
au build, pas en production. Le HTML produit étant déterministe, un diff vide
sur un patch prouve l'absence de régression.

Ordre de déploiement invariable : site de démonstration du socle → client le
moins critique → les autres. Un site figé sur une version ancienne continue de
fonctionner ; on ne met à jour que pour un correctif de sécurité, une
fonctionnalité demandée, ou à l'occasion d'une intervention.

`basalte update-all` itère sur une liste de sites, pour le cas où un correctif de
sécurité du panel doit atteindre tous les VPS rapidement.

## 7. Modèle de contenu

Une page est un fichier :

```json
{
  "$format": 1,
  "blocks": [
    {
      "id": "b1a2",
      "type": "hero",
      "hidden": { "fr": false, "en": false },
      "props": {
        "title": { "fr": "Votre projet mérite mieux", "en": "Your project deserves better" },
        "image": "/media/a3f2c1d4.jpg",
        "cta": { "label": { "fr": "Nous écrire", "en": "Get in touch" }, "href": "/contact" }
      }
    }
  ]
}
```

- **Langues imbriquées dans les champs**, pas dans les fichiers : la structure
  n'existe qu'une fois, donc elle ne peut pas diverger. Seuls les champs
  déclarés traduisibles sont dédoublés.
- **`id` stable**, jamais l'index : réordonner produit un déplacement dans le
  diff git, pas une réécriture.
- **`hidden` par langue** : masquer sans perdre le contenu, et afficher un bloc
  dans une langue seulement.
- **`$format`** en tête, pour rendre les migrations possibles.

## 8. Définition d'un bloc

```
src/blocks/hero/
├── schema.ts      ce que le bloc contient
└── Hero.astro     comment il s'affiche
```

```ts
export default block({
  name: 'hero',
  label: 'Bandeau principal',
  fields: {
    title:    f.text({ label: 'Titre', i18n: true, max: 80, required: true }),
    subtitle: f.textarea({ label: 'Sous-titre', i18n: true, max: 200 }),
    image:    f.image({ label: 'Image de fond', ratio: '16/9' }),
    cta:      f.group({ label: 'Bouton', fields: {
      label: f.text({ i18n: true, max: 30 }),
      href:  f.url(),
    }}),
  },
})
```

Ce fichier unique produit **quatre sorties** : le formulaire du panel, la
validation, le type TypeScript consommé par le composant, et l'entrée dans la
bibliothèque de blocs.

**Pourquoi un DSL `f.*` plutôt que du Zod nu :** un schéma Zod décrit une forme
de donnée, pas une interface. Il ignore le libellé d'un champ, son type
d'entrée, sa traduisibilité et son ordre d'affichage. `f.*` est une couche mince
qui émet à la fois un schéma Zod pour la validation et une description
d'interface pour le panel — une déclaration, deux sorties, aucune
désynchronisation possible.

Les contraintes (`max: 80`) ne sont pas cosmétiques : elles protègent la DA. Le
panel empêche le dépassement, et le build le refuserait.

**Le registre est une convention** : le socle scanne ses propres blocs puis
`src/blocks/*/schema.ts` du dépôt client. Rien à déclarer. C'est le levier
Claude Code du projet : créer un bloc, c'est écrire deux fichiers, sans toucher
à une configuration centrale.

**Validation.** `basalte check` s'exécute à l'enregistrement dans le panel, avant
chaque build, et en pré-commit. Il détecte un type de bloc inconnu, un champ
requis vide, un texte trop long, une image absente du disque, un format obsolète
ou un média orphelin. Une traduction manquante **avertit sans bloquer** : le
panel affiche un badge, le site sert la langue par défaut en repli.

## 9. Panel — authentification

Flux : email + mot de passe, puis code à six chiffres reçu par email.

- **Mot de passe généré** par le socle à la création du compte, modifiable
  ensuite. Minimum 12 caractères, refus des mots de passe les plus courants via
  une liste embarquée (aucun appel réseau). Hachage Argon2id.
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

Les emails d'authentification empruntent un canal distinct de ceux du
formulaire de contact, pour qu'un robot spammant le formulaire ne puisse pas
épuiser le quota qui sert à se connecter.

## 10. Panel — formulaires et médias

Le panel est **une island React unique** montée en `client:only="react"`. Astro
ne partage pas de contexte React entre islands séparées ; un arbre unique
supprime le problème, et `client:only` évite tout souci d'hydratation. Le panel
n'a besoin ni de SEO ni de rendu serveur.

Mantine fournit l'essentiel : `@mantine/form` pour l'état et la validation,
`@mantine/dropzone` pour le téléversement, des entrées correspondant une à une
aux types de champs, `@mantine/notifications` et `@mantine/modals`. Le
réordonnancement des sections utilise dnd-kit, que Mantine recommande
explicitement. Reste à écrire : le moteur qui traduit un schéma en formulaire,
et la partie serveur.

**Traitement des médias.** Rien de ce que le client envoie n'est conservé tel
quel : chaque image est **ré-encodée par sharp** avant stockage, ce qui
neutralise les fichiers polyglottes et les charges utiles en métadonnées sans
avoir à les reconnaître. Autour : taille limitée à 10 Mo, type vérifié sur les
octets réels et non sur l'extension ou le `Content-Type` annoncé, nom de fichier
dérivé de l'empreinte du contenu, EXIF supprimé (ce qui efface aussi la
géolocalisation), redimensionnement à 2560 px maximum.

**SVG interdit au téléversement** : c'est un document XML pouvant contenir du
JavaScript, donc une XSS permanente sur le site public. Les logos vectoriels
sont déposés dans le dépôt.

Les médias vivent dans `public/media/`, versionnés avec le contenu : un
`git revert` restaure texte et images ensemble. Seuil de vigilance autour de
200 Mo par site.

**Texte alternatif obligatoire** au téléversement, et traduisible. **Point
focal** réglable (transformé en `object-position`) plutôt qu'un outil de
recadrage : cela résout les visages coupés pour une fraction du travail.

La suppression d'un média encore référencé est refusée.

## 11. Pipeline de publication

```
/srv/site/
├── releases/2026-08-29T15-21-40/     nouveau build
├── releases/2026-08-29T14-03-12/     précédent, conservé
└── current -> releases/2026-08-29T15-21-40
```

Le build se construit à côté et ne devient visible qu'une fois terminé, par
changement de lien symbolique. Trois propriétés :

1. Un visiteur ne voit jamais un site à moitié reconstruit.
2. Un build en échec laisse `current` inchangé : **une publication ratée ne peut
   pas casser un site qui fonctionnait**.
3. Le retour arrière est instantané, sans rebuild.

Les cinq dernières versions sont conservées.

**File d'attente à une place** : une publication demandée pendant un build
attend ; une seconde demande remplace celle en attente. Deux builds Astro
simultanés saturent la mémoire d'un petit VPS.

**En cas d'échec**, le client voit « la publication a échoué, ton site en ligne
n'a pas changé », jamais une trace d'erreur ; l'erreur complète part par email.

**Preview** : une route `/admin/preview/…` rend le contenu non publié avec
exactement les mêmes composants Astro que le site réel.

## 12. SEO et performances

Découlent en grande partie des choix précédents plutôt que d'un effort dédié :

- HTML pré-rendu servi depuis le disque, zéro JavaScript par défaut.
  L'interactivité est **opt-in bloc par bloc**.
- Routing i18n natif d'Astro : `/` pour la langue par défaut, `/en/` ensuite,
  avec `hreflang` et sitemap couvrant toutes les langues.
- Images converties en WebP/AVIF avec `srcset` par taille d'écran.
  **Point d'attention technique :** Astro n'optimise nativement que les images
  importées dans le code, pas celles désignées par une chaîne venue d'un JSON.
  Le socle construit donc une table des médias via `import.meta.glob` pour
  rebrancher l'optimisation. C'est précisément là que la plupart des projets
  perdent leur score sans comprendre pourquoi.
- Métadonnées, Open Graph et JSON-LD générés depuis `site.config.ts` et le
  contenu ; le bloc FAQ émet un `FAQPage`.
- `robots.txt` et sitemap générés au build.

## 13. Formulaire de contact

Validation Zod côté serveur. Anti-spam **sans CAPTCHA** : champ leurre
invisible, délai minimum de remplissage, limitation par IP. Cela arrête
l'essentiel des robots sans dégrader l'expérience ni l'accessibilité, et sans
envoyer les visiteurs chez un tiers.

Les messages sont **stockés localement en plus d'être envoyés** : un incident
d'envoi ou un classement en spam ne doit pas faire perdre un lead. Ils sont
consultables dans le panel.

**RGPD par construction** : mention de consentement sur le formulaire, purge
automatique après une durée configurée (12 mois par défaut), bouton de
suppression.

## 14. Analytics

Analyse des logs d'accès Caddy, rapport affiché dans le panel. Aucun service
supplémentaire, aucune base, **aucun script sur le site public** — donc aucun
impact sur les performances et aucun bandeau cookies. Les IP sont anonymisées à
la source.

Couvre : volume de visites, provenance, pages consultées, envois de formulaire
(qui sont eux-mêmes des requêtes journalisées).

Limites assumées : comptage des visiteurs uniques approximatif, filtrage des
robots à maintenir par liste de user-agents. C'est un ordre de grandeur, pas
une mesure exacte.

## 15. Déploiement et exploitation

**Docker Compose** généré par `basalte init` : application Node et Caddy. Un
nouveau client se provisionne en une commande, à l'identique, chez n'importe
quel hébergeur.

**Dimensionnement : 2 Go de RAM par VPS.** Le pic mémoire vient du traitement
des images par sharp au build. 1 Go fonctionne en bridant la concurrence, mais
laisse peu de marge.

**Sauvegardes.** Le contenu et les images sont déjà répliqués hors site à chaque
publication, puisque le dépôt est poussé sur GitHub. Reste la base SQLite
(comptes, sessions, leads), qui est un fichier : dump quotidien.

**Reprise après sinistre = installation.** `git clone` + `basalte init` +
restauration du fichier SQLite. La procédure de restauration est celle qu'on
exécute à chaque nouveau client, donc elle est validée en permanence — à la
différence d'un document que personne ne teste jamais.

**En-têtes** via Caddy : CSP stricte, HSTS, `X-Frame-Options`. HTTPS et
renouvellement de certificats automatiques.

## 16. Sécurité — modèle de menace

Par probabilité décroissante :

| Menace | Réponse |
|---|---|
| Robots opportunistes balayant Internet | Aucun CMS connu à attaquer, aucune route standard, limitation de débit |
| Bourrage d'identifiants (mot de passe réutilisé) | Mot de passe généré, jamais choisi → jamais réutilisé ; code email en second facteur |
| Hameçonnage du client | Code email en second facteur ; notification à chaque nouvel appareil |
| Attaquant ciblé | Isolation par VPS ; plafond de dégâts borné (ci-dessous) |

**Plafond de dégâts.** Un intrus dans le panel peut modifier les textes et
images d'**un** site. Il ne peut pas atteindre les autres clients (VPS séparés,
aucun compte commun), ni injecter du code — le contenu est un format fermé
validé par schéma —, ni toucher aux composants, qui vivent dans le package. Il
ne peut pas être discret : chaque modification est un commit horodaté. Et
`git revert` restaure le site en une minute.

**Règle absolue :** jamais de HTML libre dans le contenu. Le texte est échappé
au rendu. Pour du gras et des liens, du Markdown restreint assaini au build,
jamais du HTML brut. Cette règle est ce qui rend vrai tout le paragraphe
précédent.

**Chaîne d'approvisionnement.** La seule surface commune aux VPS est ce dépôt :
2FA sur le compte, protection de branche, versions figées par lockfile,
`npm ci` au déploiement.

**Le panel est coupable à tout moment** sans interrompre le site, puisque
celui-ci est statique. En cas d'incident : couper l'édition, laisser les
visiteurs servis, enquêter.

## 17. Bibliothèque de blocs v1

À valider — c'est une décision de produit, pas d'architecture.

`hero` · `richtext` · `features` (grille 2-4) · `gallery` · `testimonials` ·
`cta` · `faq` (accordéon + JSON-LD) · `logos` · `stats` · `contact`

Plus deux éléments de site configurés hors flux de blocs : `header`
(navigation) et `footer`.

## 18. Hors périmètre

Blog et collections répétées · création de pages par le client · ajout de blocs
par le client · éditeur visuel WYSIWYG · back-office multi-sites · commerce ·
comptes multiples avec rôles différenciés (un seul niveau : éditeur).

Ces exclusions sont des choix de v1, pas des impossibilités : le modèle de
contenu les accueille sans réécriture.

## 19. Ordre d'implémentation

Chaque étape produit quelque chose de démontrable.

1. Squelette du socle : intégration Astro, `defineSite`, tokens CSS, un bloc
   `hero`, rendu statique → un premier site s'affiche.
2. DSL de champs, validation, `basalte check`.
3. Bibliothèque de blocs v1 et helpers SEO.
4. Authentification du panel — morceau critique, isolé et testable seul.
5. Panel : génération des formulaires, enregistrement, commit.
6. Médias : téléversement, traitement, médiathèque, point focal.
7. Réordonnancement, `hidden`, preview.
8. Pipeline de publication : bascule atomique, file d'attente, gestion d'échec.
9. Formulaire de contact, Brevo, stockage, purge.
10. Analytics par logs.
11. `basalte init`, Docker Compose, provisionnement.
12. Migrations et `basalte update-all`.
