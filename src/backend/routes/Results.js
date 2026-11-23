const express = require('express');
const { authenticated, ownChild, ownTask, professional } = require('../auth/session');
const routes = express.Router();

const ResultController = require('../controllers/ResultController');

//FUNCTIONS
routes.get('/tasks/:kid_id/listTaskResult', authenticated, ownChild, ResultController.list);

routes.post('/tasks/:task_id/createdTaskResult', authenticated, ownTask, ResultController.create)

routes.put('/updatedTaskResult/:id', authenticated, professional, ResultController.update);

routes.delete('/deletedTaskResult/:id', authenticated, professional, ResultController.delete);

module.exports = routes;