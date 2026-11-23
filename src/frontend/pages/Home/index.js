import React from "react";
import PageHeader from '../../components/PageHeader';

import { Container, Content, EmotionPieces, AccessLink } from './styles';

function Home() {
    return (
        <div>
            <PageHeader>
                <span className="navbar-brand">ACESSOS</span>
            </PageHeader>
        
            <Container>
                <Content>
                    <EmotionPieces aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </EmotionPieces>
                    <h1>Bem-vindo(a)!</h1>
                    <AccessLink to="/KidAcess">Acesso Criança</AccessLink>
                    <AccessLink to="/PsycAcess">Acesso Psicólogo(a)</AccessLink>
                </Content>
            </Container>
        </div>
    )
}

export default Home;