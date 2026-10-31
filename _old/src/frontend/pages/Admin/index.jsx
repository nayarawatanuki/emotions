import React from "react";
import { Link } from 'react-router-dom';

import GlobalStyle from '../../global/styles';
import { App, Container, Content } from './styles';

function Admin() {
    return (
        <App>
            <nav className="navbar navbar-light bg-light">
                <h4 className="navbar float-center">ACESSOS</h4>
            </nav>
        
            <Container>
                <Content>
                    <form> 
                        <h1>Admin</h1>
                    
                        <Link to="/addAdmin">
                            <button type="submit" className="button button-info btn-lg btn-block float-center">Adicionar Administrador(a)</button>
                        </Link>

                        <Link to="/adminEdit">
                            <button type="submit" className="button button-info btn-lg btn-block float-center">Editar Administrador(a)</button>
                        </Link>
                    </form>
                </Content>
                <GlobalStyle />
            </Container>
        </App>                
    )
}

export default Admin;