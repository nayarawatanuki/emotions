const express = require('express');
const { limitLogin, authenticated, professional } = require('../auth/session');
const routes = express.Router();

const Admin = require('../controllers/AdminController');

//FUNCTIONS
routes.get('/adminList', authenticated, professional, Admin.list);

routes.post('/adminLogin', limitLogin, Admin.login);

routes.post('/adminCreated', authenticated, professional, Admin.create);

routes.put('/adminUpdate/:id', authenticated, professional, Admin.update);

routes.delete('/adminDelete/:id', authenticated, professional, Admin.delete);

module.exports = routes;