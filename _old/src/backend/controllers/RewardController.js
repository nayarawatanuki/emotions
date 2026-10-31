const Kid = require('../models/Kid');
const Task = require('../models/Task');
const Reward = require('../models/Reward');
const Result = require('../models/Result');

module.exports = {

    async list(req, res) {

        const {task_id} = req.params;

        const reward = await Reward.findAll({ where: {task_id: task_id} });
        

        return res.json(reward);
    },

    async create(req, res) {

        const { response, tries, time, task_id } = req.body;
    
        const task = Task.findByPk(task_id);
        if(!task) {
            return res.status(400).json({ error: 'Task not found'});
        }

        const result = Result.create(
            { task_id, response, tries, time }
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

        console.log('controller update task', req.params, req.body);
        try {
            const task = await Task.update(
                { type },
                {where: {
                    id: id
                }}
            );
            return res.json(task);
        }catch(error){
            console.log(error);
                res.json({error: true});
        }
    },

    async delete(req, res) {
        const { id } = req.params;

        console.log('controller delete task', req.params)
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