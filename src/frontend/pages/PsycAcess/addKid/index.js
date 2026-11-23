import React, { Component } from 'react';
import { uniqueId } from 'lodash';
import filesize from 'filesize';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';

import { Link } from 'react-router-dom';

import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/mappings/FileList';

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

  createdKid = async (event) => {
    event.preventDefault();
    if (this.state.saving) return;
    const { uploadedFile } = this.state;
    if (!uploadedFile) {
      this.setState({ error: 'Escolha a foto da criança.' });
      return;
    }
    const data = new FormData(event.currentTarget);
    data.set('treatment', data.has('treatment') ? 'on' : 'off');
    data.set('photo', uploadedFile.photo, uploadedFile.name);
    this.setState({ saving: true, error: '' });
    try {
      await api.post('createdKid', data);
      this.props.history.push('/Kids');
    } catch {
      this.setState({ saving: false, error: 'Não foi possível cadastrar a criança.' });
    }
  }

  render() {
    const { uploadedFilePreview, saving, error } = this.state;
    return (
      <App>
        <nav className="navbar navbar-light bg-light">
          <Link to="/Kids" className="button button-info tcc-button-link">Voltar</Link>
          <h5 className="navbar-brand float-center">Adicionando criança</h5>
          <h1> </h1>
        </nav>
        <Container>
          <Content>
            <form onSubmit={this.createdKid}>
              <div className="form-check">
                <input type="checkbox" id="treatment" name="treatment" className="form-check-input" />
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
                    <FileList file={uploadedFilePreview} />
                  )}
                </div>

                <div>
                  <Link to="/Kids" className="button button-danger tcc-button-link">Cancelar</Link>

                  <button type="submit" className="button button-success" disabled={saving}>Adicionar</button>
                  {error && <p role="alert">{error}</p>}
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