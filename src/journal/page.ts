// La compilation d’un billet en page. C’est le cœur de la phase, et ce qui
// décide de son coût.
//
// Un billet n’est pas un nouveau type de page : c’est une page dont la
// structure est écrite par le socle plutôt que par le client. Une fois
// compilé, il traverse sans rien demander tout ce qui existe déjà —
// `getStaticPaths`, l’enveloppe de rendu, le contrat des deux rendus (D108),
// le rang du `h1` (D115), l’aperçu du panel, la carte de partage, le JSON-LD.
// Un pipeline parallèle aurait redoublé ces mécaniques, et les aurait fait
// diverger une par une.
//
// Le fichier est pur : entrée JSON, sortie `Page`. Il se vérifie sans
// construire un site.

import { CONTENT_FORMAT, type Page } from '../content/page.js'
import type { RenderedPage } from '../content/project.js'
import type { Site } from '../site/define.js'
import { pick } from '../fields/translate.js'
import type { Translated } from '../fields/types.js'
import { postRoute, POST_SLOT, type Journal, type Post } from './define.js'

/** L’identifiant de l’unique section d’un billet. Il ne se réordonne pas. */
export const POST_SECTION = 'post'

/**
 * Le billet tel que la liste le montre. Elle n’a pas besoin de son corps, et
 * le lui donner ferait porter chaque billet du site à chaque page qui en
 * affiche trois.
 */
export type PostEntry = {
  readonly slug: string
  readonly route: string
  readonly date: string
  readonly title: string
  readonly excerpt: string
  readonly cover: string
}

/**
 * Le titre et le résumé du billet **deviennent** le titre et la description de
 * sa page : le client ne saisit jamais deux fois la même phrase, et D138 est
 * satisfaite sans un champ de plus.
 *
 * L’image de partage, elle, reste vide, et la carte retombe sur la couverture
 * par le chemin ordinaire (D124). La recopier ici l’aurait fait mesurer contre
 * le `1200/630` que `meta` déclare, alors qu’une couverture d’article est en
 * `16/9` : le billet aurait porté un avertissement que rien ne permet de
 * corriger.
 */
export function pageOfPost(post: Post): Page {
  return {
    $format: CONTENT_FORMAT,
    meta: {
      title: post.fields.title,
      description: post.fields.excerpt,
      image: '',
    },
    blocks: [
      {
        id: POST_SECTION,
        type: POST_SLOT,
        hidden: post.hidden,
        props: post.fields,
      },
    ],
  }
}

/**
 * Les billets sous la forme que le rendu consomme. Leur `name` porte le
 * préfixe du journal : c’est ce que les messages de `check` citent, et deux
 * billets ne peuvent pas être confondus avec la page qui les liste.
 */
export function postPages(
  journal: Journal,
  posts: readonly Post[],
): readonly RenderedPage[] {
  return posts.map((post) => ({
    name: `${journal.base}/${post.slug}`,
    route: postRoute(journal, post.slug),
    page: pageOfPost(post),
  }))
}

/**
 * Tout ce que le site sert sous une adresse : ses pages, et ses billets une
 * fois compilés. Les contrôles, le sitemap et le relevé de contenu passent par
 * ici — c’est ce qui fait qu’aucun d’eux n’a eu à apprendre ce qu’est un
 * billet.
 *
 * La fonction vit dans ce module, et non dans `content/project.ts` : celui-ci
 * ouvre le disque, et le sitemap du site public l’aurait alors entraîné dans
 * son paquet.
 */
export function allPages(project: {
  readonly site: Site
  readonly pages: readonly RenderedPage[]
  readonly posts: readonly Post[]
}): readonly RenderedPage[] {
  return project.site.journal === undefined
    ? project.pages
    : [...project.pages, ...postPages(project.site.journal, project.posts)]
}

/** Les billets qu’une langue montre, du plus récent au plus ancien. */
export function postEntries(
  journal: Journal,
  posts: readonly Post[],
  language: string,
): readonly PostEntry[] {
  return posts
    .filter((post) => !isHidden(post.hidden, language))
    .map((post) => ({
      slug: post.slug,
      route: postRoute(journal, post.slug),
      date: post.fields.date,
      title: pick(post.fields.title, language),
      excerpt: pick(post.fields.excerpt, language),
      cover: post.fields.cover,
    }))
}

export function isHidden(
  hidden: Translated<boolean>,
  language: string,
): boolean {
  return hidden[language] === true
}

/**
 * L’ordre du journal : la date décroissante, et le slug pour départager deux
 * billets du même jour. Les dates sont écrites « AAAA-MM-JJ », qui se trie
 * comme du texte — aucun objet `Date` n’est construit.
 */
export function byDate(a: Post, b: Post): number {
  const dates = b.fields.date.localeCompare(a.fields.date)

  return dates === 0 ? a.slug.localeCompare(b.slug) : dates
}
