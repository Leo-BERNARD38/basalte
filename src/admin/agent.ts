// Le navigateur d’une session, tel que le client le reconnaît. Le serveur garde
// la chaîne que le navigateur envoie ; « Mozilla/5.0 (Windows NT 10.0; Win64;
// x64) AppleWebKit/537.36… » ne dit rien à personne, et se coupait après le
// premier mot dans la colonne qui le portait. Ce module en tire deux mots :
// le navigateur, et le système.
//
// La lecture est volontairement courte. Elle n’a pas à être exacte pour un
// navigateur rare : elle a à dire « Chrome sur Windows » là où le client lit
// son propre poste, et « Navigateur inconnu » ailleurs.

const BROWSERS: readonly (readonly [RegExp, string])[] = [
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\bOPR\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bFirefox\//, 'Firefox'],
  [/\bFxiOS\//, 'Firefox'],
  [/\bCriOS\//, 'Chrome'],
  [/\bChrome\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
]

const SYSTEMS: readonly (readonly [RegExp, string])[] = [
  [/\bWindows\b/, 'Windows'],
  [/\bAndroid\b/, 'Android'],
  [/\b(?:iPhone|iPad|iPod)\b/, 'iOS'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bLinux\b/, 'Linux'],
]

const UNKNOWN = 'Navigateur inconnu'

function first(
  table: readonly (readonly [RegExp, string])[],
  agent: string,
): string | undefined {
  return table.find(([pattern]) => pattern.test(agent))?.[1]
}

/** « Chrome sur Windows », « Safari sur iOS », ou ce qu’on sait. */
export function describeAgent(agent: string): string {
  const browser = first(BROWSERS, agent)
  const system = first(SYSTEMS, agent)

  if (browser !== undefined && system !== undefined) {
    return `${browser} sur ${system}`
  }

  return browser ?? system ?? UNKNOWN
}
