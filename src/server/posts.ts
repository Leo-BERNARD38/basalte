// La lecture et l’écriture des billets depuis le panel.
//
// Le fichier s’appelle `posts` et non `journal` : `journal.ts` est, dans ce
// dossier, le journal de connexion. Il est ici le voisin de `pages.ts`, dont il
// suit la mécanique.
//
// Un billet est le premier contenu que le client **crée** et **détruit**
// lui-même. Les deux gestes manquaient au socle : une page existe ou n’existe
// pas, et son jeu est fixe. Le reste ne change pas — brouillon brut à la
// lecture, refus d’un contenu invalide à l’enregistrement, commit à chaque
// écriture (D17, D60, D62).
//
// Le panel lit le brut : un billet cassé doit rester ouvrable, sinon le seul
// écran capable de le réparer est celui qui refuse de s’afficher.

import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

import { CONTENT_FORMAT } from '../content/page.js'
import type { Schemas } from '../content/project.js'
import { writeJsonFile } from '../content/write.js'
import {
  totalProgress,
  translationProgress,
  type Progress,
} from '../fields/progress.js'
import { pick } from '../fields/translate.js'
import type { Translated } from '../fields/types.js'
import {
  freeSlug,
  POST_FIELDS,
  postRoute,
  slugify,
  type Journal,
} from '../journal/define.js'
import {
  POST_ENVELOPE,
  postFile,
  postName,
  postPath,
  readPostFiles,
  validatePost,
} from '../journal/read.js'
import type { ContentIssue } from '../content/report.js'
import { blockingIssues, problemsOf, type Commit } from './pages.js'

/** Ce que le panel affiche d’un billet dans sa liste et dans son formulaire. */
export type DraftPost = {
  readonly slug: string
  readonly route: string
  /** Le titre dans la langue par défaut, ou le slug quand il manque. */
  readonly title: string
  readonly date: string
  readonly hidden: Translated<boolean>
  readonly fields: Readonly<Record<string, unknown>>
  readonly progress: readonly Progress[]
}

export type PostDraft = {
  readonly hidden: Translated<boolean>
  readonly fields: Readonly<Record<string, unknown>>
}

export type PostSave =
  | {
      readonly kind: 'saved'
      readonly post: DraftPost
      readonly commit: boolean
    }
  | {
      readonly kind: 'refused'
      readonly problems: readonly string[]
      readonly issues: readonly ContentIssue[]
    }

/**
 * Les billets tels qu’ils sont sur le disque, du plus récent au plus ancien.
 * C’est l’ordre de la liste du panel : le client vient y chercher ce qu’il a
 * écrit hier, pas ce qu’il a écrit il y a deux ans.
 */
export async function readPostDrafts(
  root: string,
  schemas: Schemas,
  journal: Journal,
): Promise<readonly DraftPost[]> {
  const drafts: DraftPost[] = []

  for (const file of await readPostFiles(root, journal)) {
    const envelope = POST_ENVELOPE.safeParse(file.source)

    if (envelope.success) {
      drafts.push(draftOf(journal, file.slug, envelope.data, schemas))
    }
  }

  return [...drafts].sort(
    (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
  )
}

export async function savePost(
  root: string,
  schemas: Schemas,
  journal: Journal,
  slug: string,
  draft: PostDraft,
  commit: Commit,
): Promise<PostSave> {
  const result = validatePost({
    journal,
    slug,
    source: {
      $format: CONTENT_FORMAT,
      hidden: draft.hidden,
      fields: draft.fields,
    },
    languages: schemas.site.languages,
    media: schemas.media,
    documents: schemas.documents,
  })

  if (result.post === undefined) {
    return {
      kind: 'refused',
      problems: problemsOf(result.issues),
      issues: blockingIssues(result.issues),
    }
  }

  const written = {
    $format: CONTENT_FORMAT,
    hidden: result.post.hidden,
    fields: result.post.fields,
  }

  // Le dossier du journal peut ne pas exister : un site qui déclare un journal
  // et n’a encore rien publié n’a rien à ranger, et c’est le premier billet
  // qui le crée.
  const file = postFile(root, journal, slug)

  await mkdir(path.dirname(file), { recursive: true })
  await writeJsonFile(file, written)

  const post = draftOf(journal, slug, written, schemas)

  return {
    kind: 'saved',
    post,
    commit: await commit(
      [postPath(journal, slug)],
      `contenu : ${postName(journal, slug)}`,
    ),
  }
}

/**
 * Un billet neuf. Le slug vient du titre et ne bougera plus : c’est le nom du
 * fichier, donc l’adresse, et corriger un titre ne doit jamais casser un lien
 * déjà partagé. Deux billets de même titre à un an d’écart obtiennent deux
 * adresses, la seconde suffixée.
 *
 * Il naît **masqué** : le client l’écrit avant qu’il paraisse, et il ne lui
 * reste qu’un interrupteur à lever quand il est prêt.
 */
export async function createPost(
  root: string,
  schemas: Schemas,
  journal: Journal,
  input: { readonly title: string; readonly date: string },
  commit: Commit,
): Promise<PostSave> {
  const languages = schemas.site.languages
  const wanted = slugify(input.title)

  if (wanted === '') {
    return {
      kind: 'refused',
      problems: [
        'Un billet a besoin d’un titre : c’est lui qui fait son adresse.',
      ],
      issues: [],
    }
  }

  const taken = new Set(
    (await readPostFiles(root, journal)).map((file) => file.slug),
  )
  const slug = freeSlug(wanted, taken)

  if (slug === undefined) {
    return {
      kind: 'refused',
      problems: [
        'Trop de billets portent déjà ce titre : donnez-lui un autre intitulé.',
      ],
      issues: [],
    }
  }

  return savePost(
    root,
    schemas,
    journal,
    slug,
    {
      hidden: Object.fromEntries(
        languages.all.map((language) => [language.code, true]),
      ),
      fields: {
        title: Object.fromEntries(
          languages.all.map((language) => [
            language.code,
            language.code === languages.default.code ? input.title : '',
          ]),
        ),
        date: input.date,
      },
    },
    commit,
  )
}

/**
 * La suppression d’un billet. Elle efface le fichier et commite son retrait :
 * `git add` d’un chemin disparu enregistre son absence, et `git revert` ramène
 * le billet comme il ramène le reste.
 */
export async function deletePost(
  root: string,
  journal: Journal,
  slug: string,
  commit: Commit,
): Promise<{ readonly commit: boolean }> {
  await rm(postFile(root, journal, slug), { force: true })

  return {
    commit: await commit(
      [postPath(journal, slug)],
      `contenu : ${postName(journal, slug)} retiré`,
    ),
  }
}

function draftOf(
  journal: Journal,
  slug: string,
  source: PostDraft,
  schemas: Schemas,
): DraftPost {
  const languages = schemas.site.languages
  const title = pick(
    source.fields['title'] as Translated<string>,
    languages.default.code,
  ).trim()

  return {
    slug,
    route: postRoute(journal, slug),
    title: title === '' ? slug : title,
    date:
      typeof source.fields['date'] === 'string' ? source.fields['date'] : '',
    hidden: source.hidden,
    fields: source.fields,
    progress: totalProgress(
      translationProgress(POST_FIELDS, source.fields, languages),
    ),
  }
}
