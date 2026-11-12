import { useRef, useState } from 'react'
import type { AdultSession } from '../../features/auth/auth-api'
import {
  createProfessional,
  reissueInvitation,
  type ProfessionalInvitation,
  type ProfessionalSummary
} from '../../features/professionals/professionals-api'
import { ProfessionalForm } from '../../components/ProfessionalForm/ProfessionalForm'
import { ProfessionalDirectory } from '../../components/ProfessionalDirectory/ProfessionalDirectory'
import { InvitationCard } from '../../components/InvitationCard/InvitationCard'
import { ReissueDialog } from '../../components/ReissueDialog/ReissueDialog'
import { ApiError } from '../../services/api'
import './Administration.css'

export function Administration({
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
  const [invitation, setInvitation] = useState<ProfessionalInvitation | null>(
    null
  )
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null)
  const [selected, setSelected] = useState<ProfessionalSummary | null>(null)
  const [revision, setRevision] = useState(0)
  const pending = useRef(false)
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
      onBusyChange(selected !== null)
    }
  }
  async function create(input: { name: string; username: string }) {
    const result = await perform(() =>
      createProfessional(input, session.csrfToken, window.location.origin)
    )
    setInvitation(result)
    setRevision((value) => value + 1)
    onSessionRefresh()
  }
  async function reissue() {
    if (!selected) return
    // Never keep displaying a previous secret after an attempted rotation with an uncertain response.
    if (invitation?.professional.id === selected.id) setInvitation(null)
    const activation = await perform(() =>
      reissueInvitation(selected.id, session.csrfToken, window.location.origin)
    )
    setInvitation({ professional: selected, activation })
    setSelected(null)
    onBusyChange(false)
    setRevision((value) => value + 1)
    onSessionRefresh()
  }
  return (
    <div className="administration">
      <ProfessionalForm disabled={disabled} onSubmit={create} />
      {invitation && (
        <InvitationCard
          visible={visible}
          key={invitation.activation.url}
          invitation={invitation}
          onDismiss={() => setInvitation(null)}
        />
      )}
      <ProfessionalDirectory
        visible={visible}
        revision={revision}
        busy={disabled}
        onReissue={(item) => {
          setReturnFocus(
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null
          )
          setSelected(item)
          onBusyChange(true)
        }}
        onUnauthorized={onUnauthorized}
        onRead={onSessionRefresh}
      />
      {selected && (
        <ReissueDialog
          returnFocus={returnFocus}
          professional={selected}
          onConfirm={reissue}
          onCancel={() => {
            setSelected(null)
            onBusyChange(false)
          }}
        />
      )}
    </div>
  )
}
