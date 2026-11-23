import React, { useEffect, useId, useRef } from 'react';

function ConfirmationDialog({ title, message, confirmLabel, danger, onClose }) {
    const dialog = useRef(null);
    const cancel = useRef(null);
    const titleId = useId();
    const messageId = useId();

    useEffect(() => {
        if (!dialog.current.open) dialog.current.showModal();
        cancel.current.focus();
    }, []);

    return (
        <dialog ref={dialog} className="legacy-dialog"
            aria-labelledby={titleId} aria-describedby={messageId}
            onClose={(event) => onClose(event.currentTarget.returnValue === 'confirm')}>
            <h2 id={titleId}>{title}</h2>
            <p id={messageId}>{message}</p>
            <form method="dialog" className="legacy-actions">
                <button ref={cancel} type="submit" value="cancel" className="button button-info">Cancelar</button>
                <button type="submit" value="confirm" className={danger ? 'button button-danger' : 'button button-success'}>
                    {confirmLabel}
                </button>
            </form>
        </dialog>
    );
}

export default ConfirmationDialog;
