// Le ratio qu’un champ déclare, et ce qu’il faut pour l’obtenir.
//
// Un `f.image({ ratio })` disait jusqu’ici une intention que rien ne tenait :
// une photo en 4/3 se déposait dans un emplacement dessiné pour du 16/9, et le
// point focal ne pouvait rien pour elle — il déplace un cadrage, il ne
// transforme pas un format.
//
// Ce fichier ne touche ni au disque ni à sharp : `basalte check` s’en sert pour
// signaler une image qui ne tient pas le format que son emplacement attend.

/** Ce qu’un champ écrit : « 16/9 », « 4/5 », « 1200/630 ». */
const RATIO = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/

/**
 * L’écart relatif sous lequel deux ratios sont le même. Le découpage travaille
 * en pixels entiers et le redimensionnement arrondit : un 16/9 exact ressort à
 * quelques millièmes près.
 */
export const RATIO_TOLERANCE = 0.01

export type Dimensions = {
  readonly width: number
  readonly height: number
}

/**
 * Le cadre retenu, en pourcentage de l’image d’origine. Le panel ne recadre
 * plus (D178) ; le type survit pour que le manifeste d’un site monté de version
 * relise ce qu’il porte, au lieu de l’effacer en le réécrivant.
 */
export type CropBox = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export function parseRatio(ratio: string): number | undefined {
  const found = RATIO.exec(ratio.trim())

  if (found === null) return undefined

  const width = Number(found[1])
  const height = Number(found[2])

  return width > 0 && height > 0 ? width / height : undefined
}

export function ratioOf(dimensions: Dimensions): number {
  return dimensions.width / dimensions.height
}

/**
 * Un ratio illisible n’accuse pas l’image : c’est le champ qui est fautif, et
 * `f.image` le refuse déjà à la déclaration.
 */
export function matchesRatio(dimensions: Dimensions, ratio: string): boolean {
  const wanted = parseRatio(ratio)

  if (wanted === undefined) return true

  return Math.abs(ratioOf(dimensions) - wanted) <= wanted * RATIO_TOLERANCE
}
