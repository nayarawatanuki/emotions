import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AccessLayout } from '../../components/AccessLayout/AccessLayout'
import { PasswordField } from '../../components/PasswordField/PasswordField'
import { activateAccount } from '../../features/auth/auth-api'
import {
  passwordError,
  passwordHint
} from '../../features/auth/password-policy'
import { ApiError, requestError } from '../../services/api'

export function ActivateAccount({
  token,
  clearToken
}: {
  token: string | null
  clearToken: () => void
}) {
  const [complete, setComplete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalidPassword, setInvalidPassword] = useState(false)
  const pending = useRef(false)
  const feedback = useRef<HTMLParagraphElement>(null)
  const success = useRef<HTMLHeadingElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || pending.current) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const password = String(fields.get('password') ?? '')
    const confirmation = String(fields.get('confirmation') ?? '')
    const invalid =
      passwordError(password) ??
      (password !== confirmation
        ? 'As senhas precisam ser iguais. Confira os dois campos.'
        : null)
    setInvalidPassword(!!invalid)
    if (invalid) {
      setError(invalid)
      requestAnimationFrame(() => feedback.current?.focus())
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await activateAccount(token, password)
      setComplete(true)
      clearToken()
      requestAnimationFrame(() => success.current?.focus())
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 400) {
        clearToken()
      } else {
        setError(
          requestError(failure) +
            ' Se você já concluiu a ativação, tente entrar com sua senha.'
        )
        requestAnimationFrame(() => feedback.current?.focus())
      }
    } finally {
      form.reset()
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <AccessLayout>
      <p className="eyebrow">Primeiro acesso profissional</p>
      {complete ? (
        <>
          <h1 ref={success} tabIndex={-1}>
            Tudo pronto para começar.
          </h1>
          <output className="access-description">
            Sua conta foi ativada. Agora você pode entrar com seu usuário e a
            senha que escolheu.
          </output>
          <Link className="access-button" to="/login">
            Ir para o login
          </Link>
        </>
      ) : !token ? (
        <>
          <h1>Vamos cuidar do seu acesso?</h1>
          <p className="access-description">
            Abra o link completo enviado pelo ADM. Se ele já foi usado, expirou
            ou foi substituído, peça um novo convite.
          </p>
          <p className="form-notice">
            O convite vale por 24 horas e pode ser usado uma única vez. Se sua
            conta já foi ativada, basta entrar.
          </p>
          <Link className="access-button" to="/login">
            Ir para o login
          </Link>
        </>
      ) : (
        <>
          <h1>Seu percurso começa aqui.</h1>
          <p className="access-description">
            Escolha sua senha pessoal para ativar a conta. Use o usuário
            informado pelo ADM no login.
          </p>
          <form onSubmit={submit} aria-busy={busy}>
            <p id="password-hint" className="form-hint">
              {passwordHint}
            </p>
            <PasswordField
              id="password"
              label="Nova senha"
              autoComplete="new-password"
              disabled={busy}
              describedBy="password-hint activation-error"
              invalid={invalidPassword}
            />
            <PasswordField
              id="confirmation"
              label="Confirmar senha"
              autoComplete="new-password"
              disabled={busy}
              describedBy="activation-error"
              invalid={invalidPassword}
            />
            <p
              id="activation-error"
              className="form-feedback"
              role="alert"
              ref={feedback}
              tabIndex={-1}
            >
              {error}
            </p>
            <output className="visually-hidden">
              {busy ? 'Ativando sua conta.' : ''}
            </output>
            <button className="access-button" type="submit" disabled={busy}>
              {busy ? 'Ativando…' : 'Ativar minha conta'}
            </button>
          </form>
          <p className="access-privacy">
            Sua senha é pessoal. A administração não precisa conhecê-la.
          </p>
        </>
      )}
    </AccessLayout>
  )
}
