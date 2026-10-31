import React, { Component } from 'react';
import { uniqueId } from 'lodash';
import filesize from 'filesize';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';

import { Link } from 'react-router-dom';

import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/FileUploadList/index.jsx';

class addKid extends Component {
  state = {
    uploadedFilePreview: [],
    uploadedFile: undefined
  };

  handleUpload = photo => {
    const addedFiles = photo.map(photo => ({
      photo,
      id: uniqueId(),
      name: photo.name,
      readableSize: filesize(photo.size),
      preview: URL.createObjectURL(photo),
      Progress: 0,
      uploaded: false,
      error: false,
      url: photo.url,
    }));

    //mostra preview
    this.setState({
      uploadedFilePreview: addedFiles,
      uploadedFile: addedFiles[0]
    });
  }

  updateFile = (id, data) => {
    this.setState({
      uploadedFilePreview: this.state.uploadedFilePreview.map(uploadedFile => {
        return id === uploadedFile.id
          ? { ...uploadedFile, ...data }
          : uploadedFile;
      })
    });
  }

  createdKid = async () => {

    var data = new FormData();

    data.append('treatment', document.getElementById('treatment').value);
    data.append('name', document.getElementById('name').value);
    data.append('user', document.getElementById('user').value);
    data.append('code', document.getElementById('code').value);
    data.append('rate', document.getElementById('rate').value);
    data.append('birth', document.getElementById('birth').value);

    data.append('parent', document.getElementById('parent').value);
    data.append('note', document.getElementById('note').value);
    data.append('photo', this.state.uploadedFile.photo, this.state.uploadedFile.name);

    for (var key of data.entries()) {
      console.log(key[0] + ': ' + key[1]);
    }

    await api.post('createdKid', data);
    this.props.history.push('/Kids');
  }

  render() {
    const { uploadedFilePreview } = this.state;
    return (
      <App>
        <nav className="navbar navbar-light bg-light">
          <Link to="/Kids">
              <button type="button" className="button button-info">Voltar</button>
          </Link>
          <h5 className="navbar-brand float-center">Adicionando criança</h5>
          <h1> </h1>
        </nav>
        <Container>
          <Content>
            <form encType='multipar/form-data'>
              <div className="form-check">
                <input type="checkbox" id="treatment" defaultValue="off"
                className="form-check-input"
                onChange={(e)=>{
                  if(e.target.checked !== true){
                    e.target.value = "off"
                  }else{
                    e.target.value = "on"
                  }
                }} />
                <label htmlFor="treatment" style={{fontSize: '14px'}}>Tratamento ativo</label>
              </div>

              <div className="form-infoKid" style={{marginTop: "4%"}}>

                <div className="form-group">
                  <label htmlFor="user"> Usuário </label>
                  <input type="text" id="user" name="user" className="form-control" placeholder="Digite o usuário" />
                </div>

                <div className="form-group" >
                  <label htmlFor="code">Código de Acesso</label>
                  <input type="number" id="code" name="code" className="form-control" placeholder="Defina um código de acesso" defaultValue={parseInt(Math.random()*10000)} />
                </div>

                <div className="form-group">
                  <label htmlFor="name"> Nome </label>
                  <input type="text" id="name" name="name" className="form-control" placeholder="Digite o nome da criança" />
                </div>

                <div className="form-row">
                  <div className="form-group-state col-md-6">
                    <label htmlFor="rate">Grau</label>
                    <select id="rate" name="rate" className="form-control" placeholder="Selecione">
                      <option> </option>
                      <option value = "severo" >Severo</option>
                      <option value = "moderado">Moderado</option>
                      <option value = "leve">Leve</option>
                    </select>
                  </div>
                  <div className="form-group col-md-6">
                    <label htmlFor="birth">Data de nascimento</label>
                    <input type="date" id="birth" name="birth" className="form-control" />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="parent">Responsável</label>
                  <input type="text" id="parent" name="parent" className="form-control" placeholder="Nome do responsável" />
                </div>

                <div className="form-group">
                  <label htmlFor="note">Observações da criança</label>
                  <textarea type="text" id="note" name="note" className="form-control" placeholder="Observações sobre a criança" />
                </div>

                <div className="form-group" >
                  <Upload onUpload={this.handleUpload} />

                  { !!uploadedFilePreview.length && (
                    <FileList files={uploadedFilePreview} />
                  )}
                </div>

                <div>
                  <Link to="/Kids">
                    <button className="button button-danger">Cancelar</button>
                  </Link>

                  <button type="button" onClick ={this.createdKid} className="button button-success">Adicionar</button>

                </div>
              </div>
            </form>
          </Content>
          <GlobalStyle />
        </Container>
      </App>
    )
  }
}

export default addKid;
