import React, { useEffect, useState } from 'react';
import filesize from 'filesize';

import { Container, FileInfo, Preview } from './styles';

function FileList({ file, onDelete }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Container>
      <li>
        <FileInfo>
          {preview && <Preview src={preview} alt="" />}
          <div>
            <strong>{file.name}</strong>
            <span>
              {filesize(file.size)}
              <button type="button" className="button button-danger"
                aria-label={`Remover arquivo: ${file.name}`} onClick={onDelete}>
                Remover
              </button>
            </span>
          </div>
        </FileInfo>
      </li>
    </Container>
  );
}

export default FileList;
