const Kid = require('../models/Kid');
const { startSession } = require('../auth/session');
const { hashPassword, verifyPassword } = require('../auth/password');
const fs = require("fs");
const path = require("path");


const AWS = require('aws-sdk');



const s3 = new AWS.S3();

module.exports = {

    async list(req, res) {
        const kids = await Kid.findAll({ attributes: { exclude: ['code'] } });

        return res.json(kids);
    },

    async listOne(req, res) {

        const {kid_id} = req.params;

        const kid = await Kid.findOne({
            where: {id: kid_id},
            attributes: req.legacySession.role === 'child' ? ['id', 'name', 'photo'] : { exclude: ['code'] }
        });
        return res.json(kid);
    },

    async login(req, res, next) {
        const { user, code } = req.body || {};
        if (typeof user !== 'string' || typeof code !== 'string' || !/^\d{1,10}$/.test(code)) {
            return res.status(401).json({ error: 'Usuário ou código inválidos.' });
        }

        try {
            const kid = await Kid.findOne({ where: { user }, attributes: ['id', 'code'] });
            if (!kid || !await verifyPassword(code, kid.code)) return res.status(401).json({ error: 'Usuário ou código inválidos.' });
            return startSession(req, res, 'child', kid.id);
        } catch (error) {
            return next(error);
        }
    },

    async update(req, res) {

        const {
            id
        } = req.params;
        const {
            treatment, name, user, code, rate, birth, parent, note, key, photo
        } = req.body;

        if (code !== undefined && (typeof code !== 'string' || !/^\d{1,10}$/.test(code))) {
            return res.status(400).json({ error: 'Código de acesso inválido.' });
        }

        try {
            const hashedCode = code === undefined ? undefined : await hashPassword(code);
            const kid = await Kid.update({
                treatment, name, user, code: hashedCode, rate, birth, parent, note, key, photo
            },

                {
                    where: {
                        id: id
                    }
                }
            )

            return res.json(kid);

        } catch (error) {
            console.log(error.message);
            res.json({
                error: true
            });
        }
    },

    async delete(req, res) {
        const { id } = req.params;

        console.log('controller delete kid', req.params)
        try {
            const kid = await Kid.destroy({ 
                where: {
                    id: id
                } 
            });
    
            return res.json(kid);
        }catch(error){
            console.log(error);
                res.json({error: true});
        }
        
    }
}