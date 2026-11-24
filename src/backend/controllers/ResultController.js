const Activity = require("../models/Activity");
const Result = require('../models/Result');

module.exports = {

    async list(req, res) {
        const { kid_id: kidId } = req.params;
        const results = await Result.findAll({
            include: {
                association: 'activities',
                attributes: [],
                where: { kid_id: kidId }
            }
        });
        return res.json(results);
    },

    async create(req, res) {
        const { activity_id: activityId } = req.params;
        const { response, tries, time } = req.body;
        if (typeof response !== 'string' || !Number.isInteger(tries) ||
            tries < 1 || !Number.isInteger(time) || time < 0) {
            return res.status(400).json({ error: 'Invalid activity result' });
        }

        try {
            const outcome = await Activity.sequelize.transaction(async (transaction) => {
                const activity = await Activity.findByPk(activityId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!activity) return { status: 404, error: 'Activity not found' };
                if (activity.status === 'realizada') {
                    return { status: 409, error: 'Activity already completed' };
                }
                if (![activity.response1, activity.response2, activity.response3].includes(response)) {
                    return { status: 400, error: 'Invalid activity response' };
                }

                const result = await Result.create(
                    { activity_id: activityId, response, tries, time }, { transaction }
                );
                await activity.update({ status: 'realizada' }, { transaction });
                return { status: 201, result };
            });
            return res.status(outcome.status).json(outcome.result || { error: outcome.error });
        } catch {
            return res.status(500).json({ error: 'Could not save activity result' });
        }
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