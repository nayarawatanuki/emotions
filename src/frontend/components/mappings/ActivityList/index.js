import { pageRoutes } from '../../../../routes';
import { ActionButton } from '../../ActionButton';
import React, { useState } from "react";
import swal from "sweetalert";
import { useHistory } from "react-router-dom";
import { useActivityContext } from "../../../context/activityContext";

function ActivityList({ activity }){


  const {saveId} = useActivityContext();
  const [name, setName] = useState(activity.name);
  const [status, setStatus] = useState(activity.status);

  const history = useHistory();


  const openActivity = async () => {
    history.push({ pathname: pageRoutes.playActivity, search: `${activity.id}`});
  }
  return(
    <tr>
      <td className="fit-content"> {name}</td>
      <td className="fit-content"> {status === 'realizada' ? 'Realizada' : status}</td>

      <td>
        <ActionButton size="compact"
          type="button"
          aria-label={`Abrir atividade: ${name}`}
          onClick={(e) => {
            saveId(`${activity.id}`)
            if(`${activity.status}` === 'realizada') {
              e.preventDefault();
              swal({title: 'Atividade já realizada!', icon: "warning"})
            } else {
              openActivity();
            }}
          } icon="play" />
      </td>
    </tr>
  )
}

export default ActivityList;