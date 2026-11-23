import React, { useEffect, useRef, useState } from 'react';
import PageHeader from '../../../components/PageHeader';
import { useHistory } from 'react-router-dom';

import api from '../../../services/api';
import ConfirmationDialog from '../../../components/ConfirmationDialog';
import ActivityReward from '../../../components/ActivityReward';
import EmotionActivity from '../../../components/EmotionActivity';
import { Container, Content } from './styles';
import { useKidContext } from '../../../context/kidContext';
import { useTaskContext } from '../../../context/taskContext';

function Task3() {
  const { kid_name } = useKidContext();
  const { task_id } = useTaskContext();
  const history = useHistory();
  const startedAt = useRef(Date.now());
  const saving = useRef(false);
  const draggedAnswer = useRef(null);
  const [task, setTask] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completion, setCompletion] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/${kid_name}/tasks/taskListOne/${task_id}`).then(({ data }) => {
      if (!active) return;
      if (!data) setLoadError(true);
      else {
        setTask(data);
        startedAt.current = Date.now();
      }
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [kid_name, task_id]);

  async function saveActivityResult(answer, tries, showReward) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFeedback('Salvando resultado…');
    const time = Math.floor((Date.now() - startedAt.current) / 1000);
    try {
      await api.post(`/tasks/${task_id}/createdTaskResult`, { response: answer, tries, time });
    } catch {
      setFeedback('Não foi possível salvar o resultado. Tente novamente.');
      saving.current = false;
      setBusy(false);
      return;
    }

    const rewards = showReward
      ? await api.get(`/tasks/${task_id}/listRewards`)
        .then(({ data }) => Array.isArray(data) ? data : [])
        .catch(() => [])
      : [];
    setCompletion({ rewards, showReward });
  }

  function chooseAnswer(answer) {
    if (saving.current || !answer) return;
    const tries = attempts + 1;
    setResponse(answer);
    setAttempts(tries);
    if (answer === task.emotion) {
      saveActivityResult(answer, tries, true);
    } else {
      setFeedback(`“${answer}” não é a resposta certa. Tente outra opção.`);
    }
  }

  function confirmCompletion(confirmed) {
    setConfirming(false);
    if (confirmed) saveActivityResult(response, attempts, false);
  }

  function returnToList() {
    history.replace('/Tasks', { fromCompletion: true });
  }

  return (
    <>
      <PageHeader>
        <button type="button" className="button button-danger" disabled={busy}
          onClick={() => history.push('/Tasks')}>Sair da atividade</button>
      </PageHeader>
      <Container>
        <Content>
          {!task && <h1>Associe a emoção à imagem</h1>}
          {loadError && <p role="alert">Não foi possível carregar a atividade.</p>}
          {!task && !loadError && <p role="status">Carregando atividade…</p>}
          {task && (
            <>
              <EmotionActivity activity={task} getAnswerProps={(answer) => ({
                type: 'button',
                'aria-disabled': busy,
                onClick: () => chooseAnswer(answer),
                draggable: !busy,
                onDragStart(event) {
                  draggedAnswer.current = answer;
                  event.dataTransfer.setData('text/plain', answer);
                },
                onDragEnd() { draggedAnswer.current = null; },
              })} imageEvents={{
                onDragOver(event) {
                  if (draggedAnswer.current) event.preventDefault();
                },
                onDrop(event) {
                  event.preventDefault();
                  const answer = draggedAnswer.current;
                  draggedAnswer.current = null;
                  chooseAnswer(answer);
                },
              }} />
              <p role="status">{feedback}</p>
              {response && response !== task.emotion && (
                <button type="button" className="button button-save" disabled={busy}
                  onClick={() => setConfirming(true)}>Concluir atividade</button>
              )}
            </>
          )}
        </Content>
      </Container>
      {confirming && (
        <ConfirmationDialog title="Finalizar atividade?"
          message="Depois de finalizar, você não poderá refazer esta atividade."
          confirmLabel="Finalizar" onClose={confirmCompletion} />
      )}
      {completion && (
        <ActivityReward
          title={completion.showReward ? 'Parabéns! Resposta correta.' : 'Resultado salvo.'}
          rewards={completion.rewards}
          celebrate={completion.showReward}
          buttonLabel="Continuar"
          onClose={returnToList}
        />
      )}
    </>
  );
}

export default Task3;
