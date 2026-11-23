import FormField from '../../../components/FormField';
import React, { Component } from 'react';
import PageHeader from '../../../components/PageHeader';

import { App, Container, Content } from './styles.js';

import { Link, withRouter } from 'react-router-dom';

import api from '../../../services/api/index';
import Upload from '../../../components/Upload';
import FileList from '../../../components/mappings/FileList';

class addKid extends Component {
  state = {
    photo: null,
    busy: false,
    error: ''
  };

  handleUpload = ([photo]) => this.setState({ photo });

  createdKid = async (event) => {
    event.preventDefault();
    if (this.state.busy) return;
    const data = new FormData(event.currentTarget);
    data.set('treatment', data.has('treatment') ? 'on' : 'off');
    if (this.state.photo) {
      data.set('photo', this.state.photo);
    }

    this.setState({ busy: true, error: '' });
    try {
      await api.post('createdKid', data);
      this.props.history.push('/Kids');
    } catch {
      this.setState({ busy: false, error: 'Não foi possível cadastrar a criança. Confira os campos e tente novamente.' });
    }
  }

  render() {
    const { photo, busy, error } = this.state;
    return (
      <App>
        <PageHeader title="Adicionar criança" backTo="/Kids" />
        <Container>
          <Content>
            <form className="legacy-form" onSubmit={this.createdKid} encType="multipart/form-data">
              <p>Campos com * são obrigatórios.</p>
              <div className="form-check">
                <input type="checkbox" id="treatment" name="treatment" className="form-check-input" />
                <label htmlFor="treatment" style={{fontSize: '14px'}}>Tratamento ativo</label>
              </div>       

              <div className="form-infoKid" style={{marginTop: "4%"}}>

                <FormField label="Usuário">
                    <input type="text" id="user" name="user" required className="form-control" placeholder="Digite o usuário" />
                </FormField>

                <FormField label="Código de Acesso">
                    <input type="text" inputMode="numeric" pattern="[0-9]{1,10}" required id="code" name="code" className="form-control" placeholder="Defina um código de acesso" />
                </FormField>

                <FormField label="Nome">
                    <input type="text" id="name" name="name" required className="form-control" placeholder="Digite o nome da criança" />
                </FormField>

                <div className="form-row">
                  <FormField label="Grau" className="form-group col-md-6">
                      <select id="rate" name="rate" required className="form-control">
                      <option value="">Selecione</option>
                      <option value = "severo" >Severo</option>
                      <option value = "moderado">Moderado</option>
                      <option value = "leve">Leve</option>
                    </select>
                  </FormField>
                  <FormField label="Data de nascimento" className="form-group col-md-6">
                      <input type="date" id="birth" name="birth" required className="form-control" />
                  </FormField>
                </div>    

                <FormField label="Responsável">
                    <input type="text" id="parent" name="parent" required className="form-control" placeholder="Nome do responsável" />
                </FormField>

                <FormField label="Observações da criança">
                    <textarea type="text" id="note" name="note" className="form-control" placeholder="Observações sobre a criança" />
                </FormField>

                <div className="form-group" >
                  <Upload onUpload={this.handleUpload} />
                  
                  {photo && <FileList file={photo} onDelete={() => this.setState({ photo: null })} />}
                </div>

                <div className="legacy-actions">
                  <Link to="/Kids" className="button button-danger">Cancelar</Link>
                  <button type="submit" disabled={busy} className="button button-success">
                    {busy ? 'Salvando…' : 'Adicionar'}
                  </button>
                  {error && <p role="alert">{error}</p>}
                </div>
              </div>
            </form>
          </Content>
        </Container>
      </App>
    )
  }
}

export default withRouter(addKid);