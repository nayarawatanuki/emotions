import React, { cloneElement, useId, useState } from 'react';

function fieldError(field) {
    const { validity, minLength } = field;
    if (validity.valueMissing) return 'Preencha este campo.';
    if (validity.tooShort) return `Use pelo menos ${minLength} caracteres.`;
    if (validity.patternMismatch || validity.typeMismatch || validity.badInput) {
        return 'Confira o formato deste campo.';
    }
    return field.validationMessage;
}

export default function FormField({ label, help, children, className = 'form-group' }) {
    const generatedId = useId();
    const [error, setError] = useState('');
    const { id = generatedId, required, onInvalid, onInput } = children.props;
    const errorId = `${id}-error`;
    const helpId = `${id}-help`;
    const description = [children.props['aria-describedby'], help && helpId, error && errorId].filter(Boolean).join(' ');

    return (
        <div className={className}>
            <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
            {help && <p id={helpId}>{help}</p>}
            {cloneElement(children, {
                id,
                'aria-describedby': description || undefined,
                'aria-invalid': error ? true : undefined,
                onInvalid(event) {
                    const field = event.currentTarget;
                    event.preventDefault();
                    setError(fieldError(field));
                    if (field.form?.querySelector('input:invalid, select:invalid, textarea:invalid') === field) {
                        field.focus();
                    }
                    onInvalid?.(event);
                },
                onInput(event) {
                    if (error) setError(fieldError(event.currentTarget));
                    onInput?.(event);
                },
            })}
            <div className="legacy-field-error" id={errorId} aria-live="polite">{error}</div>
        </div>
    );
}
