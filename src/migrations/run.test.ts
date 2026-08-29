import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { CONTENT_DIR } from '../content/page.js'
import { pendingFrom, type Migration } from './index.js'
import { planMigrations, writeMigrations } from './run.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))

const CTA_GROUP: Migration = {
  to: 2,
  label: 'le bouton devient un groupe',
  page: (page) => ({
    ...page,
    blocks: (page['blocks'] as { props: Record<string, unknown> }[]).map(
      (block) => ({
        ...block,
        props: {
          ...block.props,
          cta: { label: block.props['cta'], href: '/contact' },
        },
      }),
    ),
  }),
}

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

async function site(format: number): Promise<string> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'migration-'))

  roots.push(root)

  await mkdir(path.join(root, CONTENT_DIR), { recursive: true })
  await writeFile(
    path.join(root, CONTENT_DIR, 'index.json'),
    JSON.stringify({
      $format: format,
      meta: {},
      blocks: [{ id: 'h1', type: 'hero', props: { cta: 'Nous écrire' } }],
    }),
    'utf8',
  )

  return root
}

async function page(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(root, CONTENT_DIR, 'index.json'), 'utf8'),
  ) as Record<string, unknown>
}

describe('choix des migrations', () => {
  it('ne retient que celles qui manquent, dans l’ordre', () => {
    const steps = [3, 1, 2].map((to) => ({ ...CTA_GROUP, to }))

    expect(pendingFrom(1, 3, steps).map((step) => step.to)).toEqual([2, 3])
    expect(pendingFrom(3, 3, steps)).toEqual([])
  })
})

describe('application', () => {
  it('transforme le contenu et met le format à jour', async () => {
    const root = await site(1)
    const plan = await planMigrations(root, [CTA_GROUP], 2)

    expect(plan.pages).toHaveLength(1)
    expect(plan.pages[0]?.labels).toEqual(['le bouton devient un groupe'])

    await writeMigrations(root, plan)

    const written = await page(root)

    expect(written['$format']).toBe(2)
    expect(
      (written['blocks'] as { props: { cta: unknown } }[])[0]?.props.cta,
    ).toEqual({ label: 'Nous écrire', href: '/contact' })
  })

  it('n’écrit rien tant que le plan n’est pas appliqué', async () => {
    const root = await site(1)

    await planMigrations(root, [CTA_GROUP], 2)

    expect((await page(root))['$format']).toBe(1)
  })

  it('ne touche pas une page déjà au format attendu', async () => {
    const root = await site(2)
    const plan = await planMigrations(root, [CTA_GROUP], 2)

    expect(plan.pages).toEqual([])
    expect(plan.ahead).toEqual([])
  })

  it('nomme sans la transformer une page venue d’un socle plus récent', async () => {
    const root = await site(9)
    const plan = await planMigrations(root, [CTA_GROUP], 2)

    expect(plan.ahead).toEqual(['index'])
    expect(plan.pages).toEqual([])
  })

  it('refuse une page sans numéro de format', async () => {
    const root = await site(1)

    await writeFile(
      path.join(root, CONTENT_DIR, 'index.json'),
      JSON.stringify({ meta: {}, blocks: [] }),
      'utf8',
    )

    await expect(planMigrations(root, [CTA_GROUP], 2)).rejects.toThrow(
      '$format',
    )
  })
})
