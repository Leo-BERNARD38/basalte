// Les emails d’authentification. Deux versions par message, texte et HTML :
// la version texte est celle qui arrive partout, y compris chez un client qui
// bloque le HTML.
//
// Tout ce qui vient de l’extérieur — le navigateur annoncé, l’adresse IP — est
// échappé avant d’entrer dans le HTML, par la même fonction que le rendu du
// contenu (invariant 1).

import { escapeHtml } from '../../fields/richtext.js'
import type { Origin } from '../session.js'
import type { EmailMessage } from './provider.js'

export type Letter = Omit<EmailMessage, 'to'>

export function signInCode(
  siteName: string,
  code: string,
  minutes: number,
  origin: Origin,
): Letter {
  return letter(
    `Code de connexion — ${siteName}`,
    'Votre code de connexion',
    [
      `Voici le code qui termine votre connexion à ${siteName}. Il est valable ${minutes} minutes et ne sert qu’une fois.`,
    ],
    [
      `Demandé depuis ${describe(origin)}.`,
      'Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : sans ce code, personne n’entre.',
    ],
    code,
  )
}

export function deviceTrusted(siteName: string, origin: Origin): Letter {
  return letter(
    `Nouvel appareil reconnu — ${siteName}`,
    'Un nouvel appareil a été reconnu',
    [
      `Un appareil vient d’être ajouté à vos appareils de confiance sur ${siteName}. Il ne demandera plus de code pendant trente jours.`,
      `Appareil : ${describe(origin)}.`,
    ],
    [
      'Si ce n’est pas vous, changez votre mot de passe et oubliez tous les appareils depuis la page « Compte » de votre panel.',
    ],
  )
}

export function repeatedFailures(
  siteName: string,
  count: number,
  origin: Origin,
): Letter {
  return letter(
    `Tentatives de connexion échouées — ${siteName}`,
    'Plusieurs connexions ont échoué',
    [
      `${count} tentatives de connexion à ${siteName} ont échoué récemment.`,
      `Dernière tentative depuis ${describe(origin)}.`,
    ],
    [
      'Si c’était vous, il n’y a rien à faire. Sinon, votre mot de passe circule peut-être : changez-le depuis la page « Compte ».',
    ],
  )
}

// L’alerte du mainteneur. Elle porte la sortie complète, que le client ne voit
// jamais : lui lit une phrase, celui qui peut réparer lit la trace.
export function publicationFailed(
  siteName: string,
  stage: string,
  detail: string,
): Letter {
  return letter(
    `Mise en ligne en échec — ${siteName}`,
    'Une mise en ligne a échoué',
    [
      `${stage} n’a pas abouti sur ${siteName}. Le site en ligne n’a pas changé, et le client a lu qu’il n’avait rien perdu.`,
      detail === '' ? 'Aucun détail.' : detail,
    ],
    [
      'Cet email part de la machine du site, pas du canal des codes de connexion.',
    ],
  )
}

function describe(origin: Origin): string {
  return `${origin.agent === '' ? 'un navigateur inconnu' : origin.agent} (${origin.ip === '' ? 'adresse inconnue' : origin.ip})`
}

function letter(
  subject: string,
  heading: string,
  body: readonly string[],
  footer: readonly string[],
  code?: string,
): Letter {
  const text = [
    heading,
    '',
    ...body,
    ...(code === undefined ? [] : ['', code]),
    '',
    ...footer,
    '',
  ].join('\n')

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.6;color:#1c1917;max-width:34rem">',
    `<h1 style="font-size:1.25rem;margin:0 0 1rem">${escapeHtml(heading)}</h1>`,
    ...body.map(
      (paragraph) => `<p style="margin:0 0 1rem">${escapeHtml(paragraph)}</p>`,
    ),
    ...(code === undefined
      ? []
      : [
          `<p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:2rem;letter-spacing:0.25em;margin:0 0 1rem">${escapeHtml(code)}</p>`,
        ]),
    ...footer.map(
      (paragraph) =>
        `<p style="margin:0 0 1rem;font-size:0.875rem;color:#57534e">${escapeHtml(paragraph)}</p>`,
    ),
    '</div>',
  ].join('')

  return { subject, text, html }
}
