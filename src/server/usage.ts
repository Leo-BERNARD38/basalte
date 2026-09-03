// Le périmètre d’emploi des médias tel que le panel le lit : les brouillons
// des pages, du chrome, de la fiche et des billets, tels qu’ils sont sur le
// disque à l’instant de la question. C’est lui qui décide si une image ou un
// document peut se supprimer.

import { usageScope, type UsageScope } from '../media/usage.js'
import { readBusinessDraft } from './business.js'
import { readChromeDraft } from './chrome.js'
import type { Schemas } from '../content/project.js'
import { readDrafts } from './pages.js'
import { readPostDrafts } from './posts.js'

export async function readUsageScope(
  root: string,
  schemas: Schemas,
): Promise<UsageScope> {
  const journal = schemas.site.journal
  const [pages, chrome, business, posts] = await Promise.all([
    readDrafts(root, schemas),
    readChromeDraft(root, schemas),
    readBusinessDraft(root, schemas),
    journal === undefined ? [] : readPostDrafts(root, schemas, journal),
  ])

  return usageScope({
    registry: schemas.registry,
    chrome: schemas.chrome,
    journal: schemas.journal,
    pages,
    chromeValues: Object.fromEntries(
      chrome.sections.map((section) => [section.id, section.props]),
    ),
    business: business.sections[0]?.props ?? {},
    posts: posts.map((post) => post.fields),
  })
}
