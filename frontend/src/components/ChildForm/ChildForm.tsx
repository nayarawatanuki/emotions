import { useRef, useState, type FormEvent } from 'react'
import type { CreateChildInput } from '../../features/children/children-api'
import { childInputError } from '../../features/children/child-input'
import { ApiError, requestError } from '../../services/api'

export function ChildForm({
  disabled,
  onSubmit
}: {
  disabled: boolean
  onSubmit: (input: CreateChildInput) => Promise<void>
}) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const pending = useRef(false)
  const feedback = useRef<HTMLParagraphElement>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || disabled) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const value = (name: string) => String(fields.get(name) ?? '')
    const input: CreateChildInput = {
      name: value('name'),
      username: value('username'),
      dateOfBirth: value('dateOfBirth'),
      guardianName: value('guardianName'),
      treatmentActive: fields.has('treatmentActive'),
      reportedLevel: value('reportedLevel') || null,
      notes: value('notes') || null
    }
    const invalid = childInputError(input)
    setError(invalid ?? '')
    if (invalid) {
      requestAnimationFrame(() => feedback.current?.focus())
      return
    }
    pending.current = true
    try {
      await onSubmit({
        ...input,
        name: input.name.trim(),
        username: input.username.trim().toLowerCase(),
        guardianName: input.guardianName.trim(),
        reportedLevel: input.reportedLevel?.trim() || null,
        notes: input.notes?.trim() || null
      })
      form.reset()
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 409
          ? 'Esse usuário já está em uso. Escolha outro para a criança.'
          : failure instanceof ApiError && failure.status === 400
            ? 'Confira os campos e a data de nascimento.'
            : requestError(failure) +
              ' O cadastro pode ter sido concluído. Confira a lista antes de repetir.'
      )
      requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      pending.current = false
    }
  }
  return (
    <section className="care-panel" aria-labelledby="child-create-title">
      <p className="eyebrow">Cada percurso é único</p>
      <h2 id="child-create-title">Cadastrar criança</h2>
      <p className="form-hint">
        O cadastro ficará vinculado ao seu acompanhamento. Preencha as
        informações com cuidado.
      </p>
      <form onSubmit={submit} aria-busy={disabled}>
        <fieldset disabled={disabled} className="care-fields">
          <legend className="visually-hidden">
            Identificação e acompanhamento
          </legend>
          <div className="form-field">
            <label htmlFor="child-name">Nome da criança</label>
            <input
              id="child-name"
              name="name"
              required
              maxLength={510}
              autoComplete="off"
              aria-describedby={error ? 'child-create-error' : undefined}
            />
          </div>
          <div className="form-field">
            <label htmlFor="child-username">Usuário reservado</label>
            <input
              id="child-username"
              name="username"
              required
              maxLength={510}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="child-username-hint child-create-error"
            />
            <p className="form-hint" id="child-username-hint">
              Identificação única em letras minúsculas. Não é necessário definir
              senha neste cadastro.
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="child-birth">Data de nascimento</label>
            <input
              id="child-birth"
              name="dateOfBirth"
              type="date"
              required
              min="1000-01-01"
              max={today}
              aria-describedby={error ? 'child-create-error' : undefined}
            />
          </div>
          <div className="form-field">
            <label htmlFor="child-guardian">Nome do responsável</label>
            <input
              id="child-guardian"
              name="guardianName"
              required
              maxLength={510}
              autoComplete="off"
              aria-describedby={error ? 'child-create-error' : undefined}
            />
          </div>
          <div className="form-field">
            <label htmlFor="child-level">Nível informado (opcional)</label>
            <input
              id="child-level"
              name="reportedLevel"
              maxLength={510}
              autoComplete="off"
            />
          </div>
          <div className="form-field care-checkbox">
            <input
              id="child-treatment"
              name="treatmentActive"
              type="checkbox"
            />
            <label htmlFor="child-treatment">Acompanhamento ativo</label>
          </div>
          <div className="form-field care-full">
            <label htmlFor="child-notes">Observações (opcional)</label>
            <textarea
              id="child-notes"
              name="notes"
              rows={4}
              maxLength={4000}
              aria-describedby="child-notes-hint child-create-error"
            />
            <p className="form-hint" id="child-notes-hint">
              Até 2.000 caracteres. Registre apenas o necessário para o
              acompanhamento.
            </p>
          </div>
        </fieldset>
        <p
          className="form-feedback"
          id="child-create-error"
          ref={feedback}
          tabIndex={-1}
          role="alert"
        >
          {error}
        </p>
        <button
          className="access-button care-primary"
          type="submit"
          disabled={disabled}
        >
          {disabled ? 'Aguarde…' : 'Cadastrar criança'}
        </button>
      </form>
    </section>
  )
}
