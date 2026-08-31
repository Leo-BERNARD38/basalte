#!/bin/bash
# Ce qu'une session Claude Code sur le web doit trouver en arrivant.
#
# Le dépôt exige Node 24 (D33) et `.npmrc` porte `engine-strict=true` : sur une
# machine restée en Node 22, `npm ci` refuse de s'exécuter et rien ne se lance.
# Ce script installe la version qu'annonce `.nvmrc`, puis les dépendances et les
# hooks git — le rituel de clone de `docs/environnement.md`, joué tout seul.
#
# Il ne fait rien ailleurs que sur le web : la machine du mainteneur a déjà son
# Node, et un script qui s'y exécuterait à chaque session serait du bruit.
#
# `npm ci` plutôt que `npm install`, contrairement à l'usage courant d'un hook
# de démarrage : le lockfile de ce dépôt est un artefact versionné qui porte les
# binaires de deux plateformes, et `npm install` sous Linux en élaguerait ceux
# de Windows — la panne exacte que `npm run lockfile:check` surveille.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$(dirname "$(dirname "$(readlink -f "$0")")")")}"

wanted="$(tr -d '[:space:]' < .nvmrc)"

major() {
  node --version 2>/dev/null | sed 's/^v//; s/\..*//'
}

# Le PATH obtenu doit survivre au script : c'est le shell de la session qui
# lancera ensuite npm, et il ne relit pas ce qui a été exporté ici.
remember() {
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"$(dirname "$(command -v node)"):\$PATH\"" >> "$CLAUDE_ENV_FILE"
  fi
}

if [ "$(major)" != "$wanted" ]; then
  installed=""

  for candidate in "${NVM_DIR:-}" /opt/nvm "$HOME/.nvm"; do
    if [ -n "$candidate" ] && [ -s "$candidate/nvm.sh" ]; then
      export NVM_DIR="$candidate"
      # shellcheck disable=SC1091
      . "$NVM_DIR/nvm.sh"
      nvm install "$wanted" >/dev/null
      nvm use "$wanted" >/dev/null
      installed="nvm"
      break
    fi
  done

  if [ -z "$installed" ] && command -v fnm >/dev/null 2>&1; then
    fnm install "$wanted"
    eval "$(fnm env)"
    fnm use "$wanted"
    installed="fnm"
  fi

  if [ "$(major)" != "$wanted" ]; then
    echo "Node $wanted est introuvable, et aucun gestionnaire de versions (nvm, fnm) n'a pu l'installer." >&2
    echo "Node présent : $(node --version 2>/dev/null || echo 'aucun'). Le dépôt exige $wanted (.nvmrc, engines, engine-strict)." >&2
    exit 1
  fi

  echo "Node $(node --version) installé par $installed."
fi

remember

# Idempotent : sauté tant que le verrou n'a pas changé depuis la dernière pose.
stamp=".basalte/session.stamp"
lock="$(node -e "process.stdout.write(require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync('package-lock.json')).digest('hex'))")"

if [ ! -d node_modules ] || [ "$(cat "$stamp" 2>/dev/null)" != "$lock" ]; then
  npm ci
  mkdir -p .basalte
  printf %s "$lock" > "$stamp"
fi

npm run setup

echo "Prêt : npm run verify."
