const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require('../connection/AWS/taskImage/multer');

const RewardController = require('../controllers/RewardController');
const Task = require('../models/Task');
const Reward = require('../models/Reward');

//FUNCTIONS
routes.get('/tasks/:task_id/listRewards',  RewardController.list);

routes.post('/tasks/:task_id/createdReward', multer(multerConfig).single("photo"), (req, res) => {

    const { location: photo = " "} = req.file;
    const { message, task_id } = req.body;
    
    const task = Task.findByPk(task_id);
        if(!task) {
            return res.status(400).json({ error: 'Task not found'});
        }

    const reward = Reward.create(
        { task_id, photo, message }
    ).then((response) => {
        return res.json(response);
        
    }).catch(() => {
        console.log(err);
            return res.status(400).json({
            err: true,
            message: "erro"
        }) 
    });
})

routes.put('/updatedTaskReward/:id', RewardController.update);

routes.delete('/deletedTaskReward/:id', RewardController.delete);

module.exports = routes;