# Déploiement et exploitation

Ce document décrit ce qui tourne sur la machine. Pour la mettre en ligne, une
seule commande : `mise-en-prod.md`.

## Docker Compose

Généré par `basalte init` : application Node et Caddy. Un nouveau client se
provisionne à l'identique, chez n'importe quel hébergeur.

Le dépôt du site est **monté** dans le conteneur de l'application, jamais copié
dans son image (D92). C'est ce qui fait que le contenu écrit par le panel, ses
commits et ses push atterrissent dans le dépôt que `deploy` met à jour — une
image qui porterait une copie les perdrait à chaque redémarrage.

L'installation et la construction du panel ont donc lieu au démarrage du
conteneur, et sont sautées tant que `package-lock.json` n'a pas changé :

```sh
stamp=.basalte/install.stamp
lock=$(sha256sum package-lock.json | cut -d " " -f 1)

if [ ! -f dist/server/entry.mjs ] || [ "$(cat "$stamp" 2>/dev/null)" != "$lock" ]; then
  npm ci
  BASALTE_MODE=panel npx astro build
  mkdir -p .basalte
  printf %s "$lock" > "$stamp"
fi

exec node dist/server/entry.mjs
```

L'image est bâtie sur `node:24-bookworm-slim` — base glibc imposée par D32 —
avec `git` et `openssh-client`, puisque le panel commite et pousse depuis ce
conteneur. `npm ci`, jamais `npm install`, et jamais `--ignore-scripts` : il
saute le `prepare` du socle sans erreur, et le paquet arrive sans `dist/`.

## Caddy

Le Caddyfile tient sur un écran, HTTPS compris — voici tout sauf le bloc
`/documents/*`, jumeau de `/media/*` à l'en-tête de pièce jointe près :

```
exemple.com {
    encode zstd gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"
        -Server
    }

    @panel path /admin /admin/* /api/* /_panel/*
    handle @panel {
        reverse_proxy app:3000
    }

    handle /media/* {
        root * /srv/site/current
        header Cache-Control "public, max-age=31536000, immutable"
        route {
            file_server {
                pass_thru
            }
            reverse_proxy app:3000
        }
    }

    handle {
        root * /srv/site/current
        @immutable path /_astro/*
        header @immutable Cache-Control "public, max-age=31536000, immutable"
        @page not path /_astro/*
        header @page Vary "User-Agent, Sec-CH-UA-Mobile"

        route {
            @exposed path /_desktop /_desktop/*
            respond @exposed 404

            @hinted {
                header Sec-CH-UA-Mobile ?0
                file {
                    try_files /_desktop{path} /_desktop{path}/index.html
                }
            }
            rewrite @hinted {file_match.relative}

            @guessed {
                header !Sec-CH-UA-Mobile
                not header_regexp User-Agent (Mobi|Android)
                file {
                    try_files /_desktop{path} /_desktop{path}/index.html
                }
            }
            rewrite @guessed {file_match.relative}

            file_server
        }
    }

    log {
        output file /var/log/caddy/access.log {
            roll_keep_for 365d
        }
        format filter {
            wrap json
            request>remote_ip ip_mask 24 48
            request>client_ip ip_mask 24 48
            request>uri query {
                delete token
            }
        }
    }
}
```

Trois raisons de le préférer à nginx :

- **Le certificat se gère seul** — obtention et renouvellement Let's Encrypt
  compris. nginx demande certbot en plus, sa configuration et son cron de
  renouvellement, dont l'échec ne se découvre que le jour où le site affiche un
  certificat expiré.
- **La configuration est quatre fois plus courte.** L'équivalent nginx fait 60
  à 80 lignes : un bloc pour rediriger le port 80, un bloc pour le 443, les
  chemins de certificats, et les en-têtes de proxy à ne pas oublier sur chaque
  `proxy_pass` — les oublier casse le proxy de façon discrète.
- **Les bons réglages sont déjà actifs** : HTTP/2, HTTP/3, compression, TLS
  moderne. Sur nginx chacun est une ligne à ajouter, donc une ligne à oublier.

Ce que nginx a de mieux — plus répandu, plus rapide en très forte charge — ne
compte pas à l'échelle de trois landing pages.

Les en-têtes de sécurité (CSP, HSTS, `X-Frame-Options`) et les logs qui
alimentent l'analytics sont configurés là.

`/srv/site` est un volume partagé entre les deux conteneurs : l'application y
écrit ses versions et y bascule le lien, Caddy sert `current`. Le chemin est
donné à l'application par `BASALTE_SITE_ROOT` (D69) ; hors production, le socle
retombe sur `.basalte/site` dans le dépôt.

Huit points que le panel attend de ce fichier.

- **`X-Forwarded-For` doit être posé** — c'est la dernière entrée que le socle
  lit pour limiter le débit par adresse, sur le panel comme sur le formulaire de
  contact. Sans lui, tout le trafic partage un seul compteur. `reverse_proxy` le
  pose de lui-même : c'est la raison pour laquelle rien ne le déclare ici.
- **`/_panel/*` va à l'application** : le panel y range ses fichiers, le site
  public garde `_astro/` (D85). Un dossier commun ferait chercher l'island du
  panel parmi les fichiers du site, et la page resterait vide sans la moindre
  erreur côté serveur.
- **Le log d'accès est en JSON, les adresses masquées à la source.** C'est lui
  que lit le rapport d'audience du panel (`services.md`), qui n'a donc jamais
  d'adresse complète entre les mains. `roll_keep_for` porte la durée de
  conservation : c'est ici que se règle la purge du troisième gisement de
  données personnelles, les deux autres étant en base.
- **Le jeton de `/admin/rescue` est retiré des lignes journalisées** par le
  filtre `query { delete token }` : il voyage dans l'URL, et un log d'accès
  conservé un an ne doit pas le porter en clair (`securite.md`).
- **`/admin` est acheminé en plus de `/admin/*`.** Un chemin Caddy est exact
  tant qu'il ne porte pas d'étoile, et `/admin/*` ne couvre donc pas `/admin` —
  c'est-à-dire l'adresse que le client tape. Sans les deux, la page d'édition
  tombe sur le serveur de fichiers et rend un 404 sans la moindre trace côté
  application. Les deux chemins passent par un matcher nommé : `handle` n'accepte
  qu'un seul motif, et lui en donner deux fait échouer l'adaptation du fichier
  **entier** — Caddy ne sert alors plus une seule requête. Pour la même raison,
  aucun bloc ne s'ouvre en fin de ligne.
- **Les deux rendus sont aiguillés ici, et nulle part ailleurs** (D105). Le site
  public est servi depuis le disque, indépendamment du panel ; confier
  l'aiguillage au processus Node ferait qu'une édition coupée couperait aussi
  les visites. Deux réécritures se relaient : `Sec-CH-UA-Mobile` tranche quand
  il est là — les navigateurs Chromium l'envoient d'eux-mêmes, dès la première
  requête — et le User-Agent à défaut, où seul le jeton `Mobi` est encore
  fiable. Tout ce qui ne se déclare pas mobile reçoit le bureau : une tablette,
  un robot à User-Agent d'ordinateur, un client qui n'envoie rien.
  `Vary: User-Agent, Sec-CH-UA-Mobile` est du protocole, pas une préférence :
  sans lui, le premier cache intermédiaire servirait le mauvais rendu au
  visiteur suivant. Il ne porte pas sur `/_astro/*`, dont les fichiers ne
  dépendent d'aucun support.
- **Le fichier ne connaît pas les capacités du site** (D106). La réécriture est
  conditionnée à l'existence de la page bureau, jamais à un réglage : un site à
  un seul rendu tombe sur son rendu mobile avec exactement le même fichier, et
  activer un second rendu après coup ne demande aucune intervention sur la
  machine. Le préfixe `_desktop/` est refusé en direct, sans quoi les deux
  rendus auraient chacun leur adresse — du contenu dupliqué aux yeux de Google.
- **Les images sortent du disque, l'application n'étant que le recours.** Un nom
  de média est dérivé d'une empreinte : ce que Caddy sert depuis `current` peut
  donc être mis en cache pour un an. `pass_thru` renvoie à l'application ce
  qu'elle seule a — un téléversement que le panel affiche avant la mise en ligne
  (D64). L'ordre compte : `route` empêche Caddy de trier le proxy avant le
  serveur de fichiers, ce qu'il ferait sans lui.

Le socle lit `/var/log/caddy/access.log` par défaut ; `BASALTE_ACCESS_LOG` le
déplace. Le fichier doit être lisible par le conteneur de l'application — un
volume partagé, comme `/srv/site`.

**Action requise sur un site créé avant les deux rendus.** Le `Caddyfile`
appartient au dépôt du client et n'est jamais régénéré par une montée de
version : il faut y reporter le bloc `handle` final ci-dessus, une fois.
`basalte check --build` le dit quand le site déclare `desktopRender` et que son
fichier n'aiguille pas.

## Dimensionnement

**2 Go de RAM par VPS.** Le pic mémoire vient du traitement des images par
sharp, désormais fait à l'ingestion et non au build (D40) : c'est donc un
téléversement, pas une mise en ligne, qui pousse la machine.

Le build de publication tourne en processus enfant plafonné à 1 Go de tas
(D67), et la file n'en laisse jamais tourner deux (D71). Ce qui reste tient
l'application, Caddy et le système.

Le build tournant sur la machine, le VPS porte aussi les dépendances de
développement du socle. L'image Docker est grosse ; c'est le prix de
l'autonomie — publier ne dépend d'aucun service tiers.

## Sauvegardes

Le contenu et les images sont **déjà répliqués hors site** à chaque
publication, puisque le dépôt est poussé sur GitHub. C'est le gros de la donnée,
sauvegardé sans rien ajouter.

Les **versions construites**, elles, ne sont pas sauvegardées et n'ont pas à
l'être : elles se reconstruisent depuis le dépôt en une commande.

Reste la base SQLite (comptes, sessions, appareils, journal, mises en ligne,
messages du formulaire), qui est un fichier : `data/basalte.db` à la racine du
dépôt du site, monté en volume. Elle n'est pas versionnée — c'est la seule
donnée du site que le dépôt ne réplique pas.

**Sa sauvegarde n'a pas de propriétaire dans le socle, et c'est assumé.** Un
cron dans le conteneur serait un composant de plus à provisionner et à
surveiller (D83), et le processus du panel n'a de mission que de purge. Ce qui
compte se perd sans elle : les sessions ouvertes et le journal. Les comptes se
recréent par `basalte admin:login --create`, et les messages du formulaire déjà
notifiés sont dans une boîte. La copier relève de l'hébergeur — un instantané de
volume — ou d'une ligne de cron posée à la main sur la machine.

## Reprise après sinistre

`git clone` du dépôt du site, `npx basalte deploy --host <nouvelle ip>`,
restauration du fichier SQLite si on en a une. La machine neuve republie
d'elle-même : aucune version n'y est servie, donc le processus construit le site
au premier appel (D88).

**La procédure de restauration est celle qu'on exécute à chaque nouveau
client**, à la sauvegarde SQLite près, donc elle est validée en permanence — à
la différence d'un document que personne ne teste jamais.
