import { legacyMediaUrl } from '../../../services/api';
import { ActionButton } from '../../ActionButton';
import React, { useId, useState } from "react";

import './style.css';
import { Preview, Input } from './styles';

function ActivityList({ activity, result, deleteActivity }){

  const detailsId = useId();
  const [openDetails, setOpenDetails] = useState(null);

  function toggleDetails(section) {
    setOpenDetails((open) => open === section ? null : section);
  }

  const [name, setName] = useState(activity.name);
  const [emotion, setEmotion] = useState(activity.emotion);
  const [response1, setResponse1] = useState(activity.response1);
  const [response2, setResponse2] = useState(activity.response2);
  const [response3, setResponse3] = useState(activity.response3);
  const [image, setImage] = useState(activity.image);
  const [status, setStatus] = useState(activity.status);
  
  const [isReadOnly, setReadOnly] = useState(true);

  return(
    <tr className="tr">
      <td>
        <Preview
          src={legacyMediaUrl(image)}
          role={activity.image_description ? 'img' : undefined}
          aria-label={activity.image_description || undefined}
          aria-hidden={!activity.image_description}
        />  
      </td>
      
      <td justify = "content">
        <Input
          aria-label="Nome da atividade"
          className="input"
          type="text"
          defaultValue={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={isReadOnly}
        />
      </td>

      <td>
        <Input
          aria-label="Emoção"
          className="input"
          type="text"
          defaultValue={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          readOnly={isReadOnly}
        />
      </td>

      <td>
        <Input
          aria-label="Situação"
          className="input"
          type="text"
          value={isReadOnly && status === 'realizada' ? 'Realizada' : status}
          onChange={(e) => setStatus(e.target.value)}
          readOnly={isReadOnly}
        />
      </td>

      <td>
        <div className="result" fit-content='true'>
            <ActionButton size="compact"
                type="button"
                aria-label="Ver alternativas"
                aria-expanded={openDetails === 'alternatives'}
                aria-controls={detailsId + '-alternatives'}
                onClick={() => toggleDetails('alternatives')} icon="alternatives" />
            <div id={detailsId + '-alternatives'} className="resultInfo" hidden={openDetails !== 'alternatives'}>
              resposta1: {response1} <br/>
              resposta2: {response2} <br/>
              resposta3: {response3}
            </div>
        </div>
      </td>
      
      <td>
        {result && (
          <div className="result" fit-content='true'>
              <ActionButton size="compact"
                  type="button"
                  aria-label="Ver resultado"
                  aria-expanded={openDetails === 'result'}
                  aria-controls={detailsId + '-result'}
                  onClick={() => toggleDetails('result')} icon="list" variant="warning" />
              <div id={detailsId + '-result'} className="resultInfo" hidden={openDetails !== 'result'}>
                tentativas: {result.tries} <br/>
                resposta: {result.response} <br/>
                tempo: {result.time}
              </div>
          </div>
        )}
      </td>

      <td>
        <ActionButton size="compact"
          type="button"
          aria-label={`Excluir atividade ${name}`}
          onClick={(e) => {
            e.preventDefault();
            deleteActivity(activity.id);
          }} icon="delete" variant="danger" />
      </td>
    </tr>
  )
}

export default ActivityList;