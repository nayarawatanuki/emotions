import swal from 'sweetalert';
import React, { useRef, useState } from 'react';
import { uniqueId } from 'lodash';
import filesize from 'filesize';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';

import { Link, useHistory } from 'react-router-dom'

import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/mappings/FileList';
import { useKidContext } from "../../../context/kidContext";

function addTask3 () {

  const [uploadedFilePreview, setUploadedFilePreview] = useState([]);
  const [uploadedFile, setUploadedFile] = useState();

  const [rewardFilePreview, setRewardFilePreview] = useState([]);
  const [rewardFile, setRewardFile] = useState();

  const {kid_id} = useKidContext();


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

  function updateFile(id, data) {
    setUploadedFilePreview(uploadedFilePreview.map(uploadedFile => { 
        return id === uploadedFile.id 
          ? { ...uploadedFile, ...data } 
          : uploadedFile;
      }))
  }

  async function createdActivity(form) {
    const data = new FormData(form);
    data.delete('photo');
    data.delete('message');
    data.set('image', uploadedFile.image, uploadedFile.name);
    data.set('status', 'Não realizada');
    const { data: activity } = await api.post(`/kids/${kid_id}/createdTask`, data);
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

  function updateReward(id, data) {
    setRewardFilePreview(rewardFilePreview.map(uploadedFile => { 
        return id === uploadedFile.id 
          ? { ...uploadedFile, ...data } 
          : uploadedFile;
      })
    );
  }

  async function createdReward(task, message) {
    const data = new FormData();
    data.set('photo', rewardFile.image, rewardFile.name);
    data.set('message', message);
    await api.post(`/tasks/${task}/createdReward`, data);
  }

  async function sendTask(event) {
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
      await createdReward(activityId.current, form.elements.message.value);
      history.push('/Kids');
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
        <nav className="navbar navbar-light bg-light">
          <Link to="/Kids" className="button button-info tcc-button-link">Voltar</Link>
          <h5 className="navbar-brand float-center">Adicionando atividade</h5>
          <h1> </h1>
        </nav>
        <Container>
          <Content>
            <form onSubmit={sendTask}>
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
                <Upload id="image" onUpload={handleUpload} />
                
                { !!uploadedFilePreview.length && (
                  <FileList file={uploadedFilePreview} />
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
                <Upload id="photo" onUpload={handleReward} />
                
                { !!rewardFilePreview.length && (
                  <FileList file={rewardFilePreview} />
                )}
              </div>

              <div className="form-group">
                  <label htmlFor="message">Mensagem de resposta certa</label>
                  <input type="text" id="message" name="message" className="form-control"/>
              </div>

              <div>
                <Link to="/Kids" className="button button-danger tcc-button-link">Cancelar</Link>

                <button type="submit" className="button button-success" disabled={busy}>Criar atividade</button>
              </div>
            </form>
          </Content>
          <GlobalStyle />
        </Container>
      </App>
    )
  }


export default addTask3;
