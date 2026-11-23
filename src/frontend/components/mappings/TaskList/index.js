import React, { useState } from "react";
import swal from "sweetalert";
import { Link, useHistory } from "react-router-dom";
import { useTaskContext } from "../../../context/taskContext";

function TaskList({ task }){ 

  
  const {saveId} = useTaskContext();
  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState(task.status);

  const history = useHistory();
  
  //const [id, setId] = useState(task.id)

  const openTask = async () => {
    history.push({ pathname: "/Task3", search: `${task.id}`});
  }
  return(
    <tr>
      <td className="fit-content"> {name}</td>
      <td className="fit-content"> {status}</td>

      <td>
        <button
          type="button"
          aria-label={`Abrir atividade: ${name}`}
          className="btn btn-sm btn-info d-inline-block mr-1"
          onClick={(e) => {
            saveId(`${task.id}`)
            if(`${task.status}` === 'realizada') {
              e.preventDefault();
              swal({title: 'Tarefa já realizada!', icon: "warning"})
            } else {
              openTask();
            }}
          }
        >
          <i className="fas fa-play" aria-hidden="true" />
        </button>
      </td>
    </tr>   
  )
}

export default TaskList;