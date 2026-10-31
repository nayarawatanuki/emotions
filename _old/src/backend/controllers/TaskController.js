const Kid = require('../models/Kid');
const Task = require('../models/Task');

module.exports = {

    async list(req, res) {
        const { kid_id } = req.params;

        const kid = await Kid.findByPk(kid_id, {
            include: { association: 'tasks'}
        });

        return res.json(kid.tasks);
    },

    async taskListOne(req, res) {

        const {task_id} = req.params;

        const task = await Task.findOne({ where: { id: task_id } });
        if (task === null) {
            console.log('Not found!');
        } else {
            //console.log(kid instanceof Kid); // true
            console.log(task); // 'My Title'
        }

        return res.json(task);
    },
    
    async update(req, res) {

        const {
            task_id
        } = req.params;
        const {
            name, emotion, response1, response2, response3, status
        } = req.body;

        console.log('controller update kid', req.params, req.body)
        try {
            const task = await Task.update({
                name, emotion, response1, response2, response3, status
            },

                {
                    where: {
                        id: task_id
                    }
                }
            )

            return res.json(task);

        } catch (error) {
            console.log(error.message);
            res.json({
                error: true
            });
        }
    },

    async delete(req, res) {
        const { id } = req.params;

        console.log('controller delete task', req.params)
        try {
            const task = await Task.destroy({ 
                where: {
                    id: id
                } 
            });
            return res.json(task);
        }catch(error){
            console.log(error);
                res.json({error: true});
        }
    }
}