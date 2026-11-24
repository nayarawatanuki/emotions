import { apiRoutes, pageRoutes, routeWithParams } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import { ActionButton } from '../../../components/ActionButton';
import React, { useEffect, useRef, useState } from 'react';
import swal from 'sweetalert';
import { useHistory, useLocation } from 'react-router-dom';
import '../../../global/styles/fireworks/style.css';
import './reward.css';

import api, { legacyMediaUrl } from '../../../services/api';
import GlobalStyle from '../../../global/styles';
import { Container, Content, Answer, Answers, ActivityImage, FinishActions } from './styles';
import { useActivityContext } from "../../../context/activityContext";

function rewardConfetti() {
  const content = document.createElement('div');
  const confetti = document.createElement('div');
  confetti.className = 'pyro';
  confetti.setAttribute('aria-hidden', 'true');
  for (const position of ['before', 'after']) {
    const particles = document.createElement('div');
    particles.className = position;
    confetti.appendChild(particles);
  }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tcc-confetti-toggle';
  toggle.textContent = 'Pausar confetes';
  toggle.addEventListener('click', () => {
    const paused = confetti.dataset.paused !== 'true';
    confetti.dataset.paused = String(paused);
    toggle.textContent = paused ? 'Retomar confetes' : 'Pausar confetes';
  });
  content.append(confetti, toggle);
  return content;
}

function PlayActivity() {
  const { activityId: selectedActivityId } = useActivityContext();
  const { search } = useLocation();
  const activityId = /^\?\d+$/.test(search) ? search.slice(1) : selectedActivityId;
  const history = useHistory();
  const startedAt = useRef(Date.now());
  const saving = useRef(false);
  const draggedAnswer = useRef(null);
  const [activity, setActivity] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activityId) return;
    let active = true;
    api.get(routeWithParams(apiRoutes.activity, { activity_id: activityId })).then(({ data }) => {
      if (!active) return;
      if (!data) setLoadError(true);
      else {
        setActivity(data);
        startedAt.current = Date.now();
      }
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [activityId]);

  async function saveActivityResult(answer, tries, showReward) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFeedback('Salvando resultado…');
    const time = Math.floor((Date.now() - startedAt.current) / 1000);
    try {
      await api.post(routeWithParams(apiRoutes.activityResults, { activity_id: activityId }), { response: answer, tries, time });
    } catch {
      setFeedback('Não foi possível salvar o resultado. Tente novamente.');
      saving.current = false;
      setBusy(false);
      return;
    }

    setFeedback('');
    if (showReward) {
      const rewards = await api.get(routeWithParams(apiRoutes.activityRewards, { activity_id: activityId }))
        .then(({ data }) => data)
        .catch(() => []);
      for (const reward of rewards) {
        const closed = swal({
          title: reward.message || 'Recompensa',
          icon: legacyMediaUrl(reward.photo),
          content: rewardConfetti(),
          className: 'tcc-reward-modal',
          button: 'OK',
        });
        const dialog = document.querySelector('.tcc-reward-modal');
        dialog?.setAttribute('role', 'dialog');
        dialog?.setAttribute('aria-modal', 'true');
        dialog?.setAttribute('aria-label', reward.message || 'Recompensa');
        dialog?.querySelector('.swal-icon img')?.setAttribute('alt', 'Imagem da recompensa');
        try {
          await closed;
        } finally {
          dialog?.removeAttribute('role');
          dialog?.removeAttribute('aria-modal');
          dialog?.removeAttribute('aria-label');
        }
      }
      if (!rewards.length) await swal('Resposta correta! Resultado salvo.');
    } else {
      await swal('Resultado salvo.');
    }
    history.push(pageRoutes.kidActivities);
  }

  function chooseAnswer(answer) {
    if (saving.current || !answer) return;
    const tries = attempts + 1;
    setResponse(answer);
    setAttempts(tries);
    if (answer === activity.emotion) {
      saveActivityResult(answer, tries, true);
    } else {
      setFeedback(`“${answer}” não é a resposta certa. Tente outra opção.`);
    }
  }

  async function finish(event) {
    if (!response) {
      setFeedback('Escolha uma emoção.');
      return;
    }
    const finishButton = event.currentTarget;
    const confirmed = await swal({
      title: 'Tem certeza que deseja finalizar a atividade?',
      text: 'Depois de finalizar, você não poderá refazer a atividade.',
      icon: 'warning',
      buttons: ['Continuar atividade', 'Finalizar']
    });
    if (confirmed) await saveActivityResult(response, attempts, false);
    else finishButton.focus();
  }

  return (
    <>
      <PageHeader title="Associando palavra a imagem >>" heading
        start={<ActionButton variant="danger" type="button" disabled={busy}
          aria-label="Sair da atividade" onClick={() => history.push(pageRoutes.kidActivities)}>SAIR</ActionButton>} />
      <Container>
        <Content>
          {loadError && <p role="alert">Não foi possível carregar a atividade.</p>}
          {!activityId && <p role="status">Selecione uma atividade para começar.</p>}
          {activityId && !activity && !loadError && <p role="status">Carregando atividade…</p>}
          {activity && (
            <>
              <ActivityImage src={legacyMediaUrl(activity.image)}
                alt={activity.image_description || 'Imagem da atividade sem descrição disponível.'}
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
                {[activity.response1, activity.response2, activity.response3].map((answer, index) => (
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
              <FinishActions>
                <ActionButton variant="success" disabled={busy} onClick={finish}>Concluir</ActionButton>
              </FinishActions>
              <p className="tcc-activity-feedback" role="status">{feedback}</p>
            </>
          )}
        </Content>
      </Container>
      <GlobalStyle />
    </>
  );
}

export default PlayActivity;
