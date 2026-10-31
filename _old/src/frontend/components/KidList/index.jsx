import React, { useState } from "react";

import { Preview, Input } from './styles';

import { Link } from "react-router-dom";
import { useKidContext } from "../../context/kidContext";
import { apiUrl } from '../../services/api';

function KidList({ kid, updateKid, deleteKid }){ 

    const {saveId, saveName, savePhoto} = useKidContext();
    const [id, setId] = useState(kid.id)
    const [photo, setPhoto] = useState(kid.photo);
    const [treatment, setTreatment] = useState(kid.treatment);
    const [user, setUser] = useState(kid.user);
    const [code, setCode] = useState(kid.code);
    const [name, setName] = useState(kid.name);
    const [rate, setRate] = useState(kid.rate);
    const [birth, setBirth] = useState(kid.birth);
    const [parent, setParent] = useState(kid.parent);
    const [note, setNote] = useState(kid.note);
    
    const [isReadOnly, setReadOnly] = useState(true);
    
    return(
      <tr className='tr'>
        <td>
          <Preview
            src={`${apiUrl}${photo}`}
            id="photo"
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            id="treatment"
            className="input"
            type="text"
            defaultValue={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            id="code"
            className="input"
            type="text"
            defaultValue={user}
            onChange={(e) => setUser(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            id="code"
            className="input"
            type="text"
            defaultValue={code}
            onChange={(e) => setCode(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
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
            id="rate"
            className="input"
            type="text"
            defaultValue={rate}
            onChange={(e) => setRate(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            id="birth"
            className="input"
            type="text"
            defaultValue={birth}
            onChange={(e) => setBirth(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            id="parent"
            className="input"
            type="text"
            defaultValue={parent}
            onChange={(e) => setParent(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Input
            id="note"
            className="input"
            type="text"
            defaultValue={note}
            onChange={(e) => setNote(e.target.value)}
            readOnly={isReadOnly}
          />
        </td>
        <td>
          <Link to={{ pathname: "/addTask3", search:`${kid.id}` }}>
            <button
              id="vincular"
              className="btn btn-sm btn-info d-inline-block mr-1"
              onClick={() => {
                saveId(kid.id)
              }}
            >
              <i className="fas fa-plus"></i>
            </button>
          </Link>

          <Link to={{ pathname: "/Activities", search: `${kid.id}`}}>
            <button
              id="list"
              className="btn btn-sm btn-info d-inline-block mr-1"
              onClick={() => {
                saveId(`${kid.id}`)
                saveName(`${kid.name}`)
                savePhoto(`${kid.photo}`)
              }}
            >
              <i className="fas fa-list"></i>
            </button>
          </Link>
        </td>
        <td>
          <button
            id="edit"
            className="btn btn-sm btn-info d-inline-block mr-1"
            onClick={(e) => {
              e.preventDefault(); 
              setReadOnly(false);
              document.getElementById("save").disabled = false;
            }}
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            id="save"
            disabled={true}
            className="btn btn-sm btn-success d-inline-block mr-1"
            onClick={(e) => {
              e.preventDefault();
              updateKid({
                id: kid.id,
                treatment,
                name,
                user,
                code,
                rate,
                birth,
                parent,
                note
              });
              setReadOnly(true);
              document.getElementById("save").disabled = true;
            }}
          >
            <i className="fas fa-save"></i>
          </button>
          <button
            className="btn btn-sm btn-danger d-inline-block"
            onClick={(e) => {
              e.preventDefault();
              deleteKid(kid.id);
            }}
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    )
}

export default KidList;