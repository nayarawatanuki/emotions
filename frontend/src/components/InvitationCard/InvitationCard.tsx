import { useEffect, useRef, useState } from 'react'
import type { ActivationInvitation } from '../../features/auth/invitation'

export function InvitationCard({
  activation,
  recipient,
  child = false,
  onDismiss,
  visible
}: {
  visible: boolean
  activation: ActivationInvitation
  recipient: { name: string; username: string }
  child?: boolean
  onDismiss: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const [message, setMessage] = useState('')
  const [copying, setCopying] = useState(false)
  const focused = useRef(false)
  useEffect(() => {
    if (visible && !focused.current) {
      heading.current?.focus()
      focused.current = true
    }
  }, [visible])
  async function copy() {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(activation.url)
      setMessage(child
        ? 'Convite copiado. Entregue somente ao responsável pela criança.'
        : 'Convite copiado. Entregue somente ao profissional indicado.')
    } catch {
      field.current?.focus()
      field.current?.select()
      setMessage(
        'A cópia automática não está disponível. Copie o link selecionado pelo teclado ou pelo menu do dispositivo.'
      )
    } finally {
      setCopying(false)
    }
  }
  return (
    <section
      className="admin-invitation admin-panel"
      aria-labelledby="invitation-title"
    >
      <p className="eyebrow">Próximo passo: entregar o acesso</p>
      <h2 id="invitation-title" ref={heading} tabIndex={-1}>
        Convite de {recipient.name}
      </h2>
      <p>
        Usuário: <strong>{recipient.username}</strong>
      </p>
      <p>
        Válido até{' '}
        <time dateTime={activation.expiresAt}>
          {new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
          }).format(new Date(activation.expiresAt))}
        </time>
        , no horário deste dispositivo.
      </p>
      <div className="form-field">
        <label htmlFor="activation-invitation">Link pessoal de ativação</label>
        <textarea
          ref={field}
          id="activation-invitation"
          readOnly
          value={activation.url}
          rows={3}
          spellCheck={false}
          aria-describedby="invitation-care"
        />
      </div>
      <p id="invitation-care" className="form-hint">
        Entregue por um canal confiável. O link pode ser usado uma única vez e
        não ficará disponível ao sair ou recarregar esta página. Uma reemissão
        invalida o anterior.
      </p>
      <div className="admin-actions">
        <button
          className="access-button admin-primary"
          disabled={copying}
          onClick={copy}
        >
          {copying ? 'Copiando…' : 'Copiar convite'}
        </button>
        <button className="secondary-button" onClick={onDismiss}>
          Ocultar convite
        </button>
      </div>
      <output className="admin-status">{message}</output>
    </section>
  )
}
