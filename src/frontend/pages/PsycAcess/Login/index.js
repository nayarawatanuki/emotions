import React, { useState } from "react";
import api from '../../../services/api';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles';

import { useHistory } from 'react-router-dom';

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
            <nav className="navbar navbar-light bg-light">
                <h4 className="navbar float-center">HOME</h4>
            </nav>
        
            <Container>
                <Content>
                    <form onSubmit={handleSubmit}>
                        <h1>Vamos começar?</h1>

                        <div className="form-group">
                            <label htmlFor="user">Usuário</label>
                            <input type="text" 
                                id="user" 
                                name="user"
                                autoComplete="username"
                                required
                                className="form-control" 
                                placeholder="usuário" 
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="code">Senha</label>
                            <input type="password" 
                                id="code" 
                                name="password"
                                autoComplete="current-password"
                                required
                                className="form-control" 
                                placeholder="senha" 
                                onChange={(e) => setPassword(e.target.value)}
                            /> 
                        </div>
                        
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
                <GlobalStyle />
            </Container>
        </App>                
    )
    
}
export default PsycLogin;