import FormField from '../../../components/FormField';
import React, { useState } from "react";
import PageHeader from '../../../components/PageHeader';
import api from '../../../services/api';

import { App, Container, Content } from './styles';

import { Link, useHistory } from 'react-router-dom';
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

                        <FormField label="Código de acesso">
                            <input type="password" inputMode="numeric"
                                id="code"
                                name="code"
                                required
                                className="form-control"
                                placeholder="código de acesso"
                                onChange={(e) => setCode(e.target.value)}
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

export default KidAcess;