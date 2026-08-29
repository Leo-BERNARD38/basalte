// Tout ce qui est secret et non deviné : jetons de session, d’appareil, de
// tentative et de secours, et le code à six chiffres.
//
// Un jeton porte 256 bits d’entropie et n’est jamais stocké en clair : la base
// n’en garde que l’empreinte SHA-256. Le code, lui, ne fait que six chiffres —
// son empreinte est donc liée au jeton de la tentative, qui ne vit que dans le
// navigateur. Une base volée seule ne permet ni de rejouer un jeton ni de
// retrouver un code.

import { hash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export const TOKEN_BYTES = 32
export const CODE_DIGITS = 6

export function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function newCode(): string {
  return String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, '0')
}

export function fingerprint(secret: string): string {
  return hash('sha256', secret, 'hex')
}

export function codeFingerprint(token: string, code: string): string {
  return hash('sha256', `${token}:${code}`, 'hex')
}

// La longueur d’une empreinte n’est pas un secret ; sa valeur l’est.
export function sameSecret(left: string, right: string): boolean {
  if (left.length !== right.length) return false

  return timingSafeEqual(Buffer.from(left), Buffer.from(right))
}
