import React, { useEffect, useRef, useState } from 'react';
import swal from 'sweetalert';
import { useHistory } from 'react-router-dom';

import api from '../../../services/api';
import GlobalStyle from '../../../global/styles';
import { Container, Content, Answer, Answers, ActivityImage } from './styles';
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

    if (showReward) {
      const rewards = await api.get(`/tasks/${task_id}/listRewards`)
        .then(({ data }) => data)
        .catch(() => []);
      for (const reward of rewards) {
        await swal({ title: reward.message, icon: reward.photo, button: 'Continuar' });
      }
      if (!rewards.length) await swal('Resposta correta! Resultado salvo.');
    } else {
      await swal('Resultado salvo.');
    }
    history.push('/Tasks');
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

  async function finish() {
    const confirmed = await swal({
      title: 'Finalizar atividade?',
      text: 'Depois de finalizar, você não poderá refazer esta atividade.',
      buttons: ['Continuar atividade', 'Finalizar']
    });
    if (confirmed) saveActivityResult(response, attempts, false);
  }

  return (
    <>
      <header className="navbar navbar-light bg-light">
        <button type="button" className="button button-danger" disabled={busy}
          onClick={() => history.push('/Tasks')}>Sair da atividade</button>
      </header>
      <Container>
        <Content>
          <h1>Associe a emoção à imagem</h1>
          {loadError && <p role="alert">Não foi possível carregar a atividade.</p>}
          {!task && !loadError && <p role="status">Carregando atividade…</p>}
          {task && (
            <>
              <p>Arraste ou clique na emoção que combina com a imagem. Se usar o teclado, vá até a opção com Tab e pressione Enter.</p>
              <ActivityImage src={task.image}
                alt={task.image_description || 'Imagem da atividade sem descrição disponível.'}
                onDragOver={(event) => {
                  if (draggedAnswer.current) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const answer = draggedAnswer.current;
                  draggedAnswer.current = null;
                  chooseAnswer(answer);
                }}
              />
              <Answers>
                <legend>Qual emoção a imagem representa?</legend>
                {[task.response1, task.response2, task.response3].map((answer, index) => (
                  <Answer key={index} type="button" aria-disabled={busy}
                    onClick={() => chooseAnswer(answer)}
                    draggable={!busy}
                    onDragStart={(event) => {
                      draggedAnswer.current = answer;
                      event.dataTransfer.setData('text/plain', answer);
                    }}
                    onDragEnd={() => { draggedAnswer.current = null; }}
                  >{answer}</Answer>
                ))}
              </Answers>
              <p role="status">{feedback}</p>
              {response && response !== task.emotion && (
                <button type="button" className="button button-save" disabled={busy}
                  onClick={finish}>Concluir atividade</button>
              )}
            </>
          )}
        </Content>
      </Container>
      <GlobalStyle />
    </>
  );
}

export default Task3;
