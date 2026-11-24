import { apiRoutes, pageRoutes } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import { ActionButton } from '../../../components/ActionButton';
import React, { useState } from "react";
import api from '../../../services/api';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles';

import { useHistory } from 'react-router-dom';

function ProfessionalLogin() {

    const [user, setUser] = useState();
    const [password, setPassword] = useState();
    const history = useHistory();
    
    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        try {
            const { data } = await api.post(apiRoutes.professionalLogin, { user, password });
            if (!Number.isInteger(data) || data <= 0) throw new Error('Invalid account');
            history.push(pageRoutes.kids);
        } catch {
            setError('Confira seu usuário e senha.');
        }
    }

    return (
        <App>
            <PageHeader title="Início" />
        
            <Container>
                <Content>
                    <form onSubmit={handleSubmit}>
                        <h1>Vamos começar?</h1>

                        <div className="form-group">
                            <label htmlFor="user">Usuário</label>
                            <input type="text" 
                                id="user" 
                                name="user"
                                autoComplete="username" required
                                className="form-control" 
                                placeholder="usuário" 
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="code">Senha</label>
                            <input type="password" 
                                id="code" 
                                name="code"
                                autoComplete="current-password" required
                                className="form-control" 
                                placeholder="senha" 
                                onChange={(e) => setPassword(e.target.value)}
                            /> 
                        </div>
                        
                        {error && <p role="alert">{error}</p>}
                        <ActionButton
                            id="list"
                            className="btn-lg btn-block float-center"
                            type="submit"
                        >
                            Entrar
                        </ActionButton>
                    </form>
                </Content>
                <GlobalStyle />
            </Container>
        </App>                
    )
    
}
export default ProfessionalLogin;