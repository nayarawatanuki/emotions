const express = require('express');
const { authenticated, professional, ownChild, limitLogin } = require('../auth/session');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require('../connection/AWS/kidPhoto/multer');

const Kids = require('../controllers/KidController');
const Kid = require('../models/Kid');
const { hashPassword } = require('../auth/password');

//FUNCTIONS
routes.get('/listKids', authenticated, professional, Kids.list);

routes.get('/:kid_id/listKid', authenticated, ownChild, Kids.listOne);

routes.post('/login', limitLogin, Kids.login);

routes.post('/createdKid', authenticated, professional, multer(multerConfig).single('photo'), async (req, res, next) => {
    const { treatment, name, user, code, rate, birth, parent, note } = req.body;
    if (typeof code !== 'string' || !/^\d{1,10}$/.test(code)) {
        return res.status(400).json({ error: 'Código de acesso inválido.' });
    }

    const { key, location } = req.file || {};
    const photo = location || (key ? '/kidPhoto/' + encodeURIComponent(key) : null);
    try {
        const kid = await Kid.create({
            treatment, name, user, code: await hashPassword(code), rate, birth, parent, note, key, photo
        });
        const response = kid.toJSON();
        delete response.code;
        return res.json(response);
    } catch (error) {
        return next(error);
    }
});

routes.put('/updatedKid/:id', authenticated, professional, Kids.update);

routes.delete('/deletedKid/:id', authenticated, professional, Kids.delete);

module.exports = routes;