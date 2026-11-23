import React from 'react';
import { DataRow } from '../../DataTable';
import { useHistory } from 'react-router-dom';

import { useTaskContext } from '../../../context/taskContext';

export const taskColumns = [
  { key: 'name', label: 'Atividade' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Ação' },
];

function TaskList({ columns, task, canReviewReward, loadingReward, onReviewReward }) {
  const { saveId } = useTaskContext();
  const history = useHistory();
  const completed = task.status === 'realizada';

  function openTask() {
    saveId(String(task.id));
    history.push({ pathname: '/Task3', search: String(task.id) });
  }

  return <DataRow columns={columns} cells={{
    name: (<>
      <span className="legacy-cell-value">{task.name}</span>
    </>),
    status: (<>
      {completed ? 'Realizada' : task.status}
    </>),
    action: (<>
      {completed && canReviewReward && (
          <button type="button" className="btn btn-sm btn-info d-inline-block mr-1"
            aria-label={`Ver recompensa: ${task.name}`} aria-disabled={loadingReward}
            onClick={(event) => onReviewReward(task, event.currentTarget)}>
            Ver recompensa
          </button>
        )}
        {!completed && (
          <button type="button" className="btn btn-sm btn-info d-inline-block mr-1"
            aria-label={`Começar atividade: ${task.name}`} onClick={openTask}>
            Começar atividade
          </button>
        )}
    </>),
  }} />;
}

export default TaskList;
