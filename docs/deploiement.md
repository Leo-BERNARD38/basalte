# Déploiement et exploitation

Ce document décrit ce qui tourne sur la machine. Pour la mettre en ligne, une
seule commande : `mise-en-prod.md`.

## Docker Compose

Généré par `basalte init` : application Node et Caddy. Un nouveau client se
provisionne à l'identique, chez n'importe quel hébergeur.

## Caddy

Le Caddyfile complet tient sur un écran, HTTPS compris :

```
exemple.com {
    handle /admin/* { reverse_proxy app:3000 }
    handle /api/*   { reverse_proxy app:3000 }
    handle {
        root * /srv/site/current
        file_server
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

Deux points que le panel attend de ce fichier : `X-Forwarded-For` doit être
posé — c'est la dernière entrée que le socle lit pour limiter le débit par
adresse, et sans lui tout le trafic partage un seul compteur — et la chaîne de
requête de `/admin/rescue` mérite d'être retirée des lignes journalisées, le
jeton de secours y figurant en clair (`securite.md`).

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
leads), qui est un fichier : `data/basalte.db` à la racine du dépôt du site, monté en volume, dump
quotidien. Elle n'est pas versionnée — c'est la seule donnée du site que le
dépôt ne réplique pas.

## Reprise après sinistre

`git clone` du dépôt du site, `basalte deploy --host <nouvelle ip>`,
restauration du fichier SQLite.

**La procédure de restauration est celle qu'on exécute à chaque nouveau
client**, à la sauvegarde SQLite près, donc elle est validée en permanence — à
la différence d'un document que personne ne teste jamais.
