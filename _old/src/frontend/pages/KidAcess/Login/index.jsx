import React, { useState, useEffect } from "react";
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

    async function login(){    

        await api.post(
            'login',
            { user, code }
        )
        .then(response => 
            saveId(response.data)            
        ).catch((error) => {
            console.error('error', error)
        })
    }

    async function handleSubmit(e) {
        e.preventDefault();
        await login(); 
    
        saveName(user);
        history.push('/Tasks');
    }
    
    return (
        <App>
            <nav className="navbar navbar-light bg-light">
                <h4 className="navbar float-center">HOME</h4>
            </nav>
        
            <Container>
                <Content>
                    <form> 
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
                            <input type="number" 
                                id="code" 
                                name="code" 
                                className="form-control" 
                                placeholder="senha" 
                                onChange={(e) => setCode(e.target.value)}
                            /> 
                        </div>
                        
                        <button
                            id="list"
                            className="button button-info btn-lg btn-block float-center"
                            onClick={handleSubmit}
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