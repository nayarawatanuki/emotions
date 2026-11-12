import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AccessLayout } from '../../components/AccessLayout/AccessLayout'
import {
  loadSession,
  logout,
  type AdultSession
} from '../../features/auth/auth-api'
import { ApiError, requestError } from '../../services/api'

type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error' }
  | { status: 'authenticated'; session: AdultSession }

export function Workspace() {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    loadSession(controller.signal)
      .then((session) => {
        if (!controller.signal.aborted)
          setState({ status: 'authenticated', session })
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setState({
            status:
              failure instanceof ApiError && failure.status === 401
                ? 'anonymous'
                : 'error'
          })
      })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    const check = () => {
      if (!pending.current) {
        setState({ status: 'loading' })
        setAttempt((value) => value + 1)
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  useEffect(() => {
    if (state.status !== 'authenticated') return
    const deadline = Math.min(
      Date.parse(state.session.expiresAt),
      Date.parse(state.session.idleExpiresAt)
    )
    const timer = setTimeout(
      () => setState({ status: 'anonymous' }),
      Math.max(0, deadline - Date.now())
    )
    return () => clearTimeout(timer)
  }, [state])

  async function leave() {
    if (state.status !== 'authenticated' || pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await logout(state.session.csrfToken)
      navigate('/login', { replace: true })
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401)
        setState({ status: 'anonymous' })
      else
        setError(
          requestError(failure) +
            ' Sua saída ainda não foi confirmada. Tente novamente.'
        )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (state.status === 'anonymous')
    return <Navigate to="/login" replace state={{ reason: 'session-ended' }} />
  return (
    <AccessLayout>
      {state.status === 'loading' ? (
        <>
          <h1>Preparando seu espaço.</h1>
          <output>Conferindo sua sessão…</output>
        </>
      ) : state.status === 'error' ? (
        <>
          <h1>Vamos tentar de novo?</h1>
          <p className="access-description" role="alert">
            Não conseguimos conferir sua sessão. Seu acesso precisa ser
            confirmado para continuar.
          </p>
          <button
            className="access-button"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((value) => value + 1)
            }}
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          <p className="eyebrow">
            {state.session.user.role === 'administrator'
              ? 'Área administrativa'
              : 'Área profissional'}
          </p>
          <h1>Olá, {state.session.user.name}.</h1>
          <p className="access-description">
            Seu acesso ao Emotions está confirmado.
          </p>
          <div className="access-help">
            <h2>Estamos preparando os próximos passos.</h2>
            <p>
              As ferramentas de acompanhamento e organização estarão disponíveis
              em breve.
            </p>
          </div>
          <p className="form-feedback" role="alert">
            {error}
          </p>
          <button className="access-button" onClick={leave} disabled={busy}>
            {busy ? 'Saindo…' : 'Sair da conta'}
          </button>
          <output className="visually-hidden">
            {busy ? 'Encerrando sua sessão.' : ''}
          </output>
        </>
      )}
    </AccessLayout>
  )
}
