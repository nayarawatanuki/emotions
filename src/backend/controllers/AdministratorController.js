const Administrator = require('../models/Administrator');

module.exports = {

    async list(req, res) {
        const administrators = await Administrator.findAll();

        return res.json(administrators);
    },

    async login(req, res) {

        const {
            user,
            password,
        } = req.body;

        const administrator = await Administrator.findOne({
            where: {
                user: user,
                password: password
            }
        });
        if (administrator === null) {
            console.log('Not found!');
        } else {
            console.log(administrator.id);
        }

        return res.json(administrator.id);
    },

    async create(req, res) {

        const { name, user, password } = req.body;
        //console.log("test ", req.body)


        const administrator = Administrator.create(
            { name, user, password }
        ).then((response) => {
            return res.json(response);
            
        }).catch(() => {
            console.log(err);
                return res.status(400).json({
                err: true,
                message: "erro"
            }) 
        });
    },

    async update(req, res) {

        const {
            id
        } = req.params;
        const {
            name,
            user,
            password
        } = req.body;

        console.log('controller update administrator', req.params, req.body)
        try {
            const administrator = await Administrator.update({
                    name,
                    user,
                    password
                },

                {
                    where: {
                        id: id
                    }
                }
            )

            return res.json(administrator);

        } catch (error) {
            console.log(error.message);
            res.json({
                error: true
            });
        }
    },

    async delete(req, res) {
        const {
            id
        } = req.params;
        try {
            const administrator = Administrator.findByPk(id);
            if (!administrator) {
                res.json({
                    error: true
                });
            } else {
                (await administrator).destroy;
            }
        } catch {
            console.log(error.message);
            res.json({
                error: true
            });
        }
    }
}