const Admin = require('../models/Admin');
const { startSession } = require('../auth/session');
const { hashPassword, verifyPassword, usablePassword } = require('../auth/password');

module.exports = {

    async list(req, res, next) {
        try {
            const admins = await Admin.findAll({ attributes: ['id', 'name', 'user'] });
            return res.json(admins);
        } catch (error) {
            return next(error);
        }
    },

    async login(req, res, next) {
        const { user, password } = req.body || {};
        if (typeof user !== 'string' || !usablePassword(password)) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }

        try {
            const admin = await Admin.findOne({ where: { user } });
            if (!admin || !await verifyPassword(password, admin.password)) {
                return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
            }
            return startSession(req, res, 'professional', admin.id);
        } catch (error) {
            return next(error);
        }
    },

    async create(req, res) {
        const { name, user, password } = req.body || {};
        if (!usablePassword(password) || Array.from(password).length < 15) {
            return res.status(400).json({ error: 'Use uma senha com pelo menos 15 caracteres.' });
        }

        try {
            const admin = await Admin.create({ name, user, password: await hashPassword(password) });
            return res.json({ id: admin.id, name: admin.name, user: admin.user });
        } catch {
            return res.status(400).json({ error: 'Não foi possível cadastrar o profissional.' });
        }
    },

    async update(req, res) {
        const { name, user, password } = req.body || {};
        const changes = { name, user };
        if (password !== undefined) {
            if (!usablePassword(password) || Array.from(password).length < 15) {
                return res.status(400).json({ error: 'Use uma senha com pelo menos 15 caracteres.' });
            }
        }

        try {
            if (password !== undefined) changes.password = await hashPassword(password);
            return res.json(await Admin.update(changes, { where: { id: req.params.id } }));
        } catch {
            return res.status(400).json({ error: 'Não foi possível atualizar o profissional.' });
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