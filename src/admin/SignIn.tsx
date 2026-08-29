// L’entrée : adresse et mot de passe, puis le code reçu par email. Le second
// écran ne demande jamais de reprendre le premier — la tentative en cours vit
// dans un cookie, et c’est à elle que le code est lié (D49).

import {
  Alert,
  Button,
  Checkbox,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'

import { signIn, submitCode } from './api.js'

export function SignIn({
  site,
  onSignedIn,
}: {
  readonly site: string
  readonly onSignedIn: () => void
}) {
  const [step, setStep] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setBusy(true)

    const answer = await signIn(email, password)

    setBusy(false)

    if (!answer.ok) {
      setProblem(answer.message)
      return
    }

    setProblem('')
    setPassword('')

    if (answer.data.step === 'panel') onSignedIn()
    else setStep('code')
  }

  const finish = async () => {
    setBusy(true)

    const answer = await submitCode(code, remember)

    setBusy(false)

    if (!answer.ok) {
      setProblem(answer.message)
      setCode('')
      return
    }

    onSignedIn()
  }

  return (
    <div className="basalte-signin">
      <Paper withBorder p="xl" maw={420} w="100%">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void (step === 'password' ? start() : finish())
          }}
        >
          <Stack gap="md">
            <Title order={3}>{site}</Title>

            {problem !== '' && (
              <Alert color="red" variant="light">
                {problem}
              </Alert>
            )}

            {step === 'password' ? (
              <>
                <TextInput
                  label="Adresse email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                />
                <PasswordInput
                  label="Mot de passe"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                />
              </>
            ) : (
              <>
                <Text size="sm">
                  Un code à six chiffres vient de partir vers {email}. Il est
                  valable dix minutes.
                </Text>
                <TextInput
                  label="Code reçu par email"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(event.currentTarget.value)}
                />
                <Checkbox
                  label="Se souvenir de cet appareil pendant 30 jours"
                  checked={remember}
                  onChange={(event) => setRemember(event.currentTarget.checked)}
                />
              </>
            )}

            <Button type="submit" loading={busy} fullWidth>
              {step === 'password' ? 'Continuer' : 'Se connecter'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </div>
  )
}
