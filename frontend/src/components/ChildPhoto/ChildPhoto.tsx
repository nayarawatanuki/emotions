import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  childPhotoTypes,
  loadChildPhoto,
  type ChildView
} from '../../features/children/children-api'
import { ApiError, requestError } from '../../services/api'
import './ChildPhoto.css'

function uploadError(failure: unknown) {
  if (failure instanceof ApiError) {
    switch (failure.status) {
      case 400:
        return 'O arquivo está vazio ou a imagem está inválida.'
      case 409:
        return 'A ficha mudou. Atualize as informações antes de tentar novamente.'
      case 413:
        return 'A foto deve ter até 5 MiB.'
      case 415:
        return 'Escolha uma imagem estática JPEG, PNG ou WebP.'
      case 404:
        return 'O envio de fotos está indisponível para esta ficha.'
    }
  }
  return requestError(failure)
}

export function ChildPhoto({
  child,
  visible,
  disabled,
  onUpload,
  onReload,
  onUnauthorized
}: {
  child: ChildView
  visible: boolean
  disabled: boolean
  onUpload: (file: File) => Promise<void>
  onReload: () => Promise<void>
  onUnauthorized: () => void
}) {
  const id = useId()
  const [preview, setPreview] = useState<
    { status: 'loading' | 'empty' | 'error' } | { status: 'ready'; url: string }
  >({ status: 'loading' })
  const submitButton = useRef<HTMLButtonElement>(null)
  const focusSubmit = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    if (!visible) return

    const controller = new AbortController()
    let url: string | undefined
    loadChildPhoto(child.id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return
        if (blob) {
          url = URL.createObjectURL(blob)
          setPreview({ status: 'ready', url })
        } else setPreview({ status: 'empty' })
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return
        if (failure instanceof ApiError && [401, 403].includes(failure.status))
          onUnauthorized()
        else setPreview({ status: 'error' })
      })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
      setPreview({ status: 'loading' })
    }
  }, [child.id, child.revision, visible, attempt, onUnauthorized])

  useEffect(() => {
    if (visible && !disabled && !working && focusSubmit.current) {
      focusSubmit.current = false
      submitButton.current?.focus()
    }
  }, [visible, disabled, working])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || working || conflict) return
    const form = event.currentTarget
    const file = new FormData(form).get('photo')
    if (!(file instanceof File) || !file.name) {
      setError('Selecione uma foto antes de enviar.')
      return
    }

    setError('')
    setNotice('Enviando foto…')
    setWorking(true)
    try {
      await onUpload(file)
      form.reset()
      focusSubmit.current = true
      setNotice('Foto salva na ficha.')
    } catch (failure) {
      setConflict(failure instanceof ApiError && failure.status === 409)
      setNotice('')
      setError(uploadError(failure))
    } finally {
      setWorking(false)
    }
  }

  async function reload() {
    if (disabled || working) return
    setWorking(true)
    setError('')
    try {
      await onReload()
      setConflict(false)
      focusSubmit.current = true
      setNotice('Ficha atualizada. Você pode tentar enviar a foto novamente.')
    } catch (failure) {
      setError(requestError(failure))
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="child-photo" aria-labelledby={id + '-title'}>
      <h3 id={id + '-title'}>Foto da ficha</h3>
      {preview.status === 'ready' && (
        <img
          src={preview.url}
          alt="Foto da criança cadastrada nesta ficha"
          onError={() => setPreview({ status: 'error' })}
        />
      )}
      <output>
        {preview.status === 'loading' && 'Carregando foto…'}
        {preview.status === 'empty' && 'Nenhuma foto disponível nesta ficha.'}
      </output>
      {preview.status === 'error' && (
        <div>
          <p role="alert">Não conseguimos mostrar a foto.</p>
          <button
            type="button"
            className="secondary-button"
            disabled={disabled}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tentar carregar a foto novamente
          </button>
        </div>
      )}
      <form onSubmit={submit}>
        <label htmlFor={id + '-file'}>Selecionar foto</label>
        <input
          id={id + '-file'}
          name="photo"
          type="file"
          accept={childPhotoTypes.join(',')}
          aria-describedby={id + '-hint'}
          disabled={disabled || working}
          required
        />
        <p id={id + '-hint'} className="form-hint">
          JPEG, PNG ou WebP estático, até 5 MiB. O envio substitui a foto atual.
        </p>
        <button
          ref={submitButton}
          type="submit"
          className="secondary-button"
          aria-disabled={disabled || working || conflict}
        >
          Salvar foto
        </button>
        {conflict && (
          <button
            type="button"
            className="secondary-button"
            disabled={disabled || working}
            onClick={reload}
          >
            Atualizar informações da ficha
          </button>
        )}
        <output>{notice}</output>
        <p className="form-feedback" role="alert">{error}</p>
      </form>
    </section>
  )
}
