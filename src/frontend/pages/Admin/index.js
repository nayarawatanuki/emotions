import React from "react";
import PageHeader from '../../components/PageHeader';
import { Link } from 'react-router-dom';

import { App, Container, Content } from './styles';

function Admin() {
    return (
        <App>
            <PageHeader>
                <Link className="navbar-brand" to="/">Início</Link>
            </PageHeader>
        
            <Container>
                <Content>
                    <h1>Administração</h1>
                    <Link to="/addAdmin" className="button button-info btn-lg btn-block float-center">
                        Adicionar administrador(a)
                    </Link>
                </Content>
            </Container>
        </App>                
    )
}

export default Admin;