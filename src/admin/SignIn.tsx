// L’entrée : adresse et mot de passe, puis le code reçu par email. Le second
// écran ne demande jamais de reprendre le premier — la tentative en cours vit
// dans un cookie, et c’est à elle que le code est lié (D49).
//
// C’est le seul écran qu’un client voit avant d’être reconnu, et le seul dont
// il ne peut rien deviner : le champ attendu reçoit donc le curseur de
// lui-même, aux deux étapes. Le code se saisit comme il se lit — six chiffres,
// collés ou tapés, validés dès le sixième — et ce que le serveur sait du refus
// se montre plutôt que de se perdre : combien d’essais restent, et à partir de
// quand une nouvelle tentative sera acceptée.

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useEffect, useRef, useState } from 'react'

import { signIn, submitCode } from './api.js'

const DIGITS = 6

/** Le code tel que le serveur l’attend : rien que des chiffres, six au plus. */
function digitsOf(input: string): string {
  return input.replace(/\D/g, '').slice(0, DIGITS)
}

function minutesUntil(moment: number, now: number): number {
  return Math.max(1, Math.ceil((moment - now) / 60_000))
}

export function SignIn({
  site,
  notice,
  onSignedIn,
}: {
  readonly site: string
  /** Ce que le serveur a dit en fermant la session, s’il a dit quelque chose. */
  readonly notice: string
  readonly onSignedIn: () => void
}) {
  const [step, setStep] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  const [problem, setProblem] = useState('')
  const [remaining, setRemaining] = useState<number | undefined>(undefined)
  const [retryAt, setRetryAt] = useState<number | undefined>(undefined)
  const [expiresAt, setExpiresAt] = useState<number | undefined>(undefined)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLInputElement>(null)

  // Le curseur suit l’étape : on revient de sa boîte mail pour taper le code,
  // pas pour aller le chercher à la souris.
  useEffect(() => {
    field.current?.focus()
  }, [step])

  // La minuterie d’un blocage. Elle ne tourne que pendant qu’il dure : sans
  // cette borne, l’écran de connexion se réveillerait chaque seconde pour rien.
  const locked = retryAt !== undefined && retryAt > now

  useEffect(() => {
    if (!locked) return undefined

    const timer = setInterval(() => setNow(Date.now()), 1_000)

    return () => clearInterval(timer)
  }, [locked])

  const refuse = (answer: {
    readonly message: string
    readonly retryAt?: number
    readonly remaining?: number
  }) => {
    setProblem(answer.message)
    setRemaining(answer.remaining)
    setRetryAt(answer.retryAt)
    setNow(Date.now())
  }

  const start = async () => {
    setBusy(true)

    const answer = await signIn(email, password)

    setBusy(false)

    if (!answer.ok) {
      refuse(answer)

      return
    }

    setProblem('')
    setPassword('')
    setRemaining(undefined)
    setRetryAt(undefined)
    setExpiresAt(answer.data.expiresAt)

    if (answer.data.step === 'panel') onSignedIn()
    else setStep('code')
  }

  const finish = async (given: string) => {
    setBusy(true)

    const answer = await submitCode(given, remember)

    setBusy(false)

    if (!answer.ok) {
      refuse(answer)
      setCode('')
      field.current?.focus()

      return
    }

    onSignedIn()
  }

  // Revenir en arrière : une adresse mal tapée n’a pas d’autre issue que de
  // recharger la page, et personne ne devine qu’il faut le faire.
  const restart = () => {
    setStep('password')
    setCode('')
    setProblem('')
    setRemaining(undefined)
    setExpiresAt(undefined)
  }

  const submit = () => {
    void (step === 'password' ? start() : finish(code))
  }

  const change = (given: string) => {
    const kept = digitsOf(given)

    setCode(kept)

    // Le sixième chiffre vaut validation : personne ne tape un code pour
    // ensuite chercher le bouton.
    if (kept.length === DIGITS && !busy) void finish(kept)
  }

  return (
    <div className="basalte-signin">
      <Paper p="xl" maw="var(--panel-measure-form)" w="100%" shadow="lg">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">
                {site}
              </Text>
              <Title order={1} fz="var(--panel-text-title)">
                Administration
              </Title>
            </div>

            {notice !== '' && problem === '' && <Alert>{notice}</Alert>}

            {problem !== '' && (
              <Alert color="red" title="Connexion refusée">
                <Stack gap={4}>
                  <Text size="sm">{problem}</Text>
                  {remaining !== undefined && (
                    <Text size="sm">
                      Il reste {remaining} essai{remaining > 1 ? 's' : ''}.
                    </Text>
                  )}
                  {locked && retryAt !== undefined && (
                    <Text size="sm">
                      Réessayez dans {minutesUntil(retryAt, now)} minute
                      {minutesUntil(retryAt, now) > 1 ? 's' : ''}.
                    </Text>
                  )}
                </Stack>
              </Alert>
            )}

            {step === 'password' ? (
              <>
                <TextInput
                  ref={field}
                  label="Adresse email"
                  type="email"
                  autoComplete="username"
                  required
                  disabled={busy}
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                />
                <PasswordInput
                  label="Mot de passe"
                  autoComplete="current-password"
                  required
                  disabled={busy}
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                />
              </>
            ) : (
              <>
                <Text size="sm">
                  Un code à six chiffres vient de partir vers {email}.
                  {expiresAt !== undefined &&
                    ` Il est valable ${minutesUntil(expiresAt, now)} minutes.`}
                </Text>
                <TextInput
                  ref={field}
                  label="Code reçu par email"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={DIGITS}
                  required
                  disabled={busy}
                  value={code}
                  onChange={(event) => change(event.currentTarget.value)}
                />
                <Checkbox
                  label="Se souvenir de cet appareil pendant 30 jours"
                  checked={remember}
                  disabled={busy}
                  onChange={(event) => setRemember(event.currentTarget.checked)}
                />
              </>
            )}

            <Button type="submit" loading={busy} disabled={locked} fullWidth>
              {step === 'password' ? 'Continuer' : 'Se connecter'}
            </Button>

            {step === 'code' && (
              <Group justify="center">
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={restart}
                >
                  Reprendre avec une autre adresse
                </Button>
              </Group>
            )}
          </Stack>
        </form>
      </Paper>
    </div>
  )
}
