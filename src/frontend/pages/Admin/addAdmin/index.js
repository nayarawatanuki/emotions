import FormField from '../../../components/FormField';
import React, { useState } from 'react';
import PageHeader from '../../../components/PageHeader';

import { App, Container, Content } from './styles.js';

import api from '../../../services/api';
import { Link, useHistory } from 'react-router-dom';

function addAdmin() {
    const history = useHistory();

    const [name,setName] = useState("");
    const [user,setUser] = useState("");
    const [password,setPassword] = useState("");

    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setSaving(true);
        try {
            await api.post('/adminCreated', { name, user, password });
            history.push('/Admin');
        } catch {
            setError('Não foi possível cadastrar o profissional. Confira os dados e tente novamente.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <App>
            <PageHeader>
                <Link className="navbar-brand" to="/">Início</Link>
            </PageHeader>
            <Container>
                <Content>
                    <form className="legacy-form" onSubmit={handleSubmit}>
                        <h1>Cadastrar profissional</h1>
                        <p>Campos com * são obrigatórios.</p>

                        <FormField label="Nome">
                            <input type="text"
                                id="name"
                                name="name"
                                className="form-control"
                                autoComplete="name" required
                                onChange={(e) => setName(e.target.value)}
                            />
                        </FormField>

                        <FormField label="Usuário">
                            <input type="text"
                                id="user"
                                name="user"
                                className="form-control"
                                autoComplete="username" required
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </FormField>

                        <FormField label="Senha (mínimo de 15 caracteres)">
                            <input type="password"
                                id="new-password"
                                name="password"
                                className="form-control"
                                autoComplete="new-password" minLength={15} required
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </FormField>
                        
                        {error && <p role="alert">{error}</p>}
                        <button
                            id="list"
                            className="button button-info btn-lg btn-block float-center"
                            type="submit" disabled={saving}
                        >
                            {saving ? 'Salvando…' : 'Cadastrar'}
                        </button>
                    </form>
                </Content>
            </Container>
        </App>                
    )
}

export default addAdmin;