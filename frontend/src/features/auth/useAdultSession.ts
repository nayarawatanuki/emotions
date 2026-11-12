import { useCallback, useEffect, useState, type RefObject } from 'react'
import { ApiError } from '../../services/api'
import { loadSession, type AdultSession } from './auth-api'

export function useAdultSession(mutating: RefObject<boolean>) {
  const [session, setSession] = useState<AdultSession | null>(null)
  const [status, setStatus] = useState<
    'checking' | 'ready' | 'anonymous' | 'error'
  >('checking')
  const [attempt, setAttempt] = useState(0)
  const end = useCallback(() => {
    setSession(null)
    setStatus('anonymous')
  }, [])
  const refresh = useCallback(() => {
    setStatus('checking')
    setAttempt((value) => value + 1)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    loadSession(controller.signal)
      .then((current) => {
        if (!controller.signal.aborted) {
          setSession(current)
          setStatus('ready')
        }
      })
      .catch((failure) => {
        if (controller.signal.aborted) return
        setSession(null)
        setStatus(
          failure instanceof ApiError && [401, 403].includes(failure.status)
            ? 'anonymous'
            : 'error'
        )
      })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => {
    const focus = () => {
      if (!mutating.current) refresh()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') focus()
    }
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [mutating, refresh])
  useEffect(() => {
    if (!session) return
    const deadline = Math.min(
      Date.parse(session.expiresAt),
      Date.parse(session.idleExpiresAt)
    )
    const timer = setTimeout(end, Math.max(0, deadline - Date.now()))
    return () => clearTimeout(timer)
  }, [session, end])
  return { session, status, refresh, end }
}
