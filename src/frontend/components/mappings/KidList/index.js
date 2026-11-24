import { pageRoutes } from '../../../../routes';
import { legacyMediaUrl } from '../../../services/api';
import { ActionButton } from '../../ActionButton';
import React, { useState } from "react";

import { Preview, Input } from './styles';

import { useKidContext } from "../../../context/kidContext";

function KidList({ kid, updateKid, deleteKid }){ 

    const {saveId, saveName, savePhoto} = useKidContext();
    const [id, setId] = useState(kid.id)
    const [photo, setPhoto] = useState(kid.photo);
    const [careActive, setCareActive] = useState(kid.treatment);
    const [user, setUser] = useState(kid.user);
    const [code, setCode] = useState(kid.code);
    const [name, setName] = useState(kid.name);
    const [grade, setGrade] = useState(kid.rate);
    const [birth, setBirth] = useState(kid.birth);
    const [parent, setParent] = useState(kid.parent);
    const [note, setNote] = useState(kid.note);
    
    const [isReadOnly, setReadOnly] = useState(true);
    
    return(
      <tr className='tr'>
        <td>
          <Preview
            src={legacyMediaUrl(photo)}
            aria-hidden="true"
          />  
        </td>
        <td>
          <Input
            aria-label="Acompanhamento"
            className="input"
            type="text"
            defaultValue={careActive}
            onChange={(e) => setCareActive(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            aria-label="Usuário"
            className="input"
            type="text"
            defaultValue={user}
            onChange={(e) => setUser(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            aria-label="Código de acesso"
            className="input"
            type="text"
            defaultValue={code}
            onChange={(e) => setCode(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            aria-label="Nome"
            className="input"
            type="text"
            defaultValue={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            aria-label="Grau"
            className="input"
            type="text"
            defaultValue={grade}
            onChange={(e) => setGrade(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            aria-label="Nascimento"
            className="input"
            type="text"
            defaultValue={birth}
            onChange={(e) => setBirth(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            aria-label="Responsável"
            className="input"
            type="text"
            defaultValue={parent}
            onChange={(e) => setParent(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            aria-label="Observações"
            className="input"
            type="text"
            defaultValue={note}
            onChange={(e) => setNote(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <ActionButton size="compact" to={{ pathname: pageRoutes.addActivity, search: String(kid.id) }}
            aria-label={`Adicionar atividade para ${kid.name}`}
            onClick={() => saveId(kid.id)} icon="add" />
          <ActionButton size="compact" to={{ pathname: pageRoutes.activities, search: String(kid.id) }}
            aria-label={`Ver atividades de ${kid.name}`}
            onClick={() => {
              saveId(String(kid.id));
              saveName(kid.name);
              savePhoto(kid.photo);
            }} icon="list" />
        </td>
        <td>
          <ActionButton size="compact"
            type="button"
            aria-label={`Editar cadastro de ${kid.name}`}
            onClick={(e) => {
              e.preventDefault(); 
              setReadOnly(false);
            }} icon="edit" />
          <ActionButton size="compact"
            type="button"
            aria-label={`Salvar cadastro de ${kid.name}`}
            disabled={isReadOnly}
            onClick={(e) => {
              e.preventDefault();
              updateKid({
                id: kid.id,
                treatment: careActive,
                name,
                user,
                code,
                rate: grade,
                birth,
                parent,
                note
              });
              setReadOnly(true);
            }} icon="save" variant="success" />
          <ActionButton size="compact"
            type="button"
            aria-label={`Excluir cadastro de ${kid.name}`}
            onClick={(e) => {
              e.preventDefault();
              deleteKid(kid.id);
            }} icon="delete" variant="danger" />
        </td>
      </tr>
    )
}

export default KidList;