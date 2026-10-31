const Kid = require('../models/Kid');
const fs = require("fs");
const path = require("path");


const AWS = require('aws-sdk');



const s3 = new AWS.S3();

module.exports = {

    async list(req, res) {
        const kids = await Kid.findAll();

        return res.json(kids);
    },

    async listOne(req, res) {

        const {kid_id} = req.params;

        const kid = await Kid.findOne({
            where: {id: kid_id}
        });
        if (kid === null) {
            console.log('Not found!');
        } else {
            //console.log(kid instanceof Kid); // true
            console.log(kid); // 'My Title'
        }


        return res.json(kid);
    },

    async login(req, res) {

        const {
            user,
            code
        } = req.body;

        const kid = await Kid.findOne({
            where: {
                user: user,
                code: code
            }
        });
        if (kid === null) {
            console.log('Not found!');
        } else {
            //console.log(kid instanceof Kid); // true
            console.log(kid.id); // 'My Title'
        }

        return res.json(kid.id);
    },

    async update(req, res) {

        const {
            id
        } = req.params;
        const {
            treatment, name, user, code, rate, birth, parent, note, key, photo
        } = req.body;

        console.log('controller update kid', req.params, req.body)
        try {
            const kid = await Kid.update({
                treatment, name, user, code, rate, birth, parent, note, key, photo
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