// Ce qui fait tourner un site sur sa machine : deux conteneurs, un volume
// partagé, et un reverse proxy qui obtient son certificat seul.
//
// Le dépôt du site est monté dans le conteneur de l’application plutôt que
// copié dans son image : le panel écrit du contenu, commite et pousse, et ces
// écritures doivent atterrir dans le dépôt que `deploy` met à jour. Une image
// qui porterait une copie du dépôt les perdrait à chaque redémarrage.
//
// L’installation et la construction du panel ont donc lieu au démarrage du
// conteneur, et sont sautées tant que le verrou de dépendances n’a pas changé.

import {
  DESKTOP_PREFIX,
  MOBILE_HINT,
  MOBILE_HINT_FALSE,
  MOBILE_USER_AGENT,
  notFoundFile,
} from '../render/supports.js'
import type { GeneratedFile, SiteAnswers } from './files.js'

export const ENTRYPOINT = 'docker-entrypoint.sh'

/** Le chemin du dépôt dans le conteneur, et la racine servie à Caddy. */
export const APP_DIR = '/app'
export const SERVED_ROOT = '/srv/site'
export const ACCESS_LOG = '/var/log/caddy/access.log'
export const APP_PORT = 3000

export function machineFiles(answers: SiteAnswers): readonly GeneratedFile[] {
  return [
    { path: 'Dockerfile', contents: dockerfile() },
    { path: ENTRYPOINT, contents: entrypoint(), executable: true },
    { path: '.dockerignore', contents: dockerignore() },
    { path: 'compose.yml', contents: compose() },
    { path: 'Caddyfile', contents: caddyfile(answers.domain) },
  ]
}

// Base glibc : Alpine ajouterait musl comme troisième famille de binaires à
// faire coexister dans le lockfile (D32). git et le client SSH sont là parce
// que le panel commite et pousse depuis ce conteneur.
function dockerfile(): string {
  return [
    'FROM node:24-bookworm-slim',
    '',
    'RUN apt-get update \\',
    ' && apt-get install -y --no-install-recommends \\',
    '      ca-certificates git openssh-client \\',
    ' && rm -rf /var/lib/apt/lists/*',
    '',
    `WORKDIR ${APP_DIR}`,
    '',
    `COPY ${ENTRYPOINT} /usr/local/bin/basalte-start`,
    'RUN chmod +x /usr/local/bin/basalte-start',
    '',
    `EXPOSE ${APP_PORT}`,
    'CMD ["basalte-start"]',
    '',
  ].join('\n')
}

// `npm ci`, jamais `npm install` (invariant 4), et jamais `--ignore-scripts` :
// il saute le `prepare` du socle sans erreur, et le paquet arrive sans `dist/`.
function entrypoint(): string {
  return [
    '#!/bin/sh',
    'set -e',
    '',
    'stamp=.basalte/install.stamp',
    'lock=$(sha256sum package-lock.json | cut -d " " -f 1)',
    '',
    'if [ ! -f dist/server/entry.mjs ] || [ "$(cat "$stamp" 2>/dev/null)" != "$lock" ]; then',
    '  npm ci',
    '  BASALTE_MODE=panel npx astro build',
    '  mkdir -p .basalte',
    '  printf %s "$lock" > "$stamp"',
    'fi',
    '',
    'exec node dist/server/entry.mjs',
    '',
  ].join('\n')
}

function dockerignore(): string {
  return ['node_modules', 'dist', '.astro', '.basalte', '.git', ''].join('\n')
}

function compose(): string {
  return [
    'services:',
    '  app:',
    '    build: .',
    '    restart: unless-stopped',
    '    env_file: .env',
    '    environment:',
    '      HOST: 0.0.0.0',
    `      PORT: "${APP_PORT}"`,
    `      BASALTE_SITE_ROOT: ${SERVED_ROOT}`,
    `      BASALTE_ACCESS_LOG: ${ACCESS_LOG}`,
    '    volumes:',
    `      - .:${APP_DIR}`,
    `      - site:${SERVED_ROOT}`,
    '      - logs:/var/log/caddy:ro',
    '    expose:',
    `      - "${APP_PORT}"`,
    '',
    '  caddy:',
    '    image: caddy:2-alpine',
    '    restart: unless-stopped',
    '    depends_on: [app]',
    '    ports:',
    '      - "80:80"',
    '      - "443:443"',
    '      - "443:443/udp"',
    '    volumes:',
    '      - ./Caddyfile:/etc/caddy/Caddyfile:ro',
    `      - site:${SERVED_ROOT}:ro`,
    '      - logs:/var/log/caddy',
    '      - caddy-data:/data',
    '      - caddy-config:/config',
    '',
    'volumes:',
    '  site:',
    '  logs:',
    '  caddy-data:',
    '  caddy-config:',
    '',
  ].join('\n')
}

// Cinq choses que le panel attend de ce fichier : `X-Forwarded-For` posé —
// `reverse_proxy` le fait — sans quoi tout le trafic partage un seul compteur
// de débit ; `/_panel/*` servi par l’application et non depuis le disque
// (D85) ; un log JSON aux adresses masquées à la source, seule mesure
// d’audience du socle ; le jeton de `/admin/rescue`, qui voyage dans l’URL,
// retiré des lignes journalisées ; et `/admin` lui-même acheminé, ce qu’un
// motif en `/admin/*` ne fait pas — un chemin ne prend son suffixe qu’avec
// l’étoile, et l’adresse que le client tape est justement celle sans barre.
//
// Deux chemins ne s’écrivent pas sur un `handle`, qui n’accepte qu’un motif :
// ils passent par un matcher nommé. Et un bloc ne s’ouvre jamais en fin de
// ligne — Caddy refuse d’adapter le fichier entier, sans servir une seule
// requête. C’est ce que `caddy validate` dit, et ce qu’un test compare.
//
// Les images sont servies depuis le disque, avec le cache d’un nom dérivé
// d’une empreinte. L’application ne les rend que si le fichier n’est pas encore
// publié : c’est le cas d’un téléversement que le panel affiche avant la mise
// en ligne.
//
// L’aiguillage entre les deux rendus est ici, et nulle part ailleurs : le site
// public est servi depuis le disque, indépendamment du panel, et le confier au
// processus Node ferait qu’une édition coupée couperait aussi les visites
// (D105). Deux réécritures se relaient, dans cet ordre : l’indication client
// tranche quand elle est là, le User-Agent à défaut. Elles s’excluent — la
// seconde exige l’absence de l’en-tête que la première lit.
//
// Le fichier ne bifurque pas selon les capacités du site (D106). La condition
// de fichier ne réécrit que si la page bureau existe, si bien qu’un site à un
// seul rendu tombe sur son rendu mobile sans qu’une ligne change ici. C’est ce
// qui rend le second rendu activable après coup, sans toucher à la machine.
//
// La réécriture vise le fichier trouvé plutôt que son dossier : `file_server`
// ajoute la barre finale d’un dossier par une redirection, qui divulguerait le
// préfixe au navigateur. Le préfixe est d’ailleurs refusé en direct, faute de
// quoi les deux rendus auraient chacun leur adresse — du contenu dupliqué aux
// yeux de Google.
//
// Les documents suivent le même chemin, avec un en-tête de plus : ils sont
// servis en pièce jointe et ne s’affichent jamais dans une page. C’est la
// condition à laquelle un PDF échappe à l’invariant 3 (`docs/securite.md`),
// et la CSP interdit déjà de l’incruster.
//
// Ce qui ne correspond à rien tombe dans `handle_errors`, qui sert la page 404
// du site plutôt que le texte nu de Caddy — avec son statut, jamais 200 : une
// page d’erreur qui répond « tout va bien » se fait indexer. Le rendu bureau y
// est choisi comme partout ailleurs, sur l’indication client puis sur le
// User-Agent. Les deux `handle` sont exclusifs l’un de l’autre : ce qui n’est
// pas un 404 ressort en texte, sans passer par la page du site.
function caddyfile(domain: string): string {
  return [
    `${domain} {`,
    '    encode zstd gzip',
    '',
    '    header {',
    '        Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    '        X-Frame-Options "DENY"',
    '        X-Content-Type-Options "nosniff"',
    '        Referrer-Policy "strict-origin-when-cross-origin"',
    "        Content-Security-Policy \"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'\"",
    '        -Server',
    '    }',
    '',
    '    @panel path /admin /admin/* /api/* /_panel/*',
    '    handle @panel {',
    `        reverse_proxy app:${APP_PORT}`,
    '    }',
    '',
    '    handle /documents/* {',
    `        root * ${SERVED_ROOT}/current`,
    '        header Cache-Control "public, max-age=31536000, immutable"',
    '        header Content-Disposition attachment',
    '        route {',
    '            file_server {',
    '                pass_thru',
    '            }',
    `            reverse_proxy app:${APP_PORT}`,
    '        }',
    '    }',
    '',
    '    handle /media/* {',
    `        root * ${SERVED_ROOT}/current`,
    '        header Cache-Control "public, max-age=31536000, immutable"',
    '        route {',
    '            file_server {',
    '                pass_thru',
    '            }',
    `            reverse_proxy app:${APP_PORT}`,
    '        }',
    '    }',
    '',
    '    handle {',
    `        root * ${SERVED_ROOT}/current`,
    '        @immutable path /_astro/*',
    '        header @immutable Cache-Control "public, max-age=31536000, immutable"',
    '        @page not path /_astro/*',
    `        header @page Vary "User-Agent, ${MOBILE_HINT}"`,
    '',
    '        route {',
    `            @exposed path /${DESKTOP_PREFIX} /${DESKTOP_PREFIX}/*`,
    '            respond @exposed 404',
    '',
    '            @hinted {',
    `                header ${MOBILE_HINT} ${MOBILE_HINT_FALSE}`,
    '                file {',
    `                    try_files /${DESKTOP_PREFIX}{path} /${DESKTOP_PREFIX}{path}/index.html`,
    '                }',
    '            }',
    '            rewrite @hinted {file_match.relative}',
    '',
    '            @guessed {',
    `                header !${MOBILE_HINT}`,
    `                not header_regexp User-Agent (${MOBILE_USER_AGENT.source})`,
    '                file {',
    `                    try_files /${DESKTOP_PREFIX}{path} /${DESKTOP_PREFIX}{path}/index.html`,
    '                }',
    '            }',
    '            rewrite @guessed {file_match.relative}',
    '',
    '            file_server',
    '        }',
    '    }',
    '',
    '    handle_errors {',
    '        @notfound expression {err.status_code} == 404',
    '        handle @notfound {',
    `            root * ${SERVED_ROOT}/current`,
    '            route {',
    '                @desktop {',
    `                    header ${MOBILE_HINT} ${MOBILE_HINT_FALSE}`,
    '                    file {',
    `                        try_files ${notFoundFile('desktop')}`,
    '                    }',
    '                }',
    `                rewrite @desktop ${notFoundFile('desktop')}`,
    '',
    '                @guessed {',
    `                    header !${MOBILE_HINT}`,
    `                    not header_regexp User-Agent (${MOBILE_USER_AGENT.source})`,
    '                    file {',
    `                        try_files ${notFoundFile('desktop')}`,
    '                    }',
    '                }',
    `                rewrite @guessed ${notFoundFile('desktop')}`,
    '',
    `                @mobile not path ${notFoundFile('desktop')}`,
    `                rewrite @mobile ${notFoundFile('mobile')}`,
    '',
    '                file_server {',
    '                    status 404',
    '                }',
    '            }',
    '        }',
    '        handle {',
    '            respond "{err.status_code} {err.status_text}" {err.status_code}',
    '        }',
    '    }',
    '',
    '    log {',
    `        output file ${ACCESS_LOG} {`,
    '            roll_keep_for 365d',
    '        }',
    '        format filter {',
    '            wrap json',
    '            request>remote_ip ip_mask 24 48',
    '            request>client_ip ip_mask 24 48',
    '            request>uri query {',
    '                delete token',
    '            }',
    '        }',
    '    }',
    '}',
    '',
  ].join('\n')
}
