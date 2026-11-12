import { useEffect, useRef, useState } from 'react'
import type { ProfessionalSummary } from '../../features/professionals/professionals-api'
import { ApiError, requestError } from '../../services/api'

export function ReissueDialog({
  professional,
  onConfirm,
  onCancel,
  returnFocus
}: {
  returnFocus: HTMLElement | null
  professional: ProfessionalSummary
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const cancelButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current
    const opener = returnFocus
    element?.showModal()
    cancelButton.current?.focus()
    return () => {
      element?.close()
      requestAnimationFrame(() => {
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
      })
    }
  }, [returnFocus])
  async function confirm() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (failure) {
      setError(
        failure instanceof ApiError && [404, 409].includes(failure.status)
          ? 'Não é possível reemitir neste estado. Atualize a lista para conferir se a conta já foi ativada ou alterada.'
          : requestError(failure) +
              ' Se a solicitação foi concluída, o convite anterior já pode estar inválido. Uma nova reemissão substituirá o link atual.'
      )
      requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="reissue-dialog"
      aria-labelledby="reissue-title"
      aria-describedby="reissue-description"
      onCancel={(event) => {
        if (busy) event.preventDefault()
        else onCancel()
      }}
    >
      <h2 id="reissue-title">Gerar outro convite?</h2>
      <p id="reissue-description">
        O convite anterior de <strong>{professional.name}</strong> (
        {professional.username}) deixará de funcionar. O novo valerá por 24
        horas. O histórico será preservado.
      </p>
      <p ref={feedback} className="form-feedback" tabIndex={-1} role="alert">
        {error}
      </p>
      <div className="admin-actions">
        <button
          ref={cancelButton}
          className="secondary-button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="access-button admin-primary"
          disabled={busy}
          onClick={confirm}
        >
          {busy ? 'Gerando…' : 'Confirmar reemissão'}
        </button>
      </div>
      <output className="visually-hidden">
        {busy ? 'Gerando um novo convite.' : ''}
      </output>
    </dialog>
  )
}
