# basalte

Socle technique pour landing pages éditables par leurs propriétaires. Le site
public est statique ; l'édition passe par un panel hébergé à côté.

## Nouveau site — une commande

```bash
npx github:Leo-BERNARD38/basalte init mon-client
```

Génère le dépôt complet, installe le socle, fait le premier commit. Trois
questions : le nom affiché, le domaine, les langues. Rien d'autre à installer.

```bash
cd mon-client
npm run dev
```

Le dépôt généré embarque son propre paquet Claude Code : `CLAUDE.md`,
l'inventaire des blocs disponibles, et les skills pour créer un bloc, régler
la DA, rédiger le contenu et monter le socle de version. Voir
`docs/depot-client.md`.

## Mettre un site en ligne

Deux gestes manuels — commander le VPS, faire pointer le domaine — puis :

```bash
npm run deploy -- --host 51.75.12.34
```

Installe Docker, clone, démarre, obtient le certificat, construit, crée le
compte du client. La même commande relancée met la machine à jour. Il n'y a pas
de guide : `npm run doctor` prouve que tout fonctionne, email et DNS compris.
Détail dans `docs/mise-en-prod.md`.

## Mettre à jour un site — une commande

Depuis le dépôt du client :

```bash
npm run update
```

Récupère la dernière version du socle, applique les migrations de contenu si le
format a changé, valide, construit, commit.

**Si une seule étape échoue, tout est annulé** et le dépôt revient à l'état
d'avant. Détail et mise à jour assistée : `docs/mise-a-jour.md`.

## Les deux dépôts

| | Contient | Qui y touche |
|---|---|---|
| **basalte** (ici) | tout le code : rendu, panel, CLI, blocs de référence | toi |
| **dépôt client** | config, contenu JSON, images, blocs sur mesure | toi, et le client via le panel |

Le dépôt client ne contient **aucun code du socle**. Il en déclare une version :

```json
"@leobernard/basalte": "github:Leo-BERNARD38/basalte#v1.4.0"
```

C'est un package installé, pas un template copié : un correctif publié ici
atteint tous les sites en changeant un numéro. Voir `docs/architecture.md`.

## Commandes

| Commande | Effet |
|---|---|
| `basalte init <nom>` | génère un dépôt client complet |
| `basalte check [--build]` | valide les contenus contre les schémas, et construit sous `--build` |
| `basalte inventory [--json\|--agent]` | liste blocs et champs, ou régénère la doc agent |
| `basalte update` | monte ce site de version, ou annule tout |
| `basalte deploy --host <ip>` | provisionne le VPS, ou le met à jour |
| `basalte doctor` | prouve que la configuration fonctionne |
| `basalte migrate` | applique les migrations de format |
| `basalte admin:login --user <email>` | lien de connexion de secours (SSH) |
| `basalte update-all <liste>` | monte de version plusieurs sites |

## Documentation

`docs/README.md` est l'index. Pour comprendre le projet en cinq minutes :
`docs/contexte.md` puis `docs/architecture.md`. Pour écrire du code ici :
`docs/conventions.md`. Pour savoir ce que contient un dépôt client :
`docs/depot-client.md`.

## Statut

Les six phases d'implémentation sont faites : rendu, authentification, panel,
mise en ligne, formulaire de contact, et livraison. Un nouveau site se crée, se
met en production et se monte de version en une commande chacune.

Ce qui reste est nommé : `src/seo/` — sitemap, `robots.txt`, JSON-LD, images
Open Graph — et le bloc `faq` qui l'attend. Détail dans
`docs/implementation.md`.
