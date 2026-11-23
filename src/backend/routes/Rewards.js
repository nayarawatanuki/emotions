const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require('../connection/AWS/taskImage/multer');

const RewardController = require('../controllers/RewardController');
const Task = require('../models/Task');
const Reward = require('../models/Reward');

//FUNCTIONS
routes.get('/tasks/:task_id/listRewards',  RewardController.list);

routes.post('/tasks/:task_id/createdReward', multer(multerConfig).single("photo"), async (req, res) => {

    const { key, location } = req.file || {};
    const photo = location || (key && `/taskImage/${encodeURIComponent(key)}`);
    if (!photo) return res.status(400).json({ error: 'Image required' });
    const { task_id } = req.params;
    const { message } = req.body;

    try {
        if (!await Task.findByPk(task_id)) return res.status(404).json({ error: 'Task not found' });
        return res.json(await Reward.create({ task_id, photo, message }));
    } catch {
        return res.status(400).json({ error: 'Could not save reward' });
    }
})

routes.put('/updatedTaskReward/:id', RewardController.update);

routes.delete('/deletedTaskReward/:id', RewardController.delete);

module.exports = routes;
