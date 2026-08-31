// La lecture des billets d’un dépôt client, et leur validation.
//
// Les billets vivent dans un **dossier** de `content/`, à côté des pages :
// `readContent` écarte déjà les dossiers, si bien qu’aucune de ses règles n’a
// eu à bouger. Le nom du fichier est le slug, et le slug est l’adresse — c’est
// la règle des pages, appliquée telle quelle.
//
// Un billet se valide contre `POST_FIELDS` par la même fonction que les
// `props` d’une section et les valeurs du chrome : c’est ce qui fait que
// `check` et le panel disent la même phrase (D60).

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { CONTENT_DIR, CONTENT_FORMAT } from '../content/page.js'
import type { Schemas } from '../content/project.js'
import type { ContentIssue } from '../content/report.js'
import { draftProgress, validateValues } from '../content/validate.js'
import type { Languages } from '../site/languages.js'
import type { DocumentManifest } from '../media/documents.js'
import type { MediaManifest } from '../media/manifest.js'
import { z } from 'zod'

import { withoutMinimums } from '../fields/define.js'
import {
  POST_FIELDS,
  type Journal,
  type Post,
  type PostFields,
} from './define.js'
import { byDate } from './page.js'

const SLUG = /^[a-z0-9][a-z0-9-]*$/

export const POST_ENVELOPE = z.object({
  $format: z.number().int(),
  hidden: z.record(z.string(), z.boolean()).default({}),
  fields: z.record(z.string(), z.unknown()).default({}),
})

export type PostFile = {
  readonly slug: string
  readonly source: unknown
}

export type JournalContent = {
  readonly posts: readonly Post[]
  readonly issues: readonly ContentIssue[]
}

export function journalDir(journal: Journal): string {
  return path.join(CONTENT_DIR, journal.base)
}

export function postFile(root: string, journal: Journal, slug: string): string {
  return path.join(root, journalDir(journal), `${slug}.json`)
}

export function postPath(journal: Journal, slug: string): string {
  return `${journalDir(journal)}/${slug}.json`.split(path.sep).join('/')
}

/** Ce que le fichier cite dans un message : « actualites/ouverture ». */
export function postName(journal: Journal, slug: string): string {
  return `${journal.base}/${slug}`
}

/**
 * Les billets bruts, dans l’ordre du disque. Le dossier peut ne pas exister :
 * un site qui déclare un journal mais n’a encore rien publié n’est pas un site
 * cassé.
 */
export async function readPostFiles(
  root: string,
  journal: Journal,
): Promise<readonly PostFile[]> {
  const directory = path.join(root, journalDir(journal))
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  )
  const files: PostFile[] = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue
    if (path.extname(entry.name) !== '.json') continue

    const slug = path.basename(entry.name, '.json')

    if (!SLUG.test(slug)) {
      throw new Error(
        `« ${journalDir(journal)}/${entry.name} » : un nom de billet s’écrit en minuscules, chiffres et tirets.`,
      )
    }

    files.push({ slug, source: await parse(directory, entry.name) })
  }

  return files
}

export type ValidatePostInput = {
  readonly journal: Journal
  readonly slug: string
  readonly source: unknown
  readonly languages: Languages
  readonly media: MediaManifest
  readonly documents: DocumentManifest
}

export function validatePost(input: ValidatePostInput): {
  readonly post?: Post
  readonly issues: readonly ContentIssue[]
} {
  const name = postName(input.journal, input.slug)
  const envelope = POST_ENVELOPE.safeParse(input.source)

  if (!envelope.success) {
    return {
      issues: envelope.error.issues.map((issue) => ({
        severity: 'error' as const,
        page: name,
        message: `structure de fichier invalide (${issue.code})`,
      })),
    }
  }

  const issues: ContentIssue[] = []
  const found = envelope.data

  if (found.$format !== CONTENT_FORMAT) {
    issues.push({
      severity: 'error',
      page: name,
      message:
        found.$format < CONTENT_FORMAT
          ? `format de contenu ${found.$format}, le socle attend ${CONTENT_FORMAT} — lance « basalte migrate »`
          : `format de contenu ${found.$format}, écrit par un socle plus récent que celui installé`,
    })
  }

  // Un billet qu’aucune langue en ligne ne montre est un brouillon : il se
  // valide sans être complet. C’est la règle des langues en préparation (D18)
  // portée sur l’axe du brouillon, et c’est ce qui permet d’écrire un billet
  // en plusieurs fois. Le rendre visible le soumet à ses bornes, et le refus
  // arrive alors au moment où le client demande qu’il paraisse.
  const draft = isDraft(found.hidden, input.languages)

  const result = validateValues({
    name,
    fields: draft ? withoutMinimums(POST_FIELDS) : POST_FIELDS,
    values: found.fields,
    languages: input.languages,
    media: input.media,
    documents: input.documents,
  })

  issues.push(...result.issues)
  issues.push(...draftProgress(name, result.progress, input.languages))

  if (issues.some((issue) => issue.severity === 'error')) return { issues }

  return {
    post: {
      $format: found.$format,
      slug: input.slug,
      hidden: found.hidden,
      fields: result.values as PostFields,
    },
    issues,
  }
}

/**
 * Les billets du dépôt, validés et rangés du plus récent au plus ancien. Un
 * site sans journal n’en a aucun : la clé absente de `site.config.ts` veut dire
 * qu’il n’y a rien à lire.
 */
export async function readJournal(
  root: string,
  schemas: Schemas,
): Promise<JournalContent> {
  const journal = schemas.site.journal

  if (journal === undefined) return { posts: [], issues: [] }

  const posts: Post[] = []
  const issues: ContentIssue[] = []

  for (const file of await readPostFiles(root, journal)) {
    const result = validatePost({
      journal,
      slug: file.slug,
      source: file.source,
      languages: schemas.site.languages,
      media: schemas.media,
      documents: schemas.documents,
    })

    issues.push(...result.issues)

    if (result.post !== undefined) posts.push(result.post)
  }

  return { posts: [...posts].sort(byDate), issues }
}

/** Vrai pour un billet qu’aucune langue en ligne ne montre. */
export function isDraft(
  hidden: Readonly<Record<string, boolean>>,
  languages: Languages,
): boolean {
  return languages.online.every((language) => hidden[language.code] === true)
}

async function parse(directory: string, name: string): Promise<unknown> {
  const raw = await readFile(path.join(directory, name), 'utf8')

  try {
    return JSON.parse(raw)
  } catch (cause) {
    throw new Error(
      `« ${name} » n’est pas un JSON valide : ${(cause as Error).message}`,
    )
  }
}
