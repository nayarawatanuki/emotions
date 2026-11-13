import { useRef, useState } from 'react'
import type { AdultSession } from '../../features/auth/auth-api'
import { ApiError, requestError } from '../../services/api'
import {
  createChild,
  updateChild,
  loadChild,
  type ChildView,
  type CreateChildInput
} from '../../features/children/children-api'
import { ChildForm } from '../../components/ChildForm/ChildForm'
import { ChildDirectory } from '../../components/ChildDirectory/ChildDirectory'
import { ChildDetails } from '../../components/ChildDetails/ChildDetails'
import './ProfessionalCare.css'
export function ProfessionalCare({
  session,
  disabled,
  visible,
  onBusyChange,
  onUnauthorized,
  onSessionRefresh
}: {
  session: AdultSession
  disabled: boolean
  visible: boolean
  onBusyChange: (busy: boolean) => void
  onUnauthorized: () => void
  onSessionRefresh: () => void
}) {
  const [editing, setEditing] = useState<ChildView | null>(null)
  const [detail, setDetail] = useState<ChildView | null>(null)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const pending = useRef(false)
  const feedback = useRef<HTMLParagraphElement>(null)
  async function perform<T>(operation: () => Promise<T>): Promise<T> {
    if (pending.current) throw new ApiError(409)
    pending.current = true
    onBusyChange(true)
    try {
      return await operation()
    } catch (failure) {
      if (failure instanceof ApiError && [401, 403].includes(failure.status))
        onUnauthorized()
      throw failure
    } finally {
      pending.current = false
      onBusyChange(false)
    }
  }
  async function create(input: CreateChildInput) {
    const child = await perform(() => createChild(input, session.csrfToken))
    setDetail(child)
    setRevision((value) => value + 1)
    setError('')
    onSessionRefresh()
  }
  async function save(input: CreateChildInput) {
    if (!editing) return
    const child = await perform(() =>
      updateChild(editing.id, input, editing.revision, session.csrfToken)
    )
    setDetail(child)
    setEditing(null)
    setRevision((value) => value + 1)
    setError('')
    onSessionRefresh()
  }
  async function reloadEditing() {
    if (!editing) return
    const child = await perform(() => loadChild(editing.id))
    setDetail(child)
    setEditing(null)
    setError('')
    onSessionRefresh()
  }
  async function select(id: string) {
    setDetail(null)
    setError('')
    setReading(true)
    try {
      setDetail(await perform(() => loadChild(id)))
      onSessionRefresh()
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 404
          ? 'Não encontramos esse cadastro entre as crianças do seu acompanhamento. Atualize a lista.'
          : requestError(failure)
      )
      requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      setReading(false)
    }
  }
  return (
    <div className="professional-care">
      <ChildForm
        key={editing ? editing.id + editing.revision : 'new'}
        initial={editing ?? undefined}
        disabled={disabled}
        onSubmit={editing ? save : create}
        onCancel={() => setEditing(null)}
        onReload={reloadEditing}
      />
      <p className="form-feedback" role="alert" ref={feedback} tabIndex={-1}>
        {error}
      </p>
      {reading && (
        <output className="care-status">Consultando cadastro…</output>
      )}
      {detail && !editing && (
        <ChildDetails
          key={detail.id}
          child={detail}
          disabled={disabled}
          onEdit={() => {
            setEditing(detail)
            requestAnimationFrame(() =>
              document.getElementById('child-form-title')?.focus()
            )
          }}
          visible={visible}
          onClose={() => {
            setDetail(null)
            requestAnimationFrame(() =>
              document.getElementById('children-directory-title')?.focus()
            )
          }}
        />
      )}
      <ChildDirectory
        revision={revision}
        busy={disabled || editing !== null}
        visible={visible}
        onSelect={select}
        onRead={onSessionRefresh}
        onUnauthorized={onUnauthorized}
      />
    </div>
  )
}
