import React from 'react';
import { ActionButton } from '../../ActionButton';
import { MdCheckCircle, MdError, MdLink } from 'react-icons/md';

import { Container, FileInfo, Preview } from "./styles";

const FileList = ({ file, onDelete, disabled }) => (
  <Container>
    {file.map(uploadedFile => (
      <li key={uploadedFile.id}>
        <FileInfo>
          <Preview src={uploadedFile.preview} />
          <div>
            <strong>{uploadedFile.name}</strong>
            <span>
              {uploadedFile.readableSize}{" "}
              <ActionButton appearance="custom" disabled={disabled} onClick={() => onDelete(uploadedFile.id)}>
                Excluir
              </ActionButton>
            </span>
          </div>
        </FileInfo>
        <div>
          {!uploadedFile.uploaded && !uploadedFile.error && (
            <MdCheckCircle size={24} color="#33615a" />
          )}
          
          {uploadedFile.error && <MdError size={24} color="#874646" />}

          {uploadedFile.url && (
            <a
              href={uploadedFile.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MdLink style={{ marginRight: 8 }} size={24} color="#222" />
            </a>
          )}
        </div>
      </li>
    ))}
  </Container>
);

export default FileList;