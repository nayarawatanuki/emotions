import React, { useState } from 'react';
import { uniqueId } from 'lodash';
import filesize from 'filesize';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';

import { Link, useHistory } from 'react-router-dom'

import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/FileUploadList/index.jsx';
import { useKidContext } from "../../../context/kidContext";
import { useTaskContext } from "../../../context/taskContext";

function addTask3 () {

  const [uploadedFilePreview, setUploadedFilePreview] = useState([]);
  const [uploadedFile, setUploadedFile] = useState();

  const [rewardFilePreview, setRewardFilePreview] = useState([]);
  const [rewardFile, setRewardFile] = useState();

  const {kid_id} = useKidContext();

  var {task} = useState([]);
  const [mess, setMess] = useState([]);

  const history = useHistory();

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
    data.append('image', uploadedFile.image, uploadedFile.name);
    data.append('status', 'Não realizada');

    for (var key of data.entries()) {
      console.log(key[0] + ': ' + key[1]);
    }


    await(api.post(`/kids/${kid_id}/createdTask`, data)
    .then((response) => {
      task = response.data.id;
    }))
    console.log(task);
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

  async function createdReward() {

    var data = new FormData();

    data.append('task_id', task);
    
    data.append('photo', rewardFile.image, rewardFile.name);
    data.append('message', mess);

    for (var key of data.entries()) {
      console.log(key[0] + ': ' + key[1]);
    }

    api.post(`/tasks/${16}/createdReward`, data)
    .then((response) => {
      console.log(response.data)
    })
  }

  async function sendTask() {
    await createdActivity()
    .then(() => {
      createdReward();
      history.push('/Kids');
    })
    
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
            <form encType='multipar/form-data'>
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
                <Upload onUpload={handleUpload} />
                
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
                <Upload onUpload={handleReward} />
                
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

                <Link to="/Kids">
                  <button onClick={sendTask} className="button button-success">Criar atividade</button>
                </Link>
              </div>
            </form>
          </Content>
          <GlobalStyle />
        </Container>
      </App>
    )
  }


export default addTask3;