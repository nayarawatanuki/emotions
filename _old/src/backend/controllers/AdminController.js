const Admin = require('../models/Admin');

module.exports = {

    async list(req, res) {
        const kids = await Admin.findAll();

        return res.json(kids);
    },

    async login(req, res) {

        const {
            user,
            password,
        } = req.body;

        const admin = await Admin.findOne({
            where: {
                user: user,
                password: password
            }
        });
        if (admin === null) {
            console.log('Not found!');
        } else {
            console.log(admin.id);
        }

        return res.json(admin.id);
    },

    async create(req, res) {

        const { name, user, password } = req.body;
        //console.log("test ", req.body)


        const admin = Admin.create(
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

        console.log('controller update admin', req.params, req.body)
        try {
            const admin = await Admin.update({
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

            return res.json(admin);

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
            const admin = Admin.findByPk(id);
            if (!admin) {
                res.json({
                    error: true
                });
            } else {
                (await admin).destroy;
            }
        } catch {
            console.log(error.message);
            res.json({
                error: true
            });
        }
    }
}