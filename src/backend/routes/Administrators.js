const { apiRoutes } = require('../../routes');
const express = require('express');
const routes = express.Router();

const Administrator = require('../controllers/AdministratorController');

//FUNCTIONS
routes.get(apiRoutes.administrators, Administrator.list);

routes.post(apiRoutes.professionalLogin, Administrator.login);

routes.post(apiRoutes.administrators, Administrator.create);

routes.put(apiRoutes.administrator, Administrator.update);

routes.delete(apiRoutes.administrator, Administrator.delete);

module.exports = routes;