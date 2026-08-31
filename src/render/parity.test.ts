import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { checkRenders, compareRenders } from './parity.js'
import { DESKTOP_PREFIX } from './supports.js'

const TMP = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const created: string[] = []

afterEach(async () => {
  for (const directory of created.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

/** Une page rendue, dont on ne fait varier que ce qu’on éprouve. */
function page(
  parts: {
    title?: string
    description?: string
    canonical?: string
    head?: string
    body?: string
  } = {},
): string {
  const {
    title = 'Atelier',
    description = 'Un atelier.',
    canonical = 'https://exemple.fr/',
    head = '',
    body = '<h1>Notre atelier</h1><p>Ouvert du lundi au samedi.</p>',
  } = parts

  return [
    '<!DOCTYPE html><html lang="fr"><head>',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    head,
    '</head><body>',
    body,
    '</body></html>',
  ].join('')
}

function messages(html: { mobile: string; desktop: string }): string[] {
  return compareRenders('/', html.mobile, html.desktop).map(
    (issue) => issue.message,
  )
}

describe('compareRenders', () => {
  it('ne dit rien de deux rendus qui portent le même contenu', () => {
    expect(
      messages({
        mobile: page(),
        desktop: page({
          body: '<div class="colonnes"><h1>Notre atelier</h1><p>Ouvert du lundi au samedi.</p></div>',
        }),
      }),
    ).toEqual([])
  })

  it('nomme un titre qui diffère', () => {
    const said = messages({
      mobile: page(),
      desktop: page({ title: 'Atelier — accueil' }),
    })

    expect(said).toHaveLength(1)
    expect(said[0]).toContain('Atelier — accueil')
  })

  it('signale une description et une adresse canonique qui divergent', () => {
    expect(
      messages({
        mobile: page(),
        desktop: page({
          description: 'Autre chose.',
          canonical: 'https://exemple.fr/bureau',
        }),
      }),
    ).toHaveLength(2)
  })

  it('signale un mot présent au seul bureau', () => {
    const said = messages({
      mobile: page(),
      desktop: page({
        body: '<h1>Notre atelier</h1><p>Ouvert du lundi au samedi.</p><p>Devis gratuit</p>',
      }),
    })

    expect(said).toHaveLength(1)
    expect(said[0]).toContain('devis')
    expect(said[0]).toContain('gratuit')
  })

  it('laisse passer un mot que le bureau n’affiche pas, lui', () => {
    expect(
      messages({
        mobile: page({
          body: '<h1>Notre atelier</h1><p>Ouvert du lundi au samedi.</p><p>Voir le plan</p>',
        }),
        desktop: page(),
      }),
    ).toEqual([])
  })

  it('signale un lien offert au seul bureau', () => {
    const said = messages({
      mobile: page(),
      desktop: page({
        body: '<h1>Notre atelier</h1><p>Ouvert du <a href="/horaires">lundi</a> au samedi.</p>',
      }),
    })

    expect(said).toHaveLength(1)
    expect(said[0]).toContain('/horaires')
  })

  it('signale une donnée structurée absente du mobile', () => {
    const said = messages({
      mobile: page(),
      desktop: page({
        head: '<script type="application/ld+json">{"@type":"LocalBusiness"}</script>',
      }),
    })

    expect(said).toHaveLength(1)
    expect(said[0]).toContain('LocalBusiness')
  })

  it('ne compte pour du texte ni un style ni un script', () => {
    expect(
      messages({
        mobile: page(),
        desktop: page({
          body: '<style>.colonnes{display:grid}</style><script>const inutilise = 1</script><h1>Notre atelier</h1><p>Ouvert du lundi au samedi.</p>',
        }),
      }),
    ).toEqual([])
  })
})

// Le chrome est la première chose que les deux rendus ont en commun, et le
// menu mobile est le seul endroit du site où un mot n’existe que d’un côté.
describe('le chrome dans les deux rendus', () => {
  const links = [
    '<a href="/">Accueil</a>',
    '<a href="/contact">Nous écrire</a>',
  ].join('')

  const mobile = page({
    body: `<header><details><summary>Menu</summary><nav>${links}</nav></details></header><h1>Notre atelier</h1>`,
  })

  it('ne signale pas le bouton du menu, présent au seul mobile', () => {
    const desktop = page({
      body: `<header><nav>${links}</nav></header><h1>Notre atelier</h1>`,
    })

    expect(messages({ mobile, desktop })).toEqual([])
  })

  it('signale un lien que le seul bureau porte', () => {
    const desktop = page({
      body: `<header><nav>${links}<a href="/tarifs">Tarifs</a></nav></header><h1>Notre atelier</h1>`,
    })

    expect(messages({ mobile, desktop })).toEqual([
      expect.stringContaining('« tarifs »'),
      expect.stringContaining('« /tarifs »'),
    ])
  })

  // Un nom de site rendu en image au bureau et en texte au mobile ne fait
  // perdre aucun mot au mobile — mais l’inverse en ferait perdre au bureau,
  // et rien ne le dirait. D’où la règle : le nom reste écrit des deux côtés.
  it('ne dit rien d’un logo qui double le nom écrit', () => {
    const desktop = page({
      body: `<header><a href="/"><img src="/logo.webp" alt=""><span>Atelier</span></a><nav>${links}</nav></header><h1>Notre atelier</h1>`,
    })

    expect(messages({ mobile, desktop })).toEqual([])
  })
})

describe('checkRenders', () => {
  async function build(
    pages: Readonly<Record<string, string>>,
  ): Promise<string> {
    const out = path.join(TMP, `parity-${Date.now()}-${Math.random()}`)

    created.push(out)

    for (const [file, contents] of Object.entries(pages)) {
      await mkdir(path.join(out, path.dirname(file)), { recursive: true })
      await writeFile(path.join(out, file), contents, 'utf8')
    }

    return out
  }

  it('ne coûte rien à un site qui n’a qu’un rendu', async () => {
    const out = await build({ 'index.html': page() })

    expect(await checkRenders(out)).toEqual([])
  })

  it('apparie chaque page du bureau à celle du mobile', async () => {
    const out = await build({
      'index.html': page(),
      'contact/index.html': page({ title: 'Nous écrire' }),
      [`${DESKTOP_PREFIX}/index.html`]: page(),
      [`${DESKTOP_PREFIX}/contact/index.html`]: page({ title: 'Contact' }),
    })

    const issues = await checkRenders(out)

    expect(issues).toHaveLength(1)
    expect(issues[0]?.page).toBe('/contact')
    expect(issues[0]?.severity).toBe('warning')
  })

  it('signale une page que le seul bureau porte', async () => {
    const out = await build({
      'index.html': page(),
      [`${DESKTOP_PREFIX}/index.html`]: page(),
      [`${DESKTOP_PREFIX}/tarifs/index.html`]: page({ title: 'Tarifs' }),
    })

    const issues = await checkRenders(out)

    expect(issues).toHaveLength(1)
    expect(issues[0]?.page).toBe('/tarifs')
    expect(issues[0]?.message).toContain('jamais indexée')
  })
})
