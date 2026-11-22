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

  const [mess, setMess] = useState([]);

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

  async function createdActivity() {
    

    var data = new FormData();

    data.append('kid_id', kid_id);
    
    data.append('name', document.getElementById('name').value);
    data.append('emotion', document.getElementById('emotion').value);
    data.append('response1', document.getElementById('response1').value);
    data.append('response2', document.getElementById('response2').value);
    data.append('response3', document.getElementById('response3').value);
    data.append('image_description', document.getElementById('image-description').value.trim());
    data.append('image', uploadedFile.image, uploadedFile.name);
    data.append('status', 'Não realizada');

    for (var key of data.entries()) {
      console.log(key[0] + ': ' + key[1]);
    }


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

  async function createdReward(task) {

    var data = new FormData();

    data.append('task_id', task);
    
    data.append('photo', rewardFile.image, rewardFile.name);
    data.append('message', mess);

    for (var key of data.entries()) {
      console.log(key[0] + ': ' + key[1]);
    }

    return api.post(`/tasks/${task}/createdReward`, data)
    .then((response) => {
      console.log(response.data)
    })
  }

  async function sendTask(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const description = form.elements.image_description;
    description.value = description.value.trim();
    if (saving.current || !form.reportValidity()) return;
    if (!uploadedFile || !rewardFile) {
      await swal('Escolha a imagem da atividade e a imagem da recompensa.');
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      if (activityId.current === null) activityId.current = await createdActivity();
      await createdReward(activityId.current);
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
          <Link to="/Kids">
              <button type="button" className="button button-info">Voltar</button>
          </Link>
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

              <div className="form-group">
                <label htmlFor="image-description">Descrição da imagem (obrigatória)</label>
                <p id="image-description-help">
                  Descreva os sinais visíveis, como a expressão ou a postura. Evite dizer o nome da emoção.
                </p>
                <textarea id="image-description" name="image_description" className="form-control"
                  aria-describedby="image-description-help" required />
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
                  <input type="text" id="message" name="message" className="form-control" onChange={(e) => setMess(e.target.value)}/>
              </div>

              <div>
                <Link to="/Kids">
                  <button className="button button-danger">Cancelar</button>
                </Link>

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