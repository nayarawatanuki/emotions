import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import App from './App';
import GlobalStyle from './frontend/global/styles';
import PageHeader from './frontend/components/PageHeader';
import { Card, Container } from './frontend/global/styles/card';

import Home from './frontend/pages/Home/index';

import Admin from './frontend/pages/Admin/index';
import addAdmin from './frontend/pages/Admin/addAdmin';

import KidAcess from './frontend/pages/KidAcess/Login/index';
import Tasks from './frontend/pages/KidAcess/Tasks/index';
import Task3 from './frontend/pages/KidAcess/Task3/index';

import PsycAcess from './frontend/pages/PsycAcess/Login/index';
import Kids from './frontend/pages/PsycAcess/Kids/index';
import Activities from './frontend/pages/PsycAcess/Activities/index';
import addKid  from './frontend/pages/PsycAcess/addKid/index';
import addTask3  from './frontend/pages/PsycAcess/addTask3/index';

import KidProvider  from './frontend/context/kidContext';
import TaskProvider  from './frontend/context/taskContext';

const root = createRoot(document.getElementById('root'));

root.render(
  <KidProvider>
    <TaskProvider>
      <BrowserRouter>
        <GlobalStyle />
        <a className="legacy-skip-link" href="#legacy-content" onClick={(event) => {
          event.preventDefault();
          const content = document.getElementById('legacy-content');
          content.focus();
          content.scrollIntoView();
        }}>Ir para o conteúdo</a>
        <div id="legacy-content" tabIndex={-1}>
          <Switch>
            <Route path="/" exact={true} component={App} />
            <Route path="/Home" exact={true} component={Home} />

            <Route path="/Admin" exact={true} component={Admin} />
            <Route path="/addAdmin" exact={true} component={addAdmin} />

            <Route path="/KidAcess" exact={true} component={KidAcess} />
            <Route path="/Tasks" exact={true} component={Tasks} />
            <Route path="/Task3" exact={true} component={Task3} />

            <Route path="/PsycAcess" exact={true} component={PsycAcess} />
            <Route path="/Kids" exact={true} component={Kids} />
            <Route path="/Activities" exact={true} component={Activities} />
            <Route path="/addKid" exact={true} component={addKid} />

            <Route path="/addTask3" exact={true} component={addTask3} />
            <Route>
              <PageHeader><h1>Página não encontrada</h1></PageHeader>
              <Container><Card><a className="btn" href="/">Voltar para o início</a></Card></Container>
            </Route>
          </Switch>
        </div>
      </BrowserRouter>
    </TaskProvider>
  </KidProvider>
);
