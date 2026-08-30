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
// Les images sont servies depuis le disque, avec le cache d’un nom dérivé
// d’une empreinte. L’application ne les rend que si le fichier n’est pas encore
// publié : c’est le cas d’un téléversement que le panel affiche avant la mise
// en ligne.
//
// Les documents suivent le même chemin, avec un en-tête de plus : ils sont
// servis en pièce jointe et ne s’affichent jamais dans une page. C’est la
// condition à laquelle un PDF échappe à l’invariant 3 (`docs/securite.md`),
// et la CSP interdit déjà de l’incruster.
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
    `    handle /admin /admin/* { reverse_proxy app:${APP_PORT} }`,
    `    handle /api/*          { reverse_proxy app:${APP_PORT} }`,
    `    handle /_panel/*       { reverse_proxy app:${APP_PORT} }`,
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
    '        file_server',
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
