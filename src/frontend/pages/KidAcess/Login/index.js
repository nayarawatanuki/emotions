import React, { useState } from "react";
import api from '../../../services/api';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles';

import { useHistory } from 'react-router-dom';
import { useKidContext } from "../../../context/kidContext";

function KidAcess() {

    const {saveId, saveName} = useKidContext();
    const [user, setUser] = useState();
    const [code, setCode] = useState();
    const history = useHistory();

    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        try {
            const { data } = await api.post('login', { user, code });
            saveId(data);
            saveName(user);
            history.push('/Tasks');
        } catch (requestError) {
            setError(requestError.response?.status === 429
                ? 'Muitas tentativas. Tente novamente mais tarde.'
                : 'Não foi possível entrar. Confira seu usuário e código.');
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
                                className="form-control" 
                                placeholder="usuário" 
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="code">Senha</label>
                            <input type="password" inputMode="numeric"
                                id="code" 
                                name="code" 
                                className="form-control" 
                                placeholder="senha" 
                                onChange={(e) => setCode(e.target.value)}
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

export default KidAcess;