import { apiRoutes, pageRoutes } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import { ActionButton, FormActions } from '../../../components/ActionButton';
import React, { Component } from 'react';
import { uniqueId } from 'lodash';
import filesize from 'filesize';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';


import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/mappings/FileList';

class AddKid extends Component {
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

  removePhoto = () => {
    const { uploadedFile, saving } = this.state;
    if (!uploadedFile || saving) return;
    URL.revokeObjectURL(uploadedFile.preview);
    this.setState({ uploadedFilePreview: [], uploadedFile: undefined });
  };

  createKid = async (event) => {
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
      await api.post(apiRoutes.kids, data);
      this.props.history.push(pageRoutes.kids);
    } catch {
      this.setState({ saving: false, error: 'Não foi possível cadastrar a criança.' });
    }
  }

  render() {
    const { uploadedFilePreview, saving, error } = this.state;
    return (
      <App>
        <PageHeader title="Adicionar criança" heading
            start={<ActionButton to={pageRoutes.kids} className="tcc-button-link">Voltar</ActionButton>} />
        <Container>
          <Content>
            <form onSubmit={this.createKid}>
              <div className="form-check">
                <input type="checkbox" id="kid-care" name="treatment" className="form-check-input" />
                <label htmlFor="kid-care" style={{fontSize: '14px'}}>Acompanhamento ativo</label>
              </div>       

              <div className="form-infoKid" style={{marginTop: "4%"}}>

                <div className="form-group">
                  <label htmlFor="user"> Usuário </label>
                  <input type="text" id="user" name="user" className="form-control" placeholder="Digite o usuário" />
                </div>

                <div className="form-group" >
                  <label htmlFor="code">Código de acesso</label>
                  <input type="number" id="code" name="code" className="form-control" placeholder="Defina um código de acesso" defaultValue={parseInt(Math.random()*10000)} />
                </div>

                <div className="form-group">
                  <label htmlFor="name"> Nome </label>
                  <input type="text" id="name" name="name" className="form-control" placeholder="Digite o nome da criança" />
                </div>

                <div className="form-row">
                  <div className="form-group-state col-md-6">
                    <label htmlFor="kid-grade">Grau</label>
                    <select id="kid-grade" name="rate" className="form-control" placeholder="Selecione">
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
                  <Upload id="photo" label="Escolher foto da criança" onUpload={this.handleUpload} />
                  
                  { !!uploadedFilePreview.length && (
                    <FileList file={uploadedFilePreview} onDelete={this.removePhoto} disabled={saving} />
                  )}
                </div>

                <FormActions>
                  <ActionButton to={pageRoutes.kids} variant="danger">Cancelar</ActionButton>

                  <ActionButton type="submit" variant="success" disabled={saving}>Salvar</ActionButton>
                </FormActions>
                {error && <p role="alert">{error}</p>}
              </div>
            </form>
          </Content>
          <GlobalStyle />
        </Container>
      </App>
    )
  }
}

export default AddKid;