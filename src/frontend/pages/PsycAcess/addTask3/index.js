import FormField from '../../../components/FormField';
import React, { useRef, useState } from 'react';
import PageHeader from '../../../components/PageHeader';

import { App, Container, Content } from './styles.js';

import { Link, useHistory, useLocation } from 'react-router-dom'

import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/mappings/FileList';
import { useKidContext } from "../../../context/kidContext";

function AddTask() {
  const [activityImage, setActivityImage] = useState(null);
  const [rewardImage, setRewardImage] = useState(null);
  const [status, setStatus] = useState('');

  const { kid_id: selectedChild } = useKidContext();
  const { search } = useLocation();
  const childId = /^\?\d+$/.test(search) ? search.slice(1) : selectedChild;
  const history = useHistory();
  const activityId = useRef(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  async function sendTask(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (saving.current || !childId) return;

    const data = new FormData(form);
    const description = String(data.get('image_description')).trim();
    if (!description) {
      setStatus('Descreva a imagem da atividade.');
      form.elements.image_description.focus();
      return;
    }
    if (!activityImage || !rewardImage) {
      setStatus('Escolha a imagem da atividade e a imagem da recompensa.');
      return;
    }

    const reward = new FormData();
    reward.set('photo', rewardImage);
    reward.set('message', data.get('message'));
    data.delete('message');
    data.set('kid_id', childId);
    data.set('image_description', description);
    data.set('image', activityImage);
    data.set('status', 'Não realizada');

    saving.current = true;
    setBusy(true);
    setStatus('');
    try {
      if (activityId.current === null) {
        const { data: activity } = await api.post(`/kids/${childId}/createdTask`, data);
        activityId.current = activity.id;
      }
      reward.set('task_id', activityId.current);
      await api.post(`/tasks/${activityId.current}/createdReward`, reward);
      history.push('/Kids');
    } catch {
      setStatus(activityId.current === null
        ? 'Não foi possível salvar a atividade.'
        : 'A atividade foi salva. Tente salvar a recompensa novamente.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

    return (
      <App>
        <PageHeader title="Adicionar atividade" backTo="/Kids" />
        <Container>
          <Content>
            <form className="legacy-form" onSubmit={sendTask}>
              <p>Campos com * são obrigatórios.</p>
              <FormField label="Nome">
                  <input type="text" id="name" name="name" className="form-control" required placeholder="Nome da Atividade" />
              </FormField>
              <FormField label="Emoção (resposta correta)">
                  <input type="text" id="emotion" name="emotion" className="form-control" required placeholder="Qual será a emoção trabalhada?" />
              </FormField>
              <div className="form-group" >
                <label htmlFor="image">Escolha a imagem</label>
                <Upload id="image" label="Escolher imagem da atividade" onUpload={([file]) => setActivityImage(file)} />
                
                {activityImage && <FileList file={activityImage} onDelete={() => setActivityImage(null)} />}
              </div>

              <FormField label="Descrição da imagem"
                help="Descreva os sinais visíveis, como a expressão ou a postura. Evite dizer o nome da emoção.">
                <textarea id="image-description" name="image_description" className="form-control" required />
              </FormField>

              <p style={{fontWeight: 'bold'}}>Entre as alternativas abaixo, insira UMA correta:</p>
              
              <FormField label="Alternativa 1">
                  <input type="text" id="response1" name="response1" className="form-control" required placeholder="Emoção Alternativa 1" />
              </FormField>

              <FormField label="Alternativa 2">
                  <input type="text" id="response2" name="response2" className="form-control" required placeholder="Emoção Alternativa 2" />
              </FormField>

              <FormField label="Alternativa 3">
                  <input type="text" id="response3" name="response3" className="form-control" required placeholder="Emoção Alternativa 3" />
              </FormField>

              <div className="form-group" >
                <label htmlFor="photo">Escolha a imagem da mensagem de resposta certa</label>
                <Upload id="photo" label="Escolher imagem da recompensa" onUpload={([file]) => setRewardImage(file)} />
                
                {rewardImage && <FileList file={rewardImage} onDelete={() => setRewardImage(null)} />}
              </div>

              <FormField label="Mensagem de resposta certa">
                  <input type="text" id="message" name="message" className="form-control" required/>
              </FormField>

              {!childId && <p role="alert">Selecione uma criança antes de cadastrar a atividade.</p>}
              {status && <p role="alert">{status}</p>}
              <div className="legacy-actions">
                <Link to="/Kids" className="button button-danger">Cancelar</Link>

                <button type="submit" className="button button-success" disabled={busy || !childId}>Criar atividade</button>
              </div>
            </form>
          </Content>
        </Container>
      </App>
    )
  }


export default AddTask;
