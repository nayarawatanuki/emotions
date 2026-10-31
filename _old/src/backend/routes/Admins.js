const express = require('express');
const routes = express.Router();

const Admin = require('../controllers/AdminController');

//FUNCTIONS
routes.get('/adminList', Admin.list);

routes.post('/adminLogin', Admin.login);

routes.post('/adminCreated', Admin.create);

routes.put('/adminUpdate/:id', Admin.update);

routes.delete('/adminDelete/:id', Admin.delete);

module.exports = routes;