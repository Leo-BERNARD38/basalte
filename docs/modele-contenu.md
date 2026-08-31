# Modèle de contenu

## Une page est un fichier

```json
{
  "$format": 1,
  "meta": {
    "title": { "fr": "Atelier Duvallon", "en": "Duvallon Workshop" },
    "description": { "fr": "Menuiserie sur mesure.", "en": "Bespoke joinery." },
    "image": "a3f2c1d4b5e6f708"
  },
  "blocks": [
    {
      "id": "b1a2",
      "type": "hero",
      "hidden": { "fr": false, "en": false },
      "props": {
        "title": { "fr": "Votre projet mérite mieux", "en": "Your project deserves better" },
        "image": "a3f2c1d4b5e6f708",
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
- **`meta`** porte le titre, la description et l'image de partage de la page.
  Ce sont des contenus comme les autres : ils passent par le même DSL, donc par
  la même validation et le même formulaire. **Titre et description sont requis**
  dans chaque langue en ligne (D138) : ce sont les deux lignes que les moteurs
  affichent, et une page sans description en laisse le choix au moteur.
  L'image, elle, est facultative et déclare le `1200/630` qu'attendent les
  messageries ; vide, la carte reprend la première image de la page (D124).
- **Le nom du fichier donne la route** : `index.json` sert `/`, `contact.json`
  sert `/contact`. Le client ne crée pas de pages (D3), le jeu est donc fixe.
- **Une valeur d'image est une clé de la médiathèque**, pas un chemin : le
  rendu y trouve les largeurs disponibles, le texte alternatif et le point
  focal (`panel.md` pour le manifeste, D40 pour la raison). Une image recadrée
  est une clé de plus, dérivée de l'originale (D117) : le contenu ne porte
  toujours qu'une chaîne, et le recadrage n'a demandé aucune migration.
- **Un champ image peut déclarer un `ratio`**, et il est alors réellement
  obtenu : le panel ne laisse employer qu'une image à ce format, en la
  recadrant si besoin, et `basalte check` avertit d'un contenu écrit à la main
  qui y échapperait (`seo-performances.md`).
- **La carte de langues est toujours là**, même sur un site à une seule langue
  (D41). Ce que le client voit n'en dépend pas : le panel n'affiche un
  sélecteur que s'il y a plusieurs langues.
- **Un champ absent vaut vide** (D43). Un contenu écrit à la main n'a donc pas
  à porter chaque clé, et le rendu n'a jamais à tester une absence. Le panel,
  lui, réécrit toutes les clés déclarées (D61) : le diff d'un enregistrement ne
  dépend pas de ce qui avait été chargé.
- **La première section visible porte le `h1`** de la page, les suivantes
  ouvrent en `h2` (D115). Le rang vient de la place, jamais du type de
  section : la même section `richtext` rend un `h1` en tête de page légale et
  un `h2` plus bas. Ses titres `##` (D99) tombent alors au bon niveau.
  `basalte check --build` avertit d'une page sans titre principal — le titre
  d'une section est facultatif, et son absence est invisible à l'œil.

## La fiche d'entreprise n'est pas une page non plus

`content/business.json` porte ce que les moteurs de recherche affichent du
client : raison sociale, type d'activité, adresse, téléphone, horaires, zone
desservie. C'est la seule source structurée de ces faits (D120), et rien de ce
qu'elle porte ne s'affiche sur le site.

```json
{
  "$format": 1,
  "facts": {
    "legalName": "Atelier Duvallon SARL",
    "kind": "HomeAndConstructionBusiness",
    "address": { "street": "12 rue des Copeaux", "postalCode": "38000", "city": "Grenoble", "country": "France" },
    "phone": "+33 4 76 00 00 00",
    "hours": [{ "day": "Monday", "opens": "09:00", "closes": "18:00" }]
  }
}
```

Elle suit le chrome en tout : un manifeste que `readContent` écarte, un
`$format` que les migrations traversent, un fichier qui peut manquer — le site
n'émet alors aucune donnée structurée locale —, et une entrée du sélecteur de
page plutôt qu'un sixième écran (D63). Ses champs vivent à côté de leur seul
consommateur, dans `src/seo/business.ts`.

## Le chrome n'est pas une page

L'en-tête et le pied de page sont sur **toutes** les pages. Les traiter comme
un fichier de `content/` ordinaire aurait demandé une exception dans
`getStaticPaths`, une dans la liste du panel et une dans le sitemap — trois
endroits où une exception s'oublie. Ils vivent donc dans un manifeste, à côté
de `media.json` et `documents.json` (D110) :

```json
{
  "$format": 1,
  "header": {
    "logo": "",
    "links": [{ "label": { "fr": "Accueil" }, "href": "/" }],
    "menuLabel": { "fr": "Menu" }
  },
  "footer": {
    "links": [{ "label": { "fr": "Mentions légales" }, "href": "/mentions-legales" }]
  }
}
```

- **Le fichier peut manquer.** Les emplacements valent alors leurs valeurs par
  défaut, et le menu reprend les pages du site, nommées par leur fichier
  (D112). C'est ce qui fait qu'un site plus ancien que la phase 9 se navigue
  dès sa montée de version, sans qu'aucune migration ait à créer un fichier.
- **Le pied de page, lui, ne devine rien** : des liens légaux ne se déduisent
  pas d'une liste de fichiers.
- **Un lien interne s'écrit sans préfixe de langue** — `/contact` — et le gagne
  au rendu, par la même fonction que `getStaticPaths`. `basalte check` avertit
  d'un chemin qui ne mène à aucune page, sans jamais refuser : un lien vers une
  page à venir n'est pas une panne.
- **`$format` y est, et les migrations le traversent** (D111). Le chrome porte
  du contenu validé contre des schémas : il dérivera comme une page, et une
  migration peut le transformer par un `chrome` optionnel à côté de son `page`.
- **Deux emplacements, pas trois.** Le client n'en ajoute pas, ne les
  réordonne pas et ne les masque pas : `hidden` n'a d'axe que la langue (D107).

Le socle en fournit un. Un dépôt client le redessine en écrivant
`src/chrome/header/` ou `src/chrome/footer/` chez lui — mêmes deux fichiers
qu'un bloc, plus la variante `.desktop.astro`. Le dossier du site **remplace**
celui du socle, emplacement par emplacement (D109) : redessiner l'en-tête
laisse le pied de page du socle en place. C'est la règle inverse de celle des
blocs, où deux dossiers de même nom sont une erreur — le chrome ne peut pas
manquer.

## Un bloc est un dossier, deux fichiers

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

Le composant reçoit les valeurs validées de ces champs, plus ce qu'une section
ne peut pas contenir : la langue rendue, le rang de son titre (`heading`, décidé
par la page — D115), deux résolveurs pour les médias et les documents, et **la
fiche de l'entreprise**. Cette dernière est ce qui permet à un bloc d'afficher
une adresse, un téléphone ou des horaires sans les redemander en champs : ils
sont saisis une seule fois, dans la fiche, et `contact-details` les lit là
(D149).

Un bloc peut aussi porter ses propres libellés d'interface — le bloc `contact`
le fait pour ses champs et ses trois réponses au visiteur. Ce sont des champs
comme les autres, vides par défaut, et le composant retombe alors sur le
français (D82) : le socle ne porte aucune table de traductions, et une langue
non prévue se remplit depuis le panel.

### Un troisième fichier, facultatif : la variante bureau

```
src/blocks/hero/
├── schema.ts            ce que le bloc contient
├── Hero.astro           comment il s'affiche
└── Hero.desktop.astro   comment il s'affiche au bureau, si on l'écrit
```

`Hero.astro` **est** le rendu mobile : c'est celui qui existe toujours, et
c'est lui qu'un bloc sans variante sert aux deux supports. `Hero.desktop.astro`
reçoit exactement les mêmes props et se découvre par son nom, comme le reste —
rien à déclarer (D104). Un bloc écrit avant la phase 8 continue donc de
fonctionner sans être touché.

Une variante n'est servie que si le site déclare `desktopRender` dans ses
capacités (`site.config.ts`). Sinon elle n'est ni construite, ni chargée.

**Ce qu'une variante n'a pas le droit de faire : montrer ce que le mobile ne
montre pas.** Google indexe avec son robot smartphone : un texte, un lien ou une
métadonnée présent au seul bureau ne sera jamais vu. `basalte check --build` le
compare et le nomme, et une mise en ligne qui rompt le contrat sort quand même,
en prévenant le mainteneur (D108).

Une variante ne masque pas non plus une section : `hidden` se règle par langue,
jamais par support (D107). Ce qui ne doit pas paraître au bureau relève de la
présentation, donc de la variante elle-même.

## Pourquoi un DSL `f.*` plutôt que du Zod nu

Un schéma Zod décrit une forme de donnée, pas une interface. Il ignore le
libellé d'un champ, son type d'entrée, sa traduisibilité et son ordre
d'affichage. `f.*` est une couche mince qui émet à la fois un schéma Zod pour
la validation et une description d'interface pour le panel — une déclaration,
deux sorties, aucune désynchronisation possible.

Les contraintes (`max: 80`) ne sont pas cosmétiques : elles protègent la DA. Le
panel empêche le dépassement, et le build le refuserait. **Les renseigner
systématiquement.**

Un bloc ne valide jamais rien à la main : si une vérification manque, elle
s'ajoute à `f.*`. Voir `conventions.md`.

Les types disponibles et leur signature exacte sortent du code :

```bash
basalte inventory
```

Neuf à ce jour — `text`, `textarea`, `richtext`, `image`, `document`, `url`,
`select`, `group`, `list`. Seule la prose se traduit : `i18n` existe sur
`text`, `textarea` et `richtext`, jamais sur une clé de média, une URL ou une
valeur de liste déroulante, et jamais sur un groupe ou une liste — leur
structure est partagée entre les langues (D8).

`f.richtext` accepte du **Markdown restreint** : gras, italique, liens. Le
socle échappe le texte entier avant d'y réintroduire ces trois formes, et
vérifie le schéma de chaque URL. Aucune balise ne peut donc venir du contenu
(invariant 1, D42).

**La grammaire s'élargit champ par champ**, jamais globalement :
`f.richtext({ headings: true, lists: true })` ajoute les titres `##` et `###`
— rendus en `h2` et `h3` — et les listes à puces et numérotées. Le moteur ne
change pas : échappement complet, puis liste blanche. Un `#` seul reste du
texte, le `h1` d'une page étant le sien.

Sans ces drapeaux, un `##` posé dans un corps de section s'affiche tel quel.
C'est voulu : une section porte déjà son titre, et un client qui découvre le
Markdown ne doit pas pouvoir casser la hiérarchie des titres depuis un champ
qui ne l'attend pas. Le bloc `richtext` les déclare tous les deux — c'est lui
qui porte un document légal ; la mention de consentement du bloc `contact`, qui
n'a besoin que d'un lien, garde la grammaire minimale.

`f.document` porte une clé de document — un PDF, servi en téléchargement et
jamais rendu dans une page. Ce que le socle en sait vit dans
`content/documents.json`, à côté de `content/media.json` : le nom d'affichage
et le poids. Les conditions auxquelles un PDF est accepté sont dans
`securite.md`, et un site qui ne déclare pas la capacité `documents` le refuse.

Un lien — dans `f.url` comme dans `f.richtext` — s'écrit `http://`, `https://`,
`mailto:`, `tel:`, `#ancre` ou `/chemin`. **Une seule barre :** `//hote` est
une adresse absolue vers un autre site sous les dehors d'un chemin interne.

## Le registre est une convention

Le socle scanne ses propres blocs puis `src/blocks/*/schema.ts` du dépôt
client, et relève au passage les variantes bureau. Rien à déclarer, aucun
registre central à éditer. Le chrome passe par le même scanner, sur
`src/chrome/`, à la règle de doublon près.

C'est le levier Claude Code du projet : créer un bloc, c'est écrire deux
fichiers, sans toucher à une configuration centrale et sans risque d'oublier un
branchement.

## Langues

Elles se déclarent dans `site.config.ts` :

```ts
languages: {
  fr: { default: true },
  en: { draft: true },     // en préparation, pas encore en ligne
}
```

**Un site à une seule langue ne voit jamais le multilingue** : aucun champ
n'est dédoublé, et le panel n'affiche aucun sélecteur. Le client ignore que la
fonction existe.

**Une langue en ligne exige toutes ses traductions.** Un champ `i18n: true`
laissé vide dans une langue en ligne fait échouer `basalte check`.

**Une langue en préparation ne bloque rien** : elle n'est pas construite, elle
n'empêche aucune publication, et le panel affiche son avancement (« anglais :
12 champs sur 40 »). Le client retire `draft` quand elle est complète.

Sans cet état intermédiaire, ajouter une langue à un site existant le rendrait
invalide d'un seul coup, et le client ne pourrait plus rien publier tant qu'il
n'aurait pas tout traduit.

**Masquer par langue** fonctionne au niveau du bloc (`hidden`) et au niveau de
la page. Une page absente d'une langue ne figure ni dans le sitemap de cette
langue, ni dans ses `hreflang`.

## Migrations de format

Les migrations vivent **dans le socle**, jamais dans un dépôt client :

```
src/migrations/index.ts    { to: 2, label: 'le bouton devient un groupe', page, chrome?, business? }
```

`page` transforme chaque fichier de page ; `chrome` et `business`, facultatifs,
transforment `content/chrome.json` et `content/business.json`. Sans eux, les
deux fichiers sont simplement renumérotés — ce qui garde tous les formats en
phase, et évite un `$format` que `migrate` n'atteindrait jamais (D111).

La liste est écrite à la main plutôt que découverte sur le disque : l'ordre est
ce qui donne son sens à une suite de migrations, et un dossier parcouru le
confierait à un tri de noms de fichiers. Elle vit sous `src/` parce qu'une
migration hors de `src/` n'arriverait jamais compilée chez le client — Node
refuse d'effacer les types sous `node_modules` (D87).

Chacune transforme le JSON brut d'une page d'un format vers le suivant — brut,
parce qu'elle travaille justement sur une forme que le socle installé ne sait
plus lire. Elles arrivent chez le client avec `npm install` — il n'y a rien de
plus à brancher.

`basalte migrate` lit le `$format` de chaque fichier, applique dans l'ordre
celles qui manquent, met à jour le numéro et commit — `--dry-run` dit ce qui
changerait sans rien écrire. Une page écrite par un socle **plus récent** que
celui installé est nommée et laissée intacte : la migrer à l'envers perdrait ce
qu'elle porte. `basalte check` refuse de construire un contenu en retard de
format, avec un message qui nomme la commande à lancer.

Le résultat étant un commit, `git revert` annule une migration comme le reste.
`npm run update` les enchaîne automatiquement, et annule tout en cas d'échec —
voir `mise-a-jour.md`.

## Validation

`basalte check` s'exécute à l'enregistrement dans le panel, avant chaque build,
et en pré-commit dans un dépôt client — le hook y est posé par `basalte init`.
Le dépôt du socle, lui, a les siens (`environnement.md`). Il détecte :

- un type de bloc inconnu
- un champ requis vide
- une traduction manquante dans une langue **en ligne**
- un texte dépassant sa contrainte
- une image absente du disque
- un format de contenu obsolète
- un média orphelin
- une valeur de style en dur dans un bloc (`design.md`)

Dans une langue **en préparation**, une traduction manquante avertit sans
bloquer : le panel affiche l'avancement, page par page.

Les mêmes règles s'appliquent à l'enregistrement depuis le panel, qui refuse un
contenu invalide (D60) et rend les mêmes phrases.
