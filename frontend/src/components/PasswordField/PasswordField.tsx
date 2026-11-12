import { useState } from 'react'

export function PasswordField({
  id,
  label,
  autoComplete,
  describedBy,
  invalid = false,
  disabled = false
}: {
  id: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          maxLength={256}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
        />
        <button
          type="button"
          className="password-toggle"
          aria-controls={id}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
          <span className="visually-hidden"> {label.toLowerCase()}</span>
        </button>
      </div>
    </div>
  )
}
