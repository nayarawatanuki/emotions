import { useEffect, useRef } from 'react'
import {
  formatCivilDate,
  type ChildView
} from '../../features/children/children-api'
export function ChildDetails({
  child,
  visible,
  onClose,
  onEdit,
  onArchive,
  disabled = false
}: {
  disabled?: boolean
  onEdit?: () => void
  onArchive?: (opener: HTMLElement) => void
  child: ChildView
  visible: boolean
  onClose: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const focused = useRef(false)
  useEffect(() => {
    if (visible && !focused.current) {
      heading.current?.focus()
      focused.current = true
    }
  }, [visible])
  return (
    <section
      className="care-panel child-details"
      aria-labelledby="child-details-title"
    >
      <p className="eyebrow">Informações do acompanhamento</p>
      <h2 ref={heading} tabIndex={-1} id="child-details-title">
        {child.name}
      </h2>
      {child.archived && <p className="form-notice">Cadastro arquivado.</p>}
      <dl>
        <div>
          <dt>Usuário reservado</dt>
          <dd>{child.username}</dd>
        </div>
        <div>
          <dt>Nascimento</dt>
          <dd>
            <time dateTime={child.dateOfBirth}>
              {formatCivilDate(child.dateOfBirth)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Responsável</dt>
          <dd>{child.guardianName}</dd>
        </div>
        <div>
          <dt>Acompanhamento ativo</dt>
          <dd>{child.treatmentActive ? 'Sim' : 'Não'}</dd>
        </div>
        <div>
          <dt>Nível informado</dt>
          <dd>{child.reportedLevel ?? 'Não informado'}</dd>
        </div>
        <div className="care-full">
          <dt>Observações</dt>
          <dd className="child-notes">
            {child.notes ?? 'Nenhuma observação registrada.'}
          </dd>
        </div>
      </dl>
      <div className="care-detail-actions">
        {onArchive && (
          <button
            className="secondary-button"
            disabled={disabled}
            onClick={(event) => onArchive(event.currentTarget)}
          >
            {child.archived ? 'Desarquivar cadastro' : 'Arquivar cadastro'}
          </button>
        )}
        {!child.archived && onEdit && (
          <button
            className="access-button care-primary"
            disabled={disabled}
            onClick={onEdit}
          >
            Editar cadastro
          </button>
        )}
        <button
          className="secondary-button"
          disabled={disabled}
          onClick={onClose}
        >
          Fechar informações
        </button>
      </div>
    </section>
  )
}
