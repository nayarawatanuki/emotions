import React from 'react';
import { DataRow } from '../../DataTable';

import { Preview } from './styles';
import { legacyMediaUrl } from '../../../services/api';

export const activityColumns = [
  { key: 'image', label: 'Imagem' },
  { key: 'name', label: 'Nome' },
  { key: 'emotion', label: 'Emoção' },
  { key: 'status', label: 'Situação' },
  { key: 'alternatives', label: 'Alternativas' },
  { key: 'result', label: 'Resultado' },
  { key: 'reward', label: 'Recompensa' },
  { key: 'actions', label: 'Ações' },
];

function ActivityList({ columns, activity, result, deleteActivity, loadingReward, onReviewReward, loadingReport, onPrintReport }){

  const { name, emotion, response1, response2, response3, image, status } = activity;
  const completed = status === 'realizada';

  return <DataRow columns={columns} cells={{
    image: (<>
      <Preview
          src={legacyMediaUrl(image)}
          role="img"
          aria-label={activity.image_description || 'Imagem da atividade'}
        />
    </>),
    name: (<>
      <span className="legacy-cell-value">{name}</span>
    </>),
    emotion: (<>
      <span className="legacy-cell-value">{emotion}</span>
    </>),
    status: (<>
      <span className="legacy-cell-value">{completed ? 'Realizada' : status}</span>
    </>),
    alternatives: (<>
      <details>
          <summary className="legacy-disclosure">Alternativas</summary>
          <ol className="legacy-detail-list">
            <li>{response1}</li>
            <li>{response2}</li>
            <li>{response3}</li>
          </ol>
        </details>
    </>),
    result: (<>
      {result && (
          <details>
            <summary className="legacy-disclosure">Resultado</summary>
            <dl className="legacy-detail-list">
              <dt>Tentativas</dt><dd>{result.tries}</dd>
              <dt>Resposta</dt><dd>{result.response}</dd>
              <dt>Tempo</dt><dd>{result.time}</dd>
            </dl>
          </details>
        )}
    </>),
    reward: (<>
      {completed ? (
          <button type="button" className="btn btn-info"
            aria-label={`Ver recompensa: ${name}`} aria-disabled={loadingReward}
            onClick={(event) => onReviewReward(activity, event.currentTarget)}>
            Ver recompensa
          </button>
        ) : (
          <span className="legacy-cell-value">
            <span aria-hidden="true">N/A</span>
            <span className="sr-only">Não se aplica</span>
          </span>
        )}
    </>),
    actions: (<div className="legacy-row-actions">
      <button type="button" className="btn btn-info" aria-label={`Imprimir relatório: ${name}`}
          aria-disabled={loadingReport} onClick={(event) => onPrintReport(activity, event.currentTarget)}>
          Imprimir relatório
        </button>
        <button
          type="button"
          aria-label={`Excluir atividade: ${activity.name}`}
          className="btn btn-sm btn-danger"
          onClick={() => deleteActivity(activity.id)}
        >
          <i className="fas fa-trash-alt" aria-hidden="true" />
        </button>
    </div>),
  }} />;
}

export default ActivityList;
