import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AccessLayout } from '../../components/AccessLayout/AccessLayout'
import { PasswordField } from '../../components/PasswordField/PasswordField'
import { login } from '../../features/auth/auth-api'
import { passwordError } from '../../features/auth/password-policy'
import { ApiError, requestError } from '../../services/api'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useRef(false)
  const feedback = useRef<HTMLParagraphElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const username = String(fields.get('username') ?? '')
      .trim()
      .toLowerCase()
    const password = String(fields.get('password') ?? '')
    const invalid = passwordError(password)
    if (
      invalid ||
      !username ||
      Array.from(username).length > 255 ||
      /[\p{Cc}\p{Cs}]/u.test(username)
    ) {
      setError(invalid ?? 'Informe um usuário válido, com até 255 caracteres.')
      requestAnimationFrame(() => feedback.current?.focus())
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await login(username, password)
      navigate('/workspace', { replace: true })
    } catch (failure) {
      setError(
        failure instanceof ApiError && [400, 401, 403].includes(failure.status)
          ? 'Não foi possível entrar. Confira usuário e senha. Se ainda não ativou sua conta, use o convite recebido do ADM.'
          : requestError(failure)
      )
      requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      const input = form.elements.namedItem('password')
      if (input instanceof HTMLInputElement) input.value = ''
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <AccessLayout>
      <p className="eyebrow">Acesso profissional e administrativo</p>
      <h1>Que bom ter você aqui.</h1>
      <p className="access-description">
        Entre para continuar seu percurso no Emotions.
      </p>
      {location.state?.reason === 'session-ended' && (
        <output className="form-notice">
          Sua sessão terminou. Entre novamente para continuar.
        </output>
      )}
      <form onSubmit={submit} aria-busy={busy}>
        <div className="form-field">
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            name="username"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={510}
            disabled={busy}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <PasswordField
          id="password"
          label="Senha"
          autoComplete="current-password"
          disabled={busy}
          describedBy={error ? 'login-error' : undefined}
        />
        <p
          id="login-error"
          className="form-feedback"
          role="alert"
          ref={feedback}
          tabIndex={-1}
        >
          {error}
        </p>
        <output className="visually-hidden">
          {busy ? 'Conferindo seu acesso.' : ''}
        </output>
        <button className="access-button" type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <div className="access-help">
        <h2>É seu primeiro acesso?</h2>
        <p>
          Abra o link de ativação entregue pelo ADM. Se precisar de outro
          convite ou de ajuda com sua senha, fale com a administração.
        </p>
      </div>
      <Link className="access-home-link" to="/">
        Conhecer o Emotions
      </Link>
    </AccessLayout>
  )
}
