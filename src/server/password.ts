// Le mot de passe : sa génération, sa solidité, son hachage.
//
// Le socle le génère à la création du compte, il n’est jamais choisi — c’est
// ce qui le rend non réutilisé, donc insensible au bourrage d’identifiants. Il
// s’affiche une fois, à l’écran ou de vive voix, et ne part jamais par email
// (invariant 12).

import { randomInt } from 'node:crypto'

import { hash, verify } from '@node-rs/argon2'

import { COMMON_PASSWORDS } from './common-passwords.js'

export const MINIMUM_LENGTH = 12

// Les paramètres recommandés par l’OWASP pour Argon2id : 19 Mio, deux passes,
// un fil. `2` est Argon2id dans l’énumération de la liaison.
const ARGON2ID = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const

// Vérifier contre cette empreinte fait passer un compte inexistant par le même
// temps de calcul qu’un compte réel : l’écart de durée ne dit plus qui existe.
const DECOY =
  '$argon2id$v=19$m=19456,t=2,p=1$DVqO/DmVgAM0K427QpgOog$q+wIsRWR58pzAOpftRupblDBhzZ0eHh2oHA35AMfoIM'

// Sans les caractères que l’on confond en les dictant : 0 et O, 1 et l et I.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const GROUPS = 4
const GROUP_LENGTH = 5

const LEET: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
}

export function generatePassword(): string {
  const groups: string[] = []

  for (let group = 0; group < GROUPS; group += 1) {
    let letters = ''

    for (let index = 0; index < GROUP_LENGTH; index += 1) {
      letters += ALPHABET[randomInt(0, ALPHABET.length)]
    }

    groups.push(letters)
  }

  return groups.join('-')
}

/** Le message à afficher, ou `undefined` si le mot de passe convient. */
export function checkPassword(password: string): string | undefined {
  if (password.length < MINIMUM_LENGTH) {
    return `Le mot de passe doit faire au moins ${MINIMUM_LENGTH} caractères.`
  }

  if (new Set(password).size < 4) {
    return 'Le mot de passe répète trop peu de caractères différents.'
  }

  if (variants(password).some((form) => COMMON_PASSWORDS.has(form))) {
    return 'Ce mot de passe fait partie des plus utilisés : il est deviné en quelques secondes.'
  }

  return undefined
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2ID)
}

export async function verifyPassword(
  hashed: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hashed, password, ARGON2ID)
  } catch {
    return false
  }
}

export async function burnTime(password: string): Promise<void> {
  await verifyPassword(DECOY, password)
}

// « Motdepasse123 » et « P@ssw0rd1234 » se ramènent tous deux à un mot de la
// liste : le suffixe de chiffres tombe d’abord, puis les substitutions
// courantes sont défaites. La liste embarquée n’a donc pas à porter ces
// variantes, qui sont infinies.
function variants(password: string): readonly string[] {
  const core = password
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9@$!]/g, '')
    .replace(/[0-9!]+$/, '')

  const folded = [...core]
    .map((character) => LEET[character] ?? character)
    .join('')

  return [core.replace(/[^a-z]/g, ''), folded.replace(/[^a-z]/g, '')]
}
