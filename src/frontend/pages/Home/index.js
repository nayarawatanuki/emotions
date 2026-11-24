import { pageRoutes } from '../../../routes';
import PageHeader from '../../components/PageHeader';
import { ActionButton } from '../../components/ActionButton';
import React from "react";

import '../../global/styles/buttons/style.css';
import GlobalStyle from '../../global/styles';
import { App, Container, Content } from './styles';

function Home() {
    return (
        <App>
            <PageHeader title="Acessos" />
        
            <Container>
                <Content>
                    <main>
                        <h1>Bem-Vindo(a)!</h1>
                    
                        <ActionButton to={pageRoutes.kidLogin} className="btn-lg btn-block float-center">
                            Acesso da criança
                        </ActionButton>

                        <ActionButton to={pageRoutes.professionalLogin} className="btn-lg btn-block float-center">
                            Acesso profissional
                        </ActionButton>
                    </main>
                </Content>
                <GlobalStyle />
            </Container>
        </App>                
    )
}

export default Home;