// La liste blanche des adresses qu’un contenu peut porter. Elle sert deux fois
// — au schéma d’un champ `f.url()` et au rendu d’un lien Markdown — et n’est
// écrite qu’ici : deux copies finissent par diverger, et celle qui a divergé
// laisse passer ce que l’autre refuse.
//
// « // » et « /\ » ouvrent tous deux une adresse absolue vers un autre hôte
// sous les dehors d’un chemin : un navigateur ramène l’antislash à une barre
// pour les schémas qu’il connaît. Un lien interne commence par une barre, et le
// caractère qui suit n’est ni l’une ni l’autre.
//
// Un caractère de contrôle ou une espace servent, eux, à reconstruire un schéma
// que la liste refuserait écrit en clair — le navigateur les retire de l’URL
// avant de la lire.

const INTERNAL_OR_EXTERNAL = /^(https?:\/\/|mailto:|tel:|\/(?![/\\])|#)/i
const EXTERNAL = /^https?:\/\//i

export function allowedHref(href: string, external = false): boolean {
  for (const character of href) {
    const code = character.codePointAt(0) ?? 0

    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f)) return false
  }

  return (external ? EXTERNAL : INTERNAL_OR_EXTERNAL).test(href)
}
