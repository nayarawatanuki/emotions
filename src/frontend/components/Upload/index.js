import React, { useState } from 'react';
import Dropzone from 'react-dropzone';

import { DropContainer, UploadMessage } from './styles';

export default function Upload({ id, onUpload, label = 'Escolher imagem' }) {
    const [error, setError] = useState('');

    return (
        <>
            <Dropzone accept="image/*" multiple={false} maxFiles={1}
                onDropAccepted={(files) => {
                    setError('');
                    onUpload(files);
                }}
                onDropRejected={() => setError('Escolha um único arquivo de imagem em um formato compatível.')}>
                {({ getRootProps, getInputProps, isDragActive, isDragReject }) => (
                    <DropContainer
                        {...getRootProps({ role: 'button', 'aria-label': label })}
                        isDragActive={isDragActive}
                        isDragReject={isDragReject}
                    >
                        <input {...getInputProps({ id })} />
                        {isDragReject && <UploadMessage type="error">Arquivo não suportado</UploadMessage>}
                        {isDragActive && !isDragReject && <UploadMessage type="success">Solte o arquivo aqui</UploadMessage>}
                        {!isDragActive && <UploadMessage>Clique para escolher ou arraste a imagem até aqui</UploadMessage>}
                    </DropContainer>
                )}
            </Dropzone>
            <div role="status" className="legacy-field-error">{error}</div>
        </>
    );
}
