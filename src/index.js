import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Switch, Route, useLocation } from 'react-router-dom';
import App from './App';
import { pageRoutes } from './routes';

import NotFound from './frontend/pages/NotFound';

import Administration from './frontend/pages/Administration';
import AddAdministrator from './frontend/pages/Administration/AddAdministrator';

import KidAccess from "./frontend/pages/KidAccess/Login/index";
import KidActivities from "./frontend/pages/KidAccess/Activities/index";
import PlayActivity from "./frontend/pages/KidAccess/PlayActivity/index";

import ProfessionalAccess from "./frontend/pages/ProfessionalAccess/Login/index";
import Kids from "./frontend/pages/ProfessionalAccess/Kids/index";
import Activities from "./frontend/pages/ProfessionalAccess/Activities/index";
import AddKid  from "./frontend/pages/ProfessionalAccess/AddKid/index";
import AddActivity  from "./frontend/pages/ProfessionalAccess/AddActivity/index";

import KidProvider  from "./frontend/context/kidContext";
import ActivityProvider  from "./frontend/context/activityContext";

const pageTitles = {
  [pageRoutes.home]: 'Início',
  [pageRoutes.administration]: 'Administração',
  [pageRoutes.addAdministrator]: 'Adicionar administrador',
  [pageRoutes.kidLogin]: 'Acesso da criança',
  [pageRoutes.professionalLogin]: 'Acesso profissional',
  [pageRoutes.kidActivities]: 'Minhas atividades',
  [pageRoutes.playActivity]: 'Responder atividade',
  [pageRoutes.kids]: 'Crianças',
  [pageRoutes.activities]: 'Atividades',
  [pageRoutes.addKid]: 'Adicionar criança',
  [pageRoutes.addActivity]: 'Adicionar atividade',
};

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = pathname.replace(/\/$/, '').toLowerCase() || '/';
    document.title = `${pageTitles[route] || 'Página não encontrada'} — Emotions`;
  }, [pathname]);

  return null;
}

const root = createRoot(document.getElementById('root'));

root.render(
  <KidProvider>
    <ActivityProvider>
      <BrowserRouter>
        <PageTitle />
        <Switch>
          <Route path={pageRoutes.home} exact={true} component={App} />

          <Route path={pageRoutes.administration} exact={true} component={Administration} />
          <Route path={pageRoutes.addAdministrator} exact={true} component={AddAdministrator} />
          
          <Route path={pageRoutes.kidLogin} exact={true} component={KidAccess} />
          <Route path={pageRoutes.kidActivities} exact={true} component={KidActivities} />
          <Route path={pageRoutes.playActivity} exact={true} component={PlayActivity} />

          <Route path={pageRoutes.professionalLogin} exact={true} component={ProfessionalAccess} />
          <Route path={pageRoutes.kids} exact={true} component={Kids} />
          <Route path={pageRoutes.activities} exact={true} component={Activities} />
          <Route path={pageRoutes.addKid} exact={true} component={AddKid} />
          
          <Route path={pageRoutes.addActivity} exact={true} component={AddActivity} />
          <Route component={NotFound} />
        </Switch>
      </BrowserRouter>
    </ActivityProvider>
  </KidProvider>
);