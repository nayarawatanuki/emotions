const Kid = require("../models/Kid");
const Activity = require("../models/Activity");
const Reward = require('../models/Reward');
const Result = require('../models/Result');

module.exports = {

    async list(req, res) {

        const {activity_id: activityId} = req.params;

        const reward = await Reward.findAll({ where: {activity_id: activityId} });
        

        return res.json(reward);
    },

    async create(req, res) {

        const { response, tries, time, activity_id: activityId } = req.body;
    
        const activity = Activity.findByPk(activityId);
        if(!activity) {
            return res.status(400).json({ error: 'Activity not found'});
        }

        const result = Result.create(
            { activity_id: activityId, response, tries, time }
        ).then((response) => {
            return res.json(response);
            
        }).catch((err) => {
            console.log(err);
                return res.status(400).json({
                err: true,
                message: "erro"
            }) 
        });
    },
    
    async update(req, res) {
        const { id } = req.params;
        const { type } = req.body;

        console.log('controller update activity', req.params, req.body);
        try {
            const activity = await Activity.update(
                { type },
                {where: {
                    id: id
                }}
            );
            return res.json(activity);
        }catch(error){
            console.log(error);
                res.json({error: true});
        }
    },

    async delete(req, res) {
        const { id } = req.params;

        console.log('controller delete activity', req.params)
        try {
            const result = await Result.destroy({ 
                where: {
                    id: id
                } 
            });
            return res.json(result);
        }catch(error){
            console.log(error);
                res.json({error: true});
        }
    }
}