import { useRef, useState, type FormEvent } from 'react'
import { professionalInputError } from '../../features/professionals/professional-input'
import { ApiError, requestError } from '../../services/api'

export function ProfessionalForm({
  disabled,
  onSubmit
}: {
  disabled: boolean
  onSubmit: (input: { name: string; username: string }) => Promise<void>
}) {
  const [error, setError] = useState('')
  const feedback = useRef<HTMLParagraphElement>(null)
  const pending = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || disabled) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '')
    const username = String(fields.get('username') ?? '')
    const invalid = professionalInputError(name, username)
    setError(invalid ?? '')
    if (invalid) {
      requestAnimationFrame(() => feedback.current?.focus())
      return
    }
    pending.current = true
    try {
      await onSubmit({
        name: name.trim(),
        username: username.trim().toLowerCase()
      })
      form.reset()
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 409
          ? 'Esse usuário já está em uso. Escolha outro usuário para o profissional.'
          : failure instanceof ApiError && failure.status === 400
            ? 'Confira o nome e o usuário informados.'
            : requestError(failure) +
              ' O cadastro pode ter sido concluído. Atualize a lista antes de tentar novamente.'
      )
      requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      pending.current = false
    }
  }
  return (
    <section
      className="admin-panel"
      aria-labelledby="professional-create-title"
    >
      <p className="eyebrow">Um novo percurso</p>
      <h2 id="professional-create-title">Cadastrar profissional</h2>
      <p className="form-hint">
        A conta começa aguardando ativação. O profissional escolhe a própria
        senha pelo convite.
      </p>
      <form onSubmit={submit} aria-busy={disabled}>
        <div className="admin-fields">
          <div className="form-field">
            <label htmlFor="professional-name">Nome do profissional</label>
            <input
              id="professional-name"
              name="name"
              autoComplete="off"
              required
              maxLength={510}
              disabled={disabled}
              aria-describedby={error ? 'professional-create-error' : undefined}
            />
          </div>
          <div className="form-field">
            <label htmlFor="professional-username">Usuário de acesso</label>
            <input
              id="professional-username"
              name="username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={510}
              disabled={disabled}
              aria-describedby="username-hint professional-create-error"
            />
            <p className="form-hint" id="username-hint">
              Será salvo em letras minúsculas. Não precisa ser um e-mail.
            </p>
          </div>
        </div>
        <p
          ref={feedback}
          id="professional-create-error"
          tabIndex={-1}
          className="form-feedback"
          role="alert"
        >
          {error}
        </p>
        <button
          className="access-button admin-primary"
          disabled={disabled}
          type="submit"
        >
          {disabled ? 'Aguarde…' : 'Cadastrar e gerar convite'}
        </button>
      </form>
    </section>
  )
}
