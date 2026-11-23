const express = require('express');
const { authenticated, ownTask, ownChild, professional } = require('../auth/session');
const routes = express.Router();

const TaskController = require('../controllers/TaskController');

//FUNCTIONS
routes.get('/:kid_name/tasks/taskListOne/:task_id', authenticated, ownTask, TaskController.taskListOne);
routes.get('/tasks/:kid_id/:kid_name/listTasks', authenticated, ownChild, TaskController.list);
routes.put('/tasks/:task_id/updatedTask', authenticated, professional, TaskController.update);

module.exports = routes;