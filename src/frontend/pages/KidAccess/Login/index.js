import { apiRoutes, pageRoutes } from '../../../../routes';
import PageHeader from '../../../components/PageHeader';
import { ActionButton } from '../../../components/ActionButton';
import React, { useState } from "react";
import api from '../../../services/api';

import GlobalStyle from '../../../global/styles';
import { App, Container, Content } from './styles';

import { useHistory } from 'react-router-dom';
import { useKidContext } from "../../../context/kidContext";

function KidAccess() {

    const {saveId, saveName} = useKidContext();
    const [user, setUser] = useState();
    const [code, setCode] = useState();
    const history = useHistory();

    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        try {
            const { data } = await api.post(apiRoutes.kidLogin, { user, code });
            if (!Number.isInteger(data) || data <= 0) throw new Error('Invalid account');
            saveId(data);
            saveName(user);
            history.push(pageRoutes.kidActivities);
        } catch {
            setError('Confira seu usuário e código de acesso.');
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
                            <label htmlFor="code">Código de acesso</label>
                            <input type="number" 
                                id="code" 
                                name="code"
                                required
                                className="form-control" 
                                placeholder="código de acesso"
                                onChange={(e) => setCode(e.target.value)}
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

export default KidAccess;