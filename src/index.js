import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import App from './App';

import Home from './frontend/pages/Home/index';

import Admin from './frontend/pages/Admin/index';
import addAdmin from './frontend/pages/Admin/addAdmin';
//import listAdmin from './frontend/pages/Admin/'

import KidAcess from './frontend/pages/KidAcess/Login/index';
import Tasks from './frontend/pages/KidAcess/Tasks/index';
import Task3 from './frontend/pages/KidAcess/Task3/index';

//Pages PsycAcess
import PsycAcess from './frontend/pages/PsycAcess/Login/index';
import Kids from './frontend/pages/PsycAcess/Kids/index';
import Activities from './frontend/pages/PsycAcess/Activities/index';
import addKid  from './frontend/pages/PsycAcess/addKid/index';
//import addActivity  from './frontend/pages/PsycAcess/addActivity/index';
import addTask3  from './frontend/pages/PsycAcess/addTask3/index';

import KidProvider  from './frontend/context/kidContext';
import TaskProvider  from './frontend/context/taskContext';

const root = createRoot(document.getElementById('root'));

root.render(
  <KidProvider>
    <TaskProvider>
      <BrowserRouter>
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
        </Switch>
      </BrowserRouter>
    </TaskProvider>
  </KidProvider>
);