import { apiRoutes, pageRoutes, routeWithParams } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import { ActionButton, FormActions } from '../../../components/ActionButton';
import swal from 'sweetalert';
import React, { useRef, useState } from 'react';
import { uniqueId } from 'lodash';
import filesize from 'filesize';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';

import { useHistory } from 'react-router-dom'

import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/mappings/FileList';
import { useKidContext } from "../../../context/kidContext";

function AddActivity () {

  const [uploadedFilePreview, setUploadedFilePreview] = useState([]);
  const [uploadedFile, setUploadedFile] = useState();

  const [rewardFilePreview, setRewardFilePreview] = useState([]);
  const [rewardFile, setRewardFile] = useState();

  const {kidId} = useKidContext();


  const history = useHistory();
  const activityId = useRef(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  function handleUpload(image) {
    const addedFile = image.map(image => ({
      image,
      id: uniqueId(),
      name: image.name,
      readableSize: filesize(image.size),
      preview: URL.createObjectURL(image),
      Progress: 0,
      uploaded: false,
      error: false,
      url: image.url,
    }));

    //mostra preview
    setUploadedFilePreview(addedFile);
    setUploadedFile(addedFile[0]);
    
  }

  function removeActivityImage() {
    if (!uploadedFile || saving.current) return;
    URL.revokeObjectURL(uploadedFile.preview);
    setUploadedFilePreview([]);
    setUploadedFile(undefined);
  }

  async function createdActivity(form) {
    const data = new FormData(form);
    data.delete('photo');
    data.delete('message');
    data.set('image', uploadedFile.image, uploadedFile.name);
    data.set('status', 'Não realizada');
    const { data: activity } = await api.post(routeWithParams(apiRoutes.kidActivities, { kid_id: kidId }), data);
    return activity.id;
  }

  async function handleReward(image) {
    const addedFile = image.map(image => ({
      image,
      id: uniqueId(),
      name: image.name,
      readableSize: filesize(image.size),
      preview: URL.createObjectURL(image),
      Progress: 0,
      uploaded: false,
      error: false,
      url: image.url,
    }));

    //mostra preview
    setRewardFilePreview(addedFile);
    setRewardFile(addedFile[0]);
  }

  function removeRewardImage() {
    if (!rewardFile || saving.current) return;
    URL.revokeObjectURL(rewardFile.preview);
    setRewardFilePreview([]);
    setRewardFile(undefined);
  }

  async function createReward(activity, message) {
    const data = new FormData();
    data.set('photo', rewardFile.image, rewardFile.name);
    data.set('message', message);
    await api.post(routeWithParams(apiRoutes.activityRewards, { activity_id: activity }), data);
  }

  async function submitActivity(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (saving.current || !form.reportValidity()) return;
    if (!uploadedFile || !rewardFile) {
      await swal('Escolha a imagem da atividade e a imagem da recompensa.');
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      if (activityId.current === null) activityId.current = await createdActivity(form);
      await createReward(activityId.current, form.elements.message.value);
      history.push(pageRoutes.kids);
    } catch {
      await swal(activityId.current === null
        ? 'Não foi possível salvar a atividade.'
        : 'A atividade foi salva. Tente salvar a recompensa novamente.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

    return (
      <App>
        <PageHeader title="Adicionar atividade" heading
            start={<ActionButton to={pageRoutes.kids} className="tcc-button-link">Voltar</ActionButton>} />
        <Container>
          <Content>
            <form onSubmit={submitActivity}>
              <div className="form-infoKid" style={{marginTop: "4%"}}>
                <div className="form-group">
                  
                </div>
              </div>
              <div className="form-group" >
                <label htmlFor="name">Nome</label>
                <input type="text" id="name" name="name" className="form-control" placeholder="Nome da Atividade" />
              </div>
              <div className="form-group" >
                <label htmlFor="emotion">Emoção (resposta correta)</label>
                <input type="text" id="emotion" name="emotion" className="form-control" placeholder="Qual será a emoção trabalhada?" />
              </div>
              <div className="form-group" >
                <label htmlFor="image">Escolha a imagem</label>
                <Upload id="image" label="Escolher imagem da atividade" onUpload={handleUpload} />
                
                { !!uploadedFilePreview.length && (
                  <FileList file={uploadedFilePreview} onDelete={removeActivityImage} disabled={busy} />
                )}
              </div>

              <p style={{fontWeight: 'bold'}}>Entre as alternativas abaixo, insira UMA correta:</p>
              
              <div className="form-group">
                  <label htmlFor="response1">Alternativa 1</label>
                  <input type="text" id="response1" name="response1" className="form-control" placeholder="Emoção Alternativa 1" />
              </div>  

              <div className="form-group">
                  <label htmlFor="response2">Alternativa 2</label>
                  <input type="text" id="response2" name="response2" className="form-control" placeholder="Emoção Alternativa 2" />
              </div>

              <div className="form-group">
                  <label htmlFor="response3">Alternativa 3</label>
                  <input type="text" id="response3" name="response3" className="form-control" placeholder="Emoção Alternativa 3" />
              </div>

              <div className="form-group" >
                <label htmlFor="photo">Escolha a imagem da mensagem de resposta certa</label>
                <Upload id="photo" label="Escolher imagem da recompensa" onUpload={handleReward} />
                
                { !!rewardFilePreview.length && (
                  <FileList file={rewardFilePreview} onDelete={removeRewardImage} disabled={busy} />
                )}
              </div>

              <div className="form-group">
                  <label htmlFor="message">Mensagem de resposta certa</label>
                  <input type="text" id="message" name="message" className="form-control"/>
              </div>

              <FormActions>
                <ActionButton to={pageRoutes.kids} variant="danger">Cancelar</ActionButton>

                <ActionButton type="submit" variant="success" disabled={busy}>Criar atividade</ActionButton>
              </FormActions>
            </form>
          </Content>
          <GlobalStyle />
        </Container>
      </App>
    )
  }


export default AddActivity;
