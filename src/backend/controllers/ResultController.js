const Task = require('../models/Task');
const Result = require('../models/Result');

module.exports = {

    async list(req, res) {
        const { kid_id } = req.params;
        const results = await Result.findAll({
            include: {
                association: 'tasks',
                attributes: [],
                where: { kid_id }
            }
        });
        return res.json(results);
    },

    async create(req, res) {
        const { task_id } = req.params;
        const { response, tries, time } = req.body;
        if (typeof response !== 'string' || !Number.isInteger(tries) ||
            tries < 1 || !Number.isInteger(time) || time < 0) {
            return res.status(400).json({ error: 'Invalid activity result' });
        }

        try {
            const outcome = await Task.sequelize.transaction(async (transaction) => {
                const task = await Task.findByPk(task_id, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!task) return { status: 404, error: 'Task not found' };
                if (task.status === 'realizada') {
                    return { status: 409, error: 'Task already completed' };
                }
                if (![task.response1, task.response2, task.response3].includes(response)) {
                    return { status: 400, error: 'Invalid activity response' };
                }

                const result = await Result.create(
                    { task_id, response, tries, time }, { transaction }
                );
                await task.update({ status: 'realizada' }, { transaction });
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