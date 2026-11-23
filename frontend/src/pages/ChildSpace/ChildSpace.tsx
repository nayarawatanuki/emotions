import { useRef, useState } from 'react'
import { Navigate } from 'react-router'
import { AccessLayout } from '../../components/AccessLayout/AccessLayout'
import { logout } from '../../features/auth/auth-api'
import { useChildSession } from '../../features/auth/useAdultSession'
import { requestError } from '../../services/api'

export function ChildSpace() {
  const pending = useRef(false)
  const { session, status, refresh, end } = useChildSession(pending)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function leave() {
    if (!session || pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await logout(session.csrfToken)
      end()
    } catch (failure) {
      setError(requestError(failure))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (status === 'anonymous') {
    return <Navigate to="/child/login" replace state={{ reason: 'session-ended' }} />
  }

  return (
    <AccessLayout>
      {status === 'error' ? (
        <>
          <h1>Seu espaço</h1>
          <p role="alert">Não foi possível abrir seu espaço.</p>
          <button className="access-button" onClick={refresh}>Tentar de novo</button>
        </>
      ) : !session ? (
        <output>Carregando seu espaço…</output>
      ) : (
        <>
          <h1>Olá, {session.user.name}!</h1>
          <button className="access-button" disabled={busy || status === 'checking'} onClick={leave}>
            {busy ? 'Saindo…' : 'Sair'}
          </button>
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </AccessLayout>
  )
}
