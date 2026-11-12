import { useCallback, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AccessLayout } from '../../components/AccessLayout/AccessLayout'
import { logout } from '../../features/auth/auth-api'
import { useAdultSession } from '../../features/auth/useAdultSession'
import { Administration } from '../Administration/Administration'
import { ApiError, requestError } from '../../services/api'

export function Workspace() {
  const pending = useRef(false)
  const { session, status, refresh, end } = useAdultSession(pending)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const changeBusy = useCallback((value: boolean) => {
    pending.current = value
    setBusy(value)
  }, [])
  async function leave() {
    if (!session || pending.current || status !== 'ready') return
    changeBusy(true)
    setError('')
    try {
      await logout(session.csrfToken)
      navigate('/login', { replace: true })
    } catch (failure) {
      if (failure instanceof ApiError && [401, 403].includes(failure.status))
        end()
      else
        setError(
          requestError(failure) +
            ' Sua saída ainda não foi confirmada. Tente novamente.'
        )
    } finally {
      changeBusy(false)
    }
  }
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ reason: 'session-ended' }} />
  return (
    <AccessLayout wide={session?.user.role === 'administrator'}>
      {status === 'checking' && (
        <div>
          <h1>Preparando seu espaço.</h1>
          <output>Conferindo sua sessão…</output>
        </div>
      )}
      {status === 'error' && (
        <div>
          <h1>Vamos tentar de novo?</h1>
          <p className="access-description" role="alert">
            Não conseguimos conferir sua sessão. Seu acesso precisa ser
            confirmado para continuar.
          </p>
          <button className="access-button" onClick={refresh}>
            Tentar novamente
          </button>
        </div>
      )}
      {session && (
        <div hidden={status !== 'ready'}>
          <p className="eyebrow">
            {session.user.role === 'administrator'
              ? 'Área administrativa'
              : 'Área profissional'}
          </p>
          <div className="workspace-heading">
            <div>
              <h1>Olá, {session.user.name}.</h1>
              <p className="access-description">
                {session.user.role === 'administrator'
                  ? 'Cuide dos acessos de quem acompanha cada descoberta.'
                  : 'Seu acesso ao Emotions está confirmado.'}
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={leave}
              disabled={busy}
            >
              {busy ? 'Aguarde…' : 'Sair da conta'}
            </button>
          </div>
          <p className="form-feedback" role="alert">
            {error}
          </p>
          {session.user.role === 'administrator' ? (
            <Administration
              visible={status === 'ready'}
              session={session}
              disabled={busy}
              onBusyChange={changeBusy}
              onUnauthorized={end}
              onSessionRefresh={refresh}
            />
          ) : (
            <div className="access-help">
              <h2>Estamos preparando os próximos passos.</h2>
              <p>
                As ferramentas de acompanhamento e organização estarão
                disponíveis em breve.
              </p>
            </div>
          )}
        </div>
      )}
    </AccessLayout>
  )
}
