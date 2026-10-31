import React, { useState } from "react";

import './style.css';
import { Preview, Input } from './styles';

function ActivityList({ activity, result, deleteActivity }){

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
          src={image}
          id='image'
          readOnly={isReadOnly}
        />  
      </td>
      
      <td justify = "content">
        <Input
          id="name"
          className="input"
          type="text"
          defaultValue={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={isReadOnly}
        />
      </td>

      <td>
        <Input
          id="emotion"
          className="input"
          type="text"
          defaultValue={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          readOnly={isReadOnly}
        />
      </td>

      <td>
        <Input
          id="status"
          className="input"
          type="text"
          defaultValue={status}
          onChange={(e) => setStatus(e.target.value)}
          readOnly={isReadOnly}
        />
      </td>

      <td>
        <div className="result" fit-content='true'>
            <button
                className="btn btn-sm btn-info d-inline-block mr-1"
                onClick={(e) =>{e.preventDefault()}}
            >
                <i className="fas fa-list-ol"></i>
            </button>
            <div className="resultInfo">
              resposta1: {response1} <br/>
              resposta2: {response2} <br/>
              resposta3: {response3}
            </div>
        </div>
      </td>
      
      <td>
        {result && (
          <div className="result" fit-content='true'>
              <button
                  className="btn btn-sm btn-warning d-inline-block mr-1"
                  onClick={(e) =>{e.preventDefault()}}
              >
                  <i className="fas fa-list"></i>
              </button>
              <div className="resultInfo">
                tentativas: {result.tries} <br/>
                resposta: {result.response} <br/>
                tempo: {result.time}
              </div>
          </div>
        )}
      </td>

      <td>
        <button
          className="btn btn-sm btn-danger d-inline-block"
          onClick={(e) => {
            e.preventDefault();
            deleteActivity(activity.id);
          }}
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  )
}

export default ActivityList;