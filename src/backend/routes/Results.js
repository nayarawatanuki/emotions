const { apiRoutes } = require('../../routes');
const express = require('express');
const routes = express.Router();

const ResultController = require('../controllers/ResultController');

//FUNCTIONS
routes.get(apiRoutes.kidActivityResults,  ResultController.list);

routes.post(apiRoutes.activityResults, ResultController.create)

routes.put(apiRoutes.result, ResultController.update);

routes.delete(apiRoutes.result, ResultController.delete);

module.exports = routes;