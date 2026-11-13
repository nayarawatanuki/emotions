import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/api'
import {
  loadChildren,
  formatCivilDate,
  type ChildPage
} from '../../features/children/children-api'
type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; page: ChildPage }
export function ChildDirectory({
  revision,
  busy,
  visible,
  onSelect,
  onRead,
  onUnauthorized
}: {
  revision: number
  busy: boolean
  visible: boolean
  onSelect: (id: string) => void
  onRead: () => void
  onUnauthorized: () => void
}) {
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [reload, setReload] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [previousRevision, setPreviousRevision] = useState(revision)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusNext = useRef(false)
  if (previousRevision !== revision) {
    setPreviousRevision(revision)
    setCursors([null])
    setState({ status: 'loading' })
  }
  const after = cursors.at(-1) ?? null
  useEffect(() => {
    const controller = new AbortController()
    loadChildren(after, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', page })
          onRead()
        }
      })
      .catch((failure) => {
        if (controller.signal.aborted) return
        if (failure instanceof ApiError && [401, 403].includes(failure.status))
          onUnauthorized()
        else setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [after, reload, revision, onRead, onUnauthorized])
  useEffect(() => {
    if (visible && state.status !== 'loading' && focusNext.current) {
      heading.current?.focus()
      focusNext.current = false
    }
  }, [visible, state.status])
  function refresh() {
    focusNext.current = true
    setState({ status: 'loading' })
    setCursors([null])
    setReload((value) => value + 1)
  }
  return (
    <section className="care-panel" aria-labelledby="children-directory-title">
      <div className="care-section-heading">
        <div>
          <p className="eyebrow">Percursos que você acompanha</p>
          <h2 ref={heading} tabIndex={-1} id="children-directory-title">
            Suas crianças
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
              Nenhuma criança nesta página. Cadastre uma criança acima ou volte
              à primeira página da lista.
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
              disabled={busy || cursors.length === 1}
              onClick={() => {
                focusNext.current = true
                setState({ status: 'loading' })
                setCursors((value) => value.slice(0, -1))
              }}
            >
              Página anterior
            </button>
            <span>Página {cursors.length}</span>
            <button
              className="secondary-button"
              disabled={busy || !state.page.nextCursor}
              onClick={() => {
                const next = state.page.nextCursor
                if (next) {
                  focusNext.current = true
                  setState({ status: 'loading' })
                  setCursors((value) => [...value, next])
                }
              }}
            >
              Próxima página
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
