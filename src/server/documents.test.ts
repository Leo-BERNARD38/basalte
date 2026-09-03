import { describe, expect, it } from 'vitest'

import { block } from '../blocks/define.js'
import { f } from '../fields/define.js'
import { describeDocuments } from './documents.js'
import { bench } from './panel.fixture.js'

const PDF = new File([Buffer.from('%PDF-1.7\ncorps\n%%EOF\n')], 'cgv.pdf', {
  type: 'application/pdf',
})

const NOT_PDF = new File([Buffer.from('<svg onload=1>')], 'piege.pdf', {
  type: 'application/pdf',
})

function form(file: File): FormData {
  const body = new FormData()

  body.set('file', file)

  return body
}

describe('POST /api/documents', () => {
  it('refuse tant que le site ne déclare pas la capacité', async () => {
    const site = await bench()
    const response = await site.call('POST', '/api/documents', form(PDF), {
      json: false,
    })

    expect(response.status).toBe(409)
    await site.close()
  })

  it('accepte un PDF déclaré, et le rend au panel', async () => {
    const site = await bench({ capabilities: { documents: true } })
    const response = await site.call('POST', '/api/documents', form(PDF), {
      json: false,
    })
    const answer = await response.json()

    expect(response.status).toBe(200)
    expect(answer.document.name).toBe('cgv.pdf')
    expect(answer.document.key).toMatch(/^[0-9a-f]{16}$/)

    const payload = await (await site.call('GET', '/api/panel')).json()

    expect(payload.documents).toHaveLength(1)
    expect(payload.documents[0].key).toBe(answer.document.key)
    expect(payload.site.capabilities.documents).toBe(true)

    await site.close()
  })

  it('refuse un fichier qui n’est pas un PDF malgré son extension', async () => {
    const site = await bench({ capabilities: { documents: true } })
    const response = await site.call('POST', '/api/documents', form(NOT_PDF), {
      json: false,
    })

    expect(response.status).toBe(422)
    expect((await response.json()).message).toContain('PDF')

    await site.close()
  })
})

describe('describeDocuments', () => {
  it('compte les sections qui emploient chaque document', () => {
    const brochure = block({
      name: 'brochure',
      label: 'Document',
      fields: { file: f.document({ label: 'Le fichier' }) },
    })

    const summaries = describeDocuments(
      {
        aaaaaaaaaaaaaaaa: { name: 'employé.pdf', bytes: 10 },
        bbbbbbbbbbbbbbbb: { name: 'orphelin.pdf', bytes: 20 },
      },
      {
        registry: { brochure },
        pages: [
          {
            meta: {},
            blocks: [
              {
                id: 'd1',
                type: 'brochure',
                hidden: {},
                props: { file: 'aaaaaaaaaaaaaaaa' },
              },
            ],
          },
        ],
      },
    )

    expect(summaries.map((entry) => [entry.name, entry.usage])).toEqual([
      ['employé.pdf', 1],
      ['orphelin.pdf', 0],
    ])
  })
})
