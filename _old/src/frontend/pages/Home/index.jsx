import React from "react";
import { Link } from 'react-router-dom';

import '../../global/styles/buttons/style.css';
import GlobalStyle from '../../global/styles';
import { App, Container, Content } from './styles';

function Home() {
    return (
        <App>
            <nav className="navbar navbar-light bg-light">
                <h4 className="navbar float-center">ACESSOS</h4>
            </nav>
        
            <Container>
                <Content>
                    <form> 
                        <h1>Bem-Vindo(a)!</h1>
                    
                        <Link to="/KidAcess">
                            <button type="submit" className="button button-info btn-lg btn-block float-center">Acesso Criança</button>
                        </Link>

                        <Link to="/PsycAcess">
                            <button type="submit" className="button button-info btn-lg btn-block float-center">Acesso Psicólogo(a)</button>
                        </Link>
                    </form>
                </Content>
                <GlobalStyle />
            </Container>
        </App>                
    )
}

export default Home;