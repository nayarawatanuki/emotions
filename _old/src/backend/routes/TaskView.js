const express = require('express');
const routes = express.Router();

const TaskController = require('../controllers/TaskController');

//FUNCTIONS
routes.get('/:kid_name/tasks/taskListOne/:task_id', TaskController.taskListOne);
routes.get('/tasks/:kid_id/:kid_name/listTasks', TaskController.list);
routes.put('/tasks/:task_id/updatedTask', TaskController.update);

module.exports = routes;