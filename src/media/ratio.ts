// Le ratio qu’un champ déclare, et ce qu’il faut pour l’obtenir.
//
// Un `f.image({ ratio })` disait jusqu’ici une intention que rien ne tenait :
// une photo en 4/3 se déposait dans un emplacement dessiné pour du 16/9, et le
// point focal ne pouvait rien pour elle — il déplace un cadrage, il ne
// transforme pas un format.
//
// Ce fichier ne touche ni au disque ni à sharp : le panel s’en sert dans le
// navigateur pour poser le cadre, le serveur pour le découper, et
// `basalte check` pour signaler une image qui ne tient pas son format.

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

/** Le cadre retenu, en pourcentage de l’image d’origine. */
export type CropBox = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Le cadre en pixels que sharp découpe. */
export type PixelBox = {
  readonly left: number
  readonly top: number
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

/**
 * Le cadre proposé au client quand il ouvre le recadrage : le plus grand du
 * format attendu qui tient dans l’image, centré sur le point focal quand il y
 * en a un. Une image déjà au format rend l’image entière.
 */
export function boxFor(
  dimensions: Dimensions,
  ratio: string,
  focal?: { readonly x: number; readonly y: number },
): CropBox {
  const wanted = parseRatio(ratio)
  const whole = { x: 0, y: 0, width: 100, height: 100 }

  if (wanted === undefined) return whole

  const source = ratioOf(dimensions)
  const width = source > wanted ? (wanted / source) * 100 : 100
  const height = source > wanted ? 100 : (source / wanted) * 100

  return {
    x: clamp((focal?.x ?? 50) - width / 2, 0, 100 - width),
    y: clamp((focal?.y ?? 50) - height / 2, 0, 100 - height),
    width,
    height,
  }
}

/**
 * Le passage du pourcentage aux pixels. Les bornes sont refermées sur l’image :
 * sharp refuse une extraction qui déborde, et un arrondi suffit à déborder d’un
 * pixel sur un cadre collé au bord.
 */
export function pixelBox(dimensions: Dimensions, box: CropBox): PixelBox {
  const width = Math.max(
    1,
    Math.min(
      dimensions.width,
      Math.round((box.width / 100) * dimensions.width),
    ),
  )
  const height = Math.max(
    1,
    Math.min(
      dimensions.height,
      Math.round((box.height / 100) * dimensions.height),
    ),
  )

  return {
    left: clamp(
      Math.round((box.x / 100) * dimensions.width),
      0,
      dimensions.width - width,
    ),
    top: clamp(
      Math.round((box.y / 100) * dimensions.height),
      0,
      dimensions.height - height,
    ),
    width,
    height,
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high))
}
