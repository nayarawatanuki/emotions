import React from 'react';
import { MdCheckCircle, MdError, MdLink } from 'react-icons/md';

import { Container, FileInfo, Preview } from "./styles";

const FileUploadList = ({ files, onDelete }) => (
  <Container>
    {files.map(file => (
      <li key={file.id}>
        <FileInfo>
          <Preview src={file.preview} alt="" />
          <div>
            <span>{file.name}</span>
            <span>
              {file.readableSize}{" "}
              <button
                type="button"
                aria-label={`Excluir arquivo ${file.name}`}
                onClick={() => onDelete(file.id)}
              >
                Excluir
              </button>
            </span>
          </div>
        </FileInfo>
        <div>
          {file.uploaded && !file.error && (
            <MdCheckCircle role="img" size={24} color="#78e5d5" aria-label={`Carregamento de ${file.name} concluído`}/>
          )}

          {file.error && <MdError role="img" size={24} color="#e57878" aria-label={`Erro ao carregar ${file.name}`}/>}

          {file.url && (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir arquivo ${file.name} em uma nova aba`}
            >
              <MdLink role="img" style={{ marginRight: 8 }} size={24} color="#222" aria-hidden="true"/>
            </a>
          )}
        </div>
      </li>
    ))}
  </Container>
);

export default FileUploadList;
