import { pageRoutes } from '../../../routes';
import PageHeader from '../../components/PageHeader';
import { ActionButton } from '../../components/ActionButton';
import React from "react";

import GlobalStyle from '../../global/styles';
import { App, Container, Content } from './styles';

function Administration() {
    return (
        <App>
            <PageHeader title="Acessos" />

            <Container>
                <Content>
                    <form>
                        <h1>Administração</h1>

                        <ActionButton to={pageRoutes.addAdministrator} className="btn-lg btn-block float-center">
                            Adicionar administrador
                        </ActionButton>

                        <ActionButton type="button" disabled className="btn-lg btn-block float-center">
                            Editar administrador
                        </ActionButton>
                    </form>
                </Content>
                <GlobalStyle />
            </Container>
        </App>
    )
}

export default Administration;