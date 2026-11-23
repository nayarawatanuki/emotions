const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require('../connection/AWS/taskImage/multer');

const TaskController = require('../controllers/TaskController');
const Task = require('../models/Task');
const Kid = require('../models/Kid');

//FUNCTIONS
routes.get('/kids/:kid_id/listTasks', TaskController.list);

routes.post('/kids/:kid_id/createdTask', multer(multerConfig).single("image"), async (req, res) => {

    const { key, location } = req.file || {};
    const image = location || (key && `/taskImage/${encodeURIComponent(key)}`);
    if (!image) return res.status(400).json({ error: 'Image required' });
    const { name, emotion, response1, response2, response3, status, image_description } = req.body;
    const { kid_id } = req.params;
    
    try {
        if (!await Kid.findByPk(kid_id)) return res.status(404).json({ error: 'Kid not found' });
        const task = await Task.create({
            kid_id, name, emotion, response1, response2, response3, image, status,
            image_description: image_description?.trim() || null,
        });
        return res.json(task);
    } catch {
        return res.status(400).json({ error: 'Could not save activity' });
    }
})

routes.put('/updatedTask/:id', TaskController.update);

routes.delete('/deletedTask/:id', TaskController.delete);

module.exports = routes;
