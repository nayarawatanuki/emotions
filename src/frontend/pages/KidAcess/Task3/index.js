import React, { useEffect, useRef, useState } from 'react';
import swal from 'sweetalert';
import { useHistory } from 'react-router-dom';
import '../../../global/styles/fireworks/style.css';
import './reward.css';

import api from '../../../services/api';
import GlobalStyle from '../../../global/styles';
import { Header, Container, Content, Answer, Answers, ActivityImage, FinishButton } from './styles';
import { useKidContext } from '../../../context/kidContext';
import { useTaskContext } from '../../../context/taskContext';

function rewardConfetti() {
  const confetti = document.createElement('div');
  confetti.className = 'pyro';
  confetti.setAttribute('aria-hidden', 'true');
  for (const position of ['before', 'after']) {
    const particles = document.createElement('div');
    particles.className = position;
    confetti.appendChild(particles);
  }
  return confetti;
}

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

    setFeedback('');
    if (showReward) {
      const rewards = await api.get(`/tasks/${task_id}/listRewards`)
        .then(({ data }) => data)
        .catch(() => []);
      for (const reward of rewards) {
        await swal({
          title: reward.message,
          icon: reward.photo,
          content: rewardConfetti(),
          className: 'tcc-reward-modal',
          button: 'OK',
        });
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
    if (!response) {
      setFeedback('Escolha uma emoção.');
      return;
    }
    const confirmed = await swal({
      title: 'Tem certeza que deseja finalizar a tarefa?',
      text: 'Depois de finalizar, você não poderá refazer a tarefa.',
      icon: 'warning',
      buttons: ['Recomeçar', 'Finalizar']
    });
    if (confirmed) saveActivityResult(response, attempts, false);
  }

  return (
    <>
      <Header className="navbar navbar-light bg-light">
        <button type="button" className="button button-danger" disabled={busy}
          aria-label="Sair da atividade" onClick={() => history.push('/Tasks')}>SAIR</button>
        <h1>Associando palavra a imagem &gt;&gt;</h1>
      </Header>
      <Container>
        <Content>
          {loadError && <p role="alert">Não foi possível carregar a atividade.</p>}
          {!task && !loadError && <p role="status">Carregando atividade…</p>}
          {task && (
            <>
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
              <Answers aria-label="Qual é a emoção?">
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
              <FinishButton type="button" className="button" disabled={busy}
                onClick={finish}>CONCLUIR</FinishButton>
              <p className="tcc-task-feedback" role="status">{feedback}</p>
            </>
          )}
        </Content>
      </Container>
      <GlobalStyle />
    </>
  );
}

export default Task3;
