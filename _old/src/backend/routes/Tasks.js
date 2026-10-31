const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require('../connection/AWS/taskImage/multer');

const TaskController = require('../controllers/TaskController');
const Task = require('../models/Task');
const Kid = require('../models/Kid');

//FUNCTIONS
routes.get('/kids/:kid_id/listTasks', TaskController.list);

routes.post('/kids/:kid_id/createdTask', multer(multerConfig).single("image"), (req, res) => {

    const { location: image = " "} = req.file;
    const { name, emotion, response1, response2, response3, status, kid_id} = req.body;
    
    const kid = Kid.findByPk(kid_id);
        if(!kid) {
            return res.status(400).json({ error: 'Kid not found'});
        }

    const task = Task.create(
        { kid_id, name, emotion, response1, response2, response3, image, status }
    ).then((response) => {
        console.log('id', response.id);
        return res.json(response);
    }).catch(() => {
        console.log(err);
            return res.status(400).json({
            err: true,
            message: "erro"
        }) 
    });
})

routes.put('/updatedTask/:id', TaskController.update);

routes.delete('/deletedTask/:id', TaskController.delete);

module.exports = routes;