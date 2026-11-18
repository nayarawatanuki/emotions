import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/api'

type DirectoryState<Page> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; page: Page }

export function useCursorDirectory<Page extends { nextCursor: string | null }>({
  revision,
  visible,
  load,
  onRead,
  onUnauthorized
}: {
  revision: number
  visible: boolean
  load: (cursor: string | null, signal: AbortSignal) => Promise<Page>
  onRead: () => void
  onUnauthorized: () => void
}) {
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [reload, setReload] = useState(0)
  const [state, setState] = useState<DirectoryState<Page>>({ status: 'loading' })
  const [previousRevision, setPreviousRevision] = useState(revision)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusNext = useRef(false)

  if (previousRevision !== revision) {
    setPreviousRevision(revision)
    setCursors([null])
    setState({ status: 'loading' })
  }

  const cursor = cursors.at(-1) ?? null
  useEffect(() => {
    const controller = new AbortController()
    load(cursor, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        setState({ status: 'ready', page })
        onRead()
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return
        if (failure instanceof ApiError && [401, 403].includes(failure.status))
          onUnauthorized()
        else setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [cursor, reload, revision, load, onRead, onUnauthorized])

  useEffect(() => {
    if (visible && state.status !== 'loading' && focusNext.current) {
      heading.current?.focus()
      focusNext.current = false
    }
  }, [visible, state.status])

  function reset(moveFocus: boolean) {
    focusNext.current = moveFocus
    setState({ status: 'loading' })
    setCursors([null])
  }

  function refresh() {
    reset(true)
    setReload((value) => value + 1)
  }

  function previousPage() {
    if (cursors.length === 1) return
    focusNext.current = true
    setState({ status: 'loading' })
    setCursors((value) => value.slice(0, -1))
  }

  function nextPage() {
    const next = state.status === 'ready' && state.page.nextCursor
    if (!next) return
    focusNext.current = true
    setState({ status: 'loading' })
    setCursors((value) => [...value, next])
  }

  return { state, heading, page: cursors.length, reset, refresh, previousPage, nextPage }
}
