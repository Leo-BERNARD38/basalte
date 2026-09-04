// La carte d’un billet dans la liste : ce qu’on reconnaît d’un coup d’œil, et
// les deux gestes qu’on fait dessus.
//
// L’avancement des traductions se lit ici et nulle part ailleurs : c’est la
// seule vue où l’on compare les billets entre eux.

import { formatDate } from '../fields/date.js'
import type { MediaSummary } from '../server/library.js'
import type { DraftPost } from '../server/posts.js'
import { preview } from './Media.js'
import { Mark } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { HiddenMark, Picture } from './ui/icons.js'
import { Spacer } from './ui/Layout.js'
import { Mono } from './ui/Text.js'

export function PostCard({
  post,
  media,
  away,
  language,
  onWrite,
  onRemove,
}: {
  readonly post: DraftPost
  readonly media: readonly MediaSummary[]
  readonly away: boolean
  readonly language: string
  readonly onWrite: () => void
  readonly onRemove: () => void
}) {
  const cover = media.find((entry) => entry.key === post.fields['cover'])
  const behind = post.progress.filter((step) => step.filled < step.total)

  return (
    <div className="basalte-post" data-away={String(away)}>
      <button type="button" className="basalte-post__open" onClick={onWrite}>
        <span className="basalte-post__cover">
          {cover === undefined ? (
            <Picture size={24} />
          ) : (
            <img src={preview(cover)} alt="" loading="lazy" />
          )}
        </span>
        <span className="basalte-post__text">
          <strong>{post.title}</strong>
          <Mono className="basalte-row__note">
            {formatDate(post.date, language)}
          </Mono>
        </span>
      </button>

      <div className="basalte-post__marks">
        {away && (
          <Mark hatched>
            <HiddenMark size={12} />
            brouillon
          </Mark>
        )}
        {behind.length > 0 && (
          <Mark>
            {behind.map((step) => step.language.toUpperCase()).join(' · ')} à
            traduire
          </Mark>
        )}
        <Spacer />
        <Button variant="text" size="xs" tone="error" onClick={onRemove}>
          Supprimer
        </Button>
      </div>
    </div>
  )
}
