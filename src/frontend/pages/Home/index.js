import React from "react";

import GlobalStyle from '../../global/styles';
import spectrumRibbon from './spectrum-ribbon.png';
import { Container, Content, NavBrand, SpectrumRibbon, EmotionPieces, AccessLink } from './styles';

function Home() {
    return (
        <div>
            <header className="navbar navbar-light bg-light">
                <NavBrand>
                    <SpectrumRibbon src={spectrumRibbon} alt="" />
                    <span className="navbar" style={{ fontSize: "1.5rem" }}>ACESSOS</span>
                </NavBrand>
            </header>
        
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
                <GlobalStyle />
            </Container>
        </div>
    )
}

export default Home;