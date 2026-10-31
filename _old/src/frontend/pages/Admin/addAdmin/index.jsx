import React, { useState } from 'react';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles.js';

import api from '../../../services/api';
import {useHistory } from 'react-router-dom'

function addAdmin() {
    const history = useHistory();

    const [name,setName] = useState("");
    const [user,setUser] = useState("");
    const [password,setPassword] = useState("");

    async function create(){    
        if(!name || !user || !password){
            window.alert('Prencha todos os campos')
        }

        await api.post(
            '/adminCreated',
            { name: name, user: user, password: password },
            
            window.alert('Cadastrado')
            )
            .then(response => 
            console.log(JSON.stringify({
                'name': name, 
                'user': user, 
                'password': password
            })),
            console.log("Enviado!")
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        await create(); 
    
        history.push('/Admin')
    }

    return (
        <App>
            <nav className="navbar navbar-light bg-light">
                <h4 className="navbar float-center">HOME</h4>
            </nav>
            <Container>
                <Content>
                    <form> 
                        <h1>Cadastre um Admin</h1>

                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input type="text" 
                                id="name" 
                                name="name" 
                                className="form-control" 
                                placeholder="name" 
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="user">User</label>
                            <input type="text" 
                                id="user" 
                                name="user" 
                                className="form-control" 
                                placeholder="usuario" 
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="code">Senha</label>
                            <input type="text" 
                                id="code" 
                                name="code" 
                                className="form-control" 
                                placeholder="senha" 
                                onChange={(e) => setPassword(e.target.value)}
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

export default addAdmin;