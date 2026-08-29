// La mise en ligne, du bouton au lien symbolique.
//
// L’ordre porte tout ce qui suit : **rebaser, construire, basculer, pousser.**
// Rebaser d’abord fait construire exactement ce qui sera poussé, et fait
// échouer le conflit — le seul échec vraiment probable — avant qu’une seconde
// de build n’ait été dépensée. Basculer avant de pousser fait que le site est
// en ligne dès qu’il est constructible, même si GitHub est indisponible.
//
// Chaque échec laisse `current` où il est (invariant 11). C’est la promesse qui
// rend le reste tenable : une publication ratée ne casse pas un site qui
// fonctionne.
//
// La file n’a qu’une place. Deux builds Astro simultanés saturent la mémoire
// d’un petit VPS ; une deuxième demande pendant un build remplace celle qui
// attend plutôt que de s’empiler.

import type { DatabaseSync } from 'node:sqlite'

import { publicationFailed } from '../server/email/messages.js'
import type { Alert } from './alert.js'
import { buildSite, type BuildResult } from './build.js'
import {
  lastPublication,
  recordPublication,
  type Publication,
  type Remote,
} from './record.js'
import {
  discardRelease,
  openRelease,
  publishRelease,
  pruneReleases,
  siteRoot,
  stampOf,
  type Environment,
} from './release.js'
import { pushToRemote, rebaseOnRemote } from './remote.js'

const REFUSED =
  'La mise en ligne a échoué. Ton site en ligne n’a pas changé, et personne d’autre que toi ne l’a vu.'

const PUBLISHED = 'Ton site est en ligne.'

const UNSAVED =
  'Ton site est en ligne. La sauvegarde à distance n’a pas abouti — le mainteneur est prévenu.'

/** Ce que le build reçoit : la racine du dépôt, et où écrire. */
export type Build = (root: string, outDir: string) => Promise<BuildResult>

export type PublishTarget = {
  readonly root: string
  readonly site: string
  readonly database: DatabaseSync
  readonly now: () => number
  readonly alert: Alert
  readonly environment?: Environment
  /**
   * Le build, injectable. En production c’est celui du processus enfant ; les
   * tests en donnent un court, ce qui laisse la file, la bascule et les échecs
   * s’éprouver sans lancer Astro.
   */
  readonly build?: Build
}

export type Requester = {
  readonly accountId?: number
  readonly email: string
}

/** Ce que le panel affiche. Aucune trace d’erreur n’y figure. */
export type PublishReport = {
  readonly at: number
  readonly outcome: 'published' | 'failed'
  readonly message: string
  readonly release?: string
}

export type PublishState = {
  readonly running: boolean
  readonly queued: boolean
  readonly last?: PublishReport
}

export type Publisher = {
  /** Demande une mise en ligne, et rend l’état obtenu sans attendre le build. */
  request(by: Requester): PublishState
  state(): PublishState
  /** Attend que la file se vide. Les tests en ont besoin ; le panel, non. */
  settled(): Promise<void>
}

export function createPublisher(target: PublishTarget): Publisher {
  let running: Promise<void> | undefined
  let waiting: Requester | undefined

  const state = (): PublishState => {
    const last = lastPublication(target.database)

    return {
      running: running !== undefined,
      queued: waiting !== undefined,
      ...(last === undefined ? {} : { last: reportOf(last) }),
    }
  }

  const pump = async (): Promise<void> => {
    while (waiting !== undefined) {
      const by = waiting

      waiting = undefined

      await runOnce(target, by)
    }

    running = undefined
  }

  return {
    request(by) {
      waiting = by
      running ??= pump()

      return state()
    },

    state,

    async settled() {
      while (running !== undefined) await running
    },
  }
}

export function reportOf(publication: Publication): PublishReport {
  return {
    at: publication.at,
    outcome: publication.outcome,
    message: messageOf(publication),
    ...(publication.release === undefined
      ? {}
      : { release: publication.release }),
  }
}

function messageOf(publication: Publication): string {
  if (publication.outcome === 'failed') return REFUSED

  return publication.remote === 'failed' ? UNSAVED : PUBLISHED
}

async function runOnce(target: PublishTarget, by: Requester): Promise<void> {
  const started = target.now()
  const serving = siteRoot(target.root, target.environment)

  const rebased = await rebaseOnRemote(target.root)

  if (rebased.kind === 'failed') {
    await refuse(
      target,
      by,
      started,
      'Le rebasage sur le dépôt distant',
      rebased.detail,
    )
    return
  }

  const opened = await openRelease(serving, stampOf(started))
  const built = await (target.build ?? buildSite)(target.root, opened.partial)

  if (built.kind === 'failed') {
    await discardRelease(opened.partial)
    await refuse(target, by, started, 'Le build du site', built.detail)
    return
  }

  try {
    await publishRelease(serving, opened)
  } catch (cause) {
    await discardRelease(opened.partial)
    await discardRelease(opened.final)
    await refuse(target, by, started, 'La bascule', (cause as Error).message)
    return
  }

  await pruneReleases(serving)

  const pushed = await pushToRemote(target.root)
  const remote: Remote = pushed.kind === 'done' ? 'pushed' : pushed.kind

  recordPublication(target.database, {
    ...by,
    at: target.now(),
    outcome: 'published',
    release: opened.name,
    remote,
    detail: pushed.kind === 'failed' ? pushed.detail : '',
    duration: target.now() - started,
  })

  // Le site est en ligne : l’échec du push est un problème de sauvegarde, pas
  // de publication. Le mainteneur l’apprend, le client lit qu’il est sorti.
  if (pushed.kind === 'failed') {
    await target.alert(
      publicationFailed(
        target.site,
        'Le push vers le dépôt distant',
        pushed.detail,
      ),
    )
  }
}

async function refuse(
  target: PublishTarget,
  by: Requester,
  started: number,
  stage: string,
  detail: string,
): Promise<void> {
  recordPublication(target.database, {
    ...by,
    at: target.now(),
    outcome: 'failed',
    remote: 'absent',
    detail,
    duration: target.now() - started,
  })

  await target.alert(publicationFailed(target.site, stage, detail))
}
