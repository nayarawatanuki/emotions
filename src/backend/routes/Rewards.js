const { apiRoutes } = require('../../routes');
const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require("../connection/AWS/activityImage/multer");

const RewardController = require('../controllers/RewardController');
const Activity = require("../models/Activity");
const Reward = require('../models/Reward');

//FUNCTIONS
routes.get(apiRoutes.activityRewards,  RewardController.list);

routes.post(apiRoutes.activityRewards, multer(multerConfig).single("photo"), async (req, res) => {

    const { key, location } = req.file || {};
    const photo = location || (key && `/activityImage/${encodeURIComponent(key)}`);
    if (!photo) return res.status(400).json({ error: 'Image required' });
    const { activity_id: activityId } = req.params;
    const { message } = req.body;

    try {
        if (!await Activity.findByPk(activityId)) return res.status(404).json({ error: 'Activity not found' });
        return res.json(await Reward.create({ activity_id: activityId, photo, message }));
    } catch {
        return res.status(400).json({ error: 'Could not save reward' });
    }
})

routes.put(apiRoutes.reward, RewardController.update);

routes.delete(apiRoutes.reward, RewardController.delete);

module.exports = routes;
