import { apiRoutes, pageRoutes } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import { ActionButton } from '../../../components/ActionButton';
import React, { useState } from 'react';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';

import api from '../../../services/api';
import {useHistory } from 'react-router-dom'

function AddAdministrator() {
    const history = useHistory();

    const [name,setName] = useState("");
    const [user,setUser] = useState("");
    const [password,setPassword] = useState("");

    const [saving, setSaving] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            await api.post(apiRoutes.administrators, { name, user, password });
            history.push(pageRoutes.administration);
        } catch {
            window.alert('Não foi possível cadastrar o administrador.');
            setSaving(false);
        }
    }

    return (
        <App>
            <PageHeader title="Início" />
            <Container>
                <Content>
                    <form onSubmit={handleSubmit}>
                        <h1>Adicionar administrador</h1>

                        <div className="form-group">
                            <label htmlFor="name">Nome</label>
                            <input type="text"
                                id="name"
                                name="name"
                                className="form-control" required
                                placeholder="nome"
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="user">Usuário</label>
                            <input type="text"
                                id="user"
                                name="user"
                                className="form-control" required
                                placeholder="usuário"
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Senha</label>
                            <input type="password"
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                className="form-control" required
                                placeholder="senha"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <ActionButton
                            id="list"
                            className="btn-lg btn-block float-center"
                            type="submit" variant="success" disabled={saving}
                        >
                            {saving ? 'Salvando…' : 'Salvar'}
                        </ActionButton>
                    </form>
                </Content>
                <GlobalStyle />
            </Container>
        </App>
    )
}

export default AddAdministrator;