import React from 'react';

import { legacyMediaUrl } from '../../services/api';
import { ActivityImage, Answer, Answers } from './styles';

const emotions = new Map([
  ['alegria', ['joy', '😊']],
  ['felicidade', ['joy', '😊']],
  ['raiva', ['anger', '😠']],
  ['tristeza', ['sadness', '😢']],
  ['medo', ['fear', '😨']],
  ['surpresa', ['surprise', '😮']],
  ['nojo', ['disgust', '🤢']],
]);

export default function EmotionActivity({ activity, getAnswerProps, imageEvents }) {
  const Heading = getAnswerProps ? 'h1' : 'h3';

  return (
    <>
      <Heading>Associe a emoção à imagem</Heading>
      <p>Arraste ou clique na emoção que combina com a imagem. Se usar o teclado, vá até a opção com Tab e pressione Enter.</p>
      {activity.image && (
        <ActivityImage src={legacyMediaUrl(activity.image)}
          alt={activity.image_description || 'Imagem da atividade sem descrição disponível.'}
          {...imageEvents} />
      )}
      <Answers>
        <legend>Qual emoção a imagem representa?</legend>
        {[activity.response1, activity.response2, activity.response3].map((answer, index) => {
          const [tone, icon] = emotions.get(answer?.trim().toLocaleLowerCase('pt-BR')) || [];
          return (
            <Answer as={getAnswerProps ? 'button' : 'span'} key={index} data-emotion={tone}
              {...getAnswerProps?.(answer)}>
              {icon && <span className="emotion-answer-icon" aria-hidden="true">{icon}</span>}
              <span>{answer}</span>
            </Answer>
          );
        })}
      </Answers>
    </>
  );
}
