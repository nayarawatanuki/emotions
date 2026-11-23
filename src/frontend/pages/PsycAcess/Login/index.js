import FormField from '../../../components/FormField';
import React, { useState } from "react";
import PageHeader from '../../../components/PageHeader';
import api from '../../../services/api';

import { App, Container, Content } from './styles';

import { Link, useHistory } from 'react-router-dom';

function PsycLogin() {

    const [user, setUser] = useState();
    const [password, setPassword] = useState();
    const history = useHistory();
    
    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        try {
            await api.post('adminLogin', { user, password });
            history.push('/Kids');
        } catch (requestError) {
            setError(requestError.response?.status === 401
                ? 'Usuário ou senha inválidos.'
                : 'Não foi possível entrar. Tente novamente.');
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
                        <h1>Vamos começar?</h1>
                        <p>Campos com * são obrigatórios.</p>

                        <FormField label="Usuário">
                            <input type="text"
                                id="user"
                                name="user"
                                autoComplete="username"
                                required
                                className="form-control"
                                placeholder="usuário"
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </FormField>

                        <FormField label="Senha">
                            <input type="password"
                                id="code"
                                name="password"
                                autoComplete="current-password"
                                required
                                className="form-control"
                                placeholder="senha"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </FormField>
                        
                        {error && <p role="alert">{error}</p>}
                        <button
                            id="list"
                            className="button button-info btn-lg btn-block float-center"
                            type="submit"
                        >
                            Entrar
                        </button>
                    </form>
                </Content>
            </Container>
        </App>                
    )
    
}
export default PsycLogin;