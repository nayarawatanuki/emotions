const Kid = require("../models/Kid");
const Activity = require("../models/Activity");

module.exports = {

    async list(req, res) {
        const { kid_id: kidId } = req.params;

        const kid = await Kid.findByPk(kidId, {
            include: { association: 'activities'}
        });

        if (!kid) return res.sendStatus(404);
        return res.json(kid.activities);
    },

    async getActivity(req, res) {

        const {activity_id: activityId} = req.params;

        const activity = await Activity.findOne({ where: { id: activityId } });
        if (activity === null) {
            console.log('Not found!');
        } else {
            //console.log(kid instanceof Kid); // true
            console.log(activity); // 'My Title'
        }

        return res.json(activity);
    },
    
    async update(req, res) {

        const {
            activity_id: activityId
        } = req.params;
        const {
            name, emotion, response1, response2, response3, status
        } = req.body;

        console.log('controller update kid', req.params, req.body)
        try {
            const activity = await Activity.update({
                name, emotion, response1, response2, response3, status
            },

                {
                    where: {
                        id: activityId
                    }
                }
            )

            return res.json(activity);

        } catch (error) {
            console.log(error.message);
            res.json({
                error: true
            });
        }
    },

    async delete(req, res) {
        const { activity_id: id } = req.params;

        console.log('controller delete activity', req.params)
        try {
            const activity = await Activity.destroy({
                where: {
                    id: id
                } 
            });
            return res.json(activity);
        }catch(error){
            console.log(error);
                res.json({error: true});
        }
    }
}