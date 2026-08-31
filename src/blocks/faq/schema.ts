import { f } from '../../fields/define.js'
import { renderRichtext } from '../../fields/richtext.js'
import { pick } from '../../fields/translate.js'
import { block } from '../define.js'

/** La grammaire de la réponse, écrite une fois : le rendu et le JSON-LD en
 * emploient la même, faute de quoi le second dirait autre chose que le premier. */
const ANSWER = { lists: true }

export default block({
  name: 'faq',
  label: 'Questions fréquentes',
  help: 'Les questions que le client pose avant d’appeler, et leurs réponses.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    items: f.list({
      label: 'Questions',
      itemLabel: 'question',
      required: true,
      min: 1,
      max: 12,
      of: {
        question: f.text({
          label: 'Question',
          i18n: true,
          required: true,
          max: 120,
        }),
        answer: f.richtext({
          label: 'Réponse',
          i18n: true,
          required: true,
          max: 800,
          ...ANSWER,
        }),
      },
    }),
  },

  // Le seul bloc du socle qui apporte des données structurées. Elles sont
  // déclarées ici plutôt que rendues par le composant : la variante bureau
  // reçoit les mêmes valeurs, si bien que les deux rendus ne peuvent pas
  // diverger sur ce que Google lit (D121).
  //
  // La réponse part en HTML, ce que `FAQPage` accepte : elle passe par le même
  // Markdown restreint que le rendu, donc rien du contenu n’échappe à la liste
  // blanche (invariant 1).
  structured(props, context) {
    const answers = props.items
      .filter((item) => pick(item.question, context.language).trim() !== '')
      .map((item) => ({
        '@type': 'Question',
        name: pick(item.question, context.language),
        acceptedAnswer: {
          '@type': 'Answer',
          text: renderRichtext(pick(item.answer, context.language), ANSWER),
        },
      }))

    return answers.length === 0
      ? undefined
      : {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: answers,
        }
  },
})
