import { describe, expect, it } from 'vitest'

import { defineSite } from '../site/define.js'
import {
  DESKTOP_PREFIX,
  notFoundFile,
  notFoundRoute,
  slugIn,
  supportFor,
  supportOfPath,
  supportsOf,
  SUPPORTS,
} from './supports.js'

function site(desktopRender: boolean) {
  return defineSite({
    name: 'Essai',
    domain: 'essai.test',
    languages: { fr: { default: true } },
    capabilities: { desktopRender },
  })
}

function headers(entries: Readonly<Record<string, string>>): Headers {
  return new Headers(entries)
}

describe('supportsOf', () => {
  it('ne construit que le mobile quand la capacité est absente', () => {
    expect(supportsOf(site(false))).toEqual(['mobile'])
  })

  it('construit les deux supports quand elle est déclarée', () => {
    expect(supportsOf(site(true))).toEqual([...SUPPORTS])
  })

  // Un site à un seul rendu ne doit rien payer du mécanisme : c’est cette
  // valeur que le module généré lit pour décider d’importer, ou non, les
  // variantes bureau — dont la collecte des styles d’Astro embarquerait sinon
  // le CSS, qu’une page les rende ou non.
  it('ne nomme le bureau que si le site le déclare', () => {
    expect(supportsOf(site(false)).includes('desktop')).toBe(false)
    expect(supportsOf(site(true)).includes('desktop')).toBe(true)
  })
})

describe('slugIn', () => {
  it('laisse le slug du mobile intact, racine comprise', () => {
    expect(slugIn('mobile', undefined)).toBeUndefined()
    expect(slugIn('mobile', 'contact')).toBe('contact')
  })

  it('range la racine du bureau sous le seul préfixe', () => {
    expect(slugIn('desktop', undefined)).toBe(DESKTOP_PREFIX)
  })

  it('préfixe une page et une langue', () => {
    expect(slugIn('desktop', 'contact')).toBe(`${DESKTOP_PREFIX}/contact`)
    expect(slugIn('desktop', 'en/contact')).toBe(`${DESKTOP_PREFIX}/en/contact`)
  })
})

describe('supportFor', () => {
  it('suit l’indication client quand elle est là', () => {
    expect(supportFor(headers({ 'sec-ch-ua-mobile': '?1' }))).toBe('mobile')
    expect(supportFor(headers({ 'sec-ch-ua-mobile': '?0' }))).toBe('desktop')
  })

  it('ignore le User-Agent dès que l’indication est présente', () => {
    const both = headers({
      'sec-ch-ua-mobile': '?0',
      'user-agent': 'Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36',
    })

    expect(supportFor(both)).toBe('desktop')
  })

  it('retombe sur le User-Agent, où seul « Mobi » est stable', () => {
    const iphone = headers({
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1',
    })

    expect(supportFor(iphone)).toBe('mobile')
  })

  it('sert le bureau à une tablette, qui ne se déclare pas mobile', () => {
    const ipad = headers({
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15',
    })

    expect(supportFor(ipad)).toBe('desktop')
  })

  it('sert le mobile au robot smartphone de Google', () => {
    const googlebot = headers({
      'user-agent':
        'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    })

    expect(supportFor(googlebot)).toBe('mobile')
  })

  it('sert le bureau à un client qui n’envoie rien', () => {
    expect(supportFor(headers({}))).toBe('desktop')
  })
})

describe('la page 404', () => {
  it('a une route par support, et le préfixe dit laquelle', () => {
    expect(notFoundRoute('mobile')).toBe('/404')
    expect(notFoundRoute('desktop')).toBe('/_desktop/404')
  })

  it('sort à plat au mobile, en dossier au bureau — le cas particulier d’Astro', () => {
    expect(notFoundFile('mobile')).toBe('/404.html')
    expect(notFoundFile('desktop')).toBe('/_desktop/404/index.html')
  })

  it('lit le support sur le chemin d’une page construite', () => {
    expect(supportOfPath('/404')).toBe('mobile')
    expect(supportOfPath('/_desktop/404')).toBe('desktop')
    expect(supportOfPath('/_desktop')).toBe('desktop')
    expect(supportOfPath('/_desktopiste')).toBe('mobile')
  })
})
