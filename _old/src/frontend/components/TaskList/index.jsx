import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useKidContext } from "../../context/kidContext";
import { useTaskContext } from "../../context/taskContext";

function TaskList({ task }){ 

  
  const {kid_id} = useKidContext();
  const {saveId} = useTaskContext();
  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState(task.status);

  const history = useHistory();
  
  //const [id, setId] = useState(task.id)

  const openTask = async () => {
    history.push({ pathname: "/Task3", search: `${task.id}`});
  }
  return(
    <tr id="rows" >
      <td className="fit-content" hidden={true}>{task.id}</td>
      <td className="fit-content" hidden={true}> {kid_id}</td>
      <td className="fit-content"> {name}</td>
      <td className="fit-content"> {status}</td>

      <td>
        <button
          id="list"
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
          <i className="fas fa-play"></i>
        </button>
      </td>
    </tr>   
  )
}

export default TaskList;