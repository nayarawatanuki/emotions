const { apiRoutes } = require('../../routes');
const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require("../connection/AWS/activityImage/multer");

const ActivityController = require("../controllers/ActivityController");
const Activity = require("../models/Activity");
const Kid = require("../models/Kid");

//FUNCTIONS
routes.get(apiRoutes.kidActivities, ActivityController.list);
routes.get(apiRoutes.activity, ActivityController.getActivity);

routes.post(apiRoutes.kidActivities, multer(multerConfig).single("image"), async (req, res) => {

    const { key, location } = req.file || {};
    const image = location || (key && `/activityImage/${encodeURIComponent(key)}`);
    if (!image) return res.status(400).json({ error: 'Image required' });
    const { name, emotion, response1, response2, response3, status, image_description } = req.body;
    const { kid_id: kidId } = req.params;

    try {
        if (!await Kid.findByPk(kidId)) return res.status(404).json({ error: 'Kid not found' });
        const activity = await Activity.create({
            kid_id: kidId, name, emotion, response1, response2, response3, image, status,
            image_description: image_description?.trim() || null,
        });
        return res.json(activity);
    } catch {
        return res.status(400).json({ error: 'Could not save activity' });
    }
})

routes.put(apiRoutes.activity, ActivityController.update);

routes.delete(apiRoutes.activity, ActivityController.delete);

module.exports = routes;
