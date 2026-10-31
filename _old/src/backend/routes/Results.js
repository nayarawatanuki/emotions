const express = require('express');
const routes = express.Router();

const ResultController = require('../controllers/ResultController');

//FUNCTIONS
routes.get('/tasks/:kid_id/listTaskResult',  ResultController.list);

routes.post('/tasks/:task_id/createdTaskResult', ResultController.create)

routes.put('/updatedTaskResult/:id', ResultController.update);

routes.delete('/deletedTaskResult/:id', ResultController.delete);

module.exports = routes;