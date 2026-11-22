import React from "react";
import { Link } from 'react-router-dom';

import '../../global/styles/buttons/style.css';
import GlobalStyle from '../../global/styles';
import { App, Container, Content } from './styles';

function Home() {
    return (
        <App>
            <header className="navbar navbar-light bg-light">
                <span className="navbar" style={{ fontSize: "1.5rem" }}>ACESSOS</span>
            </header>
        
            <Container>
                <Content>
                    <main>
                        <h1>Bem-Vindo(a)!</h1>
                    
                        <Link to="/KidAcess" className="button button-info btn-lg btn-block float-center">
                            Acesso Criança
                        </Link>

                        <Link to="/PsycAcess" className="button button-info btn-lg btn-block float-center">
                            Acesso Psicólogo(a)
                        </Link>
                    </main>
                </Content>
                <GlobalStyle />
            </Container>
        </App>                
    )
}

export default Home;