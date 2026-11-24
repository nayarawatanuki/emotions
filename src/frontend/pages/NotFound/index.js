import { pageRoutes } from '../../../routes';
import PageHeader from '../../components/PageHeader';
import { ActionButton } from '../../components/ActionButton';
import React from 'react';

import GlobalStyle from '../../global/styles';
import { Container, Content } from '../Home/styles';

export default function NotFound() {
    return (
        <>
            <GlobalStyle />
            <PageHeader title="Emotions" />
            <Container as="main" className="tcc-not-found">
                <Content>
                    <h1>Página não encontrada</h1>
                    <p>Volte ao início para escolher um acesso.</p>
                    <ActionButton to={pageRoutes.home} className="tcc-button-link">
                        Voltar para o início
                    </ActionButton>
                </Content>
            </Container>
        </>
    );
}
