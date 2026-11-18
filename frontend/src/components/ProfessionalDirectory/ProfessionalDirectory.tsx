import { useCursorDirectory } from '../../features/directory/useCursorDirectory'
import {
  loadProfessionals,
  type ProfessionalSummary
} from '../../features/professionals/professionals-api'
import { professionalStatusLabels } from '../../features/professionals/professional-input'

export function ProfessionalDirectory({
  revision,
  busy,
  visible,
  onReissue,
  onUnauthorized,
  onRead
}: {
  revision: number
  busy: boolean
  visible: boolean
  onReissue: (item: ProfessionalSummary) => void
  onUnauthorized: () => void
  onRead: () => void
}) {
  const { state, heading, page, refresh, previousPage, nextPage } =
    useCursorDirectory({ revision, visible, load: loadProfessionals, onRead, onUnauthorized })
  return (
    <section
      className="admin-panel"
      aria-labelledby="professional-directory-title"
    >
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Acessos da equipe</p>
          <h2 ref={heading} tabIndex={-1} id="professional-directory-title">
            Profissionais
          </h2>
        </div>
        <button
          className="secondary-button"
          disabled={busy || state.status === 'loading'}
          onClick={refresh}
        >
          Atualizar lista
        </button>
      </div>
      <p className="form-hint">
        Confira a situação da conta antes de entregar ou reemitir um convite. A
        lista mostra até 25 profissionais por página.
      </p>
      {state.status === 'loading' ? (
        <output className="admin-status">Carregando profissionais…</output>
      ) : state.status === 'error' ? (
        <div>
          <p className="form-feedback" role="alert">
            Não conseguimos carregar os profissionais. Tente atualizar a lista.
          </p>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={refresh}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {state.page.items.length === 0 ? (
            <p className="form-notice">
              Nenhum profissional nesta página. Você pode cadastrar um novo
              profissional acima ou voltar ao início da lista.
            </p>
          ) : (
            <ul className="professional-list">
              {state.page.items.map((item) => (
                <li key={item.id}>
                  <div className="professional-identity">
                    <h3>{item.name}</h3>
                    <p>Usuário: {item.username}</p>
                    <span
                      className={`professional-status status-${item.status}`}
                    >
                      {item.archived
                        ? 'Perfil arquivado'
                        : professionalStatusLabels[item.status]}
                    </span>
                  </div>
                  {item.status === 'pending' && !item.archived ? (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => onReissue(item)}
                    >
                      Reemitir convite
                      <span className="visually-hidden"> para {item.name}</span>
                    </button>
                  ) : (
                    <p className="form-hint">
                      {item.archived || item.status === 'suspended'
                        ? 'Convites indisponíveis para esta conta.'
                        : 'Primeiro acesso concluído.'}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <nav
            className="admin-pagination"
            aria-label="Páginas de profissionais"
          >
            <button
              className="secondary-button"
              disabled={busy || page === 1}
              onClick={previousPage}
            >
              Página anterior
            </button>
            <span>Página {page}</span>
            <button
              className="secondary-button"
              disabled={busy || !state.page.nextCursor}
              onClick={nextPage}
            >
              Próxima página
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
