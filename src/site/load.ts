// Charge le `site.config.ts` d’un dépôt client. Node 24 efface les types à la
// volée, ce qui évite un compilateur au CLI comme à l’intégration Astro — mais
// pas sous `node_modules`, d’où la compilation du socle lui-même
// (docs/environnement.md).

import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { Site } from './define.js'

export const CONFIG_FILE = 'site.config.ts'

export async function loadSite(root: string): Promise<Site> {
  const file = path.join(root, CONFIG_FILE)

  if (!existsSync(file)) {
    throw new Error(`Aucun « ${CONFIG_FILE} » dans ${root}.`)
  }

  // Le fichier appartient au dépôt du client, pas au socle : son chemin ne
  // peut pas être écrit ici. Vite le signale à chaque démarrage faute de
  // pouvoir l’analyser, et ce chargement n’a jamais lieu dans un navigateur —
  // le commentaire lui dit que c’est voulu.
  const loaded: unknown = await import(
    /* @vite-ignore */ pathToFileURL(file).href
  )
  const site = (loaded as { default?: unknown }).default

  if (!isSite(site)) {
    throw new Error(
      `« ${CONFIG_FILE} » doit exporter par défaut le résultat de defineSite().`,
    )
  }

  return site
}

function isSite(value: unknown): value is Site {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<Site>

  return (
    typeof candidate.name === 'string' &&
    typeof candidate.domain === 'string' &&
    typeof candidate.languages?.default?.code === 'string' &&
    typeof candidate.tokens?.color?.bg === 'string'
  )
}
