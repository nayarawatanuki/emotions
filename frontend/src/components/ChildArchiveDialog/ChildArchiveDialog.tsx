import { useEffect, useRef, useState } from 'react'
import type { ChildView } from '../../features/children/children-api'
import { ApiError, requestError } from '../../services/api'
import './ChildArchiveDialog.css'

export function ChildArchiveDialog({
  child,
  visible,
  returnFocus,
  onConfirm,
  onReload,
  onCancel
}: {
  child: ChildView
  visible: boolean
  returnFocus: HTMLElement
  onConfirm: () => Promise<void>
  onReload: () => Promise<void>
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current
    if (visible) {
      element?.showModal()
      cancel.current?.focus()
    } else element?.close()
  }, [visible])
  useEffect(() => {
    const element = dialog.current
    return () => {
      element?.close()
      requestAnimationFrame(() => {
        if (returnFocus.isConnected && !returnFocus.hasAttribute('disabled'))
          returnFocus.focus()
      })
    }
  }, [returnFocus])
  async function perform(operation: () => Promise<void>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    try {
      await operation()
    } catch (failure) {
      setError(
        failure instanceof ApiError && [404, 409].includes(failure.status)
          ? 'A ficha mudou ou não está mais disponível. Consulte a versão atual antes de tentar novamente.'
          : requestError(failure) +
              ' O resultado da operação pode não ter sido confirmado. Consulte a ficha atual antes de tentar novamente.'
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
      className="child-archive-dialog"
      aria-labelledby="child-archive-title"
      aria-describedby="child-archive-description"
      onCancel={(event) => {
        if (busy) event.preventDefault()
        else onCancel()
      }}
    >
      <h2 id="child-archive-title">
        {child.archived ? 'Desarquivar cadastro?' : 'Arquivar cadastro?'}
      </h2>
      <p id="child-archive-description">
        {child.archived ? (
          <>
            O cadastro de <strong>{child.name}</strong> voltará à lista
            principal e poderá ser editado. Isso não reativa credenciais nem
            altera o acompanhamento informado.
          </>
        ) : (
          <>
            O cadastro de <strong>{child.name}</strong> ficará disponível na
            lista de arquivados, apenas para consulta. O acesso infantil será
            bloqueado. A ficha, as atividades e os resultados serão preservados.
          </>
        )}
      </p>
      <p className="form-feedback" ref={feedback} tabIndex={-1} role="alert">
        {error}
      </p>
      <div className="care-detail-actions">
        <button
          ref={cancel}
          className="secondary-button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
        {error ? (
          <button
            className="access-button care-primary"
            disabled={busy}
            onClick={() => perform(onReload)}
          >
            Consultar ficha atual
          </button>
        ) : (
          <button
            className="access-button care-primary"
            disabled={busy}
            onClick={() => perform(onConfirm)}
          >
            {child.archived
              ? 'Confirmar desarquivamento'
              : 'Confirmar arquivamento'}
          </button>
        )}
      </div>
      <output className="care-status">
        {busy ? 'Aguarde a confirmação…' : ''}
      </output>
    </dialog>
  )
}
