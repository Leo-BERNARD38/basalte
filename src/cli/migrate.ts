// `basalte migrate` : met les contenus au format que le socle installé attend.
//
// Le résultat est un commit, donc `git revert` l’annule comme le reste. Un
// dépôt qui n’en est pas un — le site de démonstration, logé dans celui du
// socle — voit ses fichiers migrés sans historique (D62).

import { CONTENT_FORMAT } from '../content/page.js'
import { planMigrations, writeMigrations } from '../migrations/run.js'
import { commitFiles } from '../server/git.js'
import { loadSite } from '../site/load.js'
import { fails, hasFlag, heading, line, succeeds } from './args.js'
import type { Result } from './run.js'

export async function migrate(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const dryRun = hasFlag(argv, '--dry-run')
  const site = await loadSite(cwd)
  const plan = await planMigrations(cwd)
  const lines = [...heading('migrate', site.name)]

  for (const name of plan.ahead) {
    lines.push(
      line(
        'error',
        `« ${name} » est écrite par un socle plus récent que celui installé — monte de version plutôt que de migrer`,
      ),
    )
  }

  if (plan.ahead.length > 0) return fails(lines)

  if (plan.pages.length === 0) {
    lines.push(line('ok', `tout est au format ${CONTENT_FORMAT}, rien à faire`))

    return succeeds(lines)
  }

  for (const page of plan.pages) {
    lines.push(
      line(
        dryRun ? 'warning' : 'ok',
        `« ${page.name} » : format ${page.from} → ${page.to} — ${page.labels.join(', ')}`,
      ),
    )
  }

  if (dryRun) {
    lines.push('', 'Rien n’a été écrit.')

    return succeeds(lines)
  }

  const written = await writeMigrations(cwd, plan)

  const committed = await commitFiles(
    cwd,
    written,
    `contenu migré au format ${plan.target}`,
    `basalte@${site.domain}`,
  )

  lines.push(
    line(
      committed ? 'ok' : 'warning',
      committed
        ? `${written.length} fichier(s) migré(s) et commité(s)`
        : `${written.length} fichier(s) migré(s), sans commit — ce dossier n’est pas la racine d’un dépôt`,
    ),
  )

  return succeeds(lines)
}
