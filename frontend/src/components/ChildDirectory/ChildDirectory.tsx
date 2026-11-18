import { useCursorDirectory } from '../../features/directory/useCursorDirectory'
import { useCallback } from 'react'
import {
  loadChildren,
  formatCivilDate
} from '../../features/children/children-api'
export function ChildDirectory({
  revision,
  archived,
  onArchivedChange,
  busy,
  visible,
  onSelect,
  onRead,
  onUnauthorized
}: {
  revision: number
  archived: boolean
  onArchivedChange: (archived: boolean) => void
  busy: boolean
  visible: boolean
  onSelect: (id: string) => void
  onRead: () => void
  onUnauthorized: () => void
}) {
  const load = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      loadChildren(cursor, signal, archived),
    [archived]
  )
  const { state, heading, page, refresh, previousPage, nextPage, reset } =
    useCursorDirectory({ revision, visible, load: load, onRead, onUnauthorized })
  return (
    <section className="care-panel" aria-labelledby="children-directory-title">
      <div className="care-section-heading">
        <div>
          <p className="eyebrow">Percursos que você acompanha</p>
          <h2 ref={heading} tabIndex={-1} id="children-directory-title">
            {archived ? 'Fichas arquivadas' : 'Suas crianças'}
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
      <fieldset className="care-directory-filter" disabled={busy}>
        <legend>Mostrar cadastros</legend>
        {[false, true].map((value) => (
          <label key={String(value)}>
            <input
              type="radio"
              name="children-archive-filter"
              checked={archived === value}
              onChange={() => {
                reset(false)
                onArchivedChange(value)
              }}
            />
            {value ? 'Arquivados' : 'Não arquivados'}
          </label>
        ))}
      </fieldset>
      {state.status === 'loading' ? (
        <output className="care-status">Carregando cadastros…</output>
      ) : state.status === 'error' ? (
        <>
          <p className="form-feedback" role="alert">
            Não conseguimos carregar os cadastros.
          </p>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={refresh}
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          {state.page.items.length === 0 ? (
            <p className="form-notice">
              {archived
                ? 'Nenhuma ficha arquivada nesta página.'
                : 'Nenhuma criança nesta página. Cadastre uma criança acima ou volte à primeira página da lista.'}
            </p>
          ) : (
            <ul className="children-list">
              {state.page.items.map((child) => (
                <li key={child.id}>
                  <div className="child-identity">
                    <h3>{child.name}</h3>
                    <p>Usuário: {child.username}</p>
                    <p>
                      Nascimento:{' '}
                      <time dateTime={child.dateOfBirth}>
                        {formatCivilDate(child.dateOfBirth)}
                      </time>
                    </p>
                    <span className="child-status">
                      {child.archived
                        ? 'Cadastro arquivado'
                        : child.treatmentActive
                          ? 'Acompanhamento ativo'
                          : 'Acompanhamento inativo'}
                    </span>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => onSelect(child.id)}
                  >
                    Ver cadastro
                    <span className="visually-hidden"> de {child.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <nav className="care-pagination" aria-label="Páginas de crianças">
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
