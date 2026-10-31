const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require('../connection/AWS/kidPhoto/multer');

const Kids = require('../controllers/KidController');

//FUNCTIONS
routes.get('/listKids', Kids.list);

routes.get('/:kid_id/listKid', Kids.listOne);

routes.post('/login', Kids.login);

routes.post('/createdKid', multer(multerConfig).single("photo"), (req, res) => {
    
    // const {key: key,  location: photo} = req.file;
    const { key } = req.file;
    const photo = `/kidPhoto/${key}`;
    const { treatment, name, user, code, rate, birth, parent, note } = req.body;
    //console.log("test ", req.body)

    const Kid = require('../models/Kid');

    const kid = Kid.create(
        { treatment, name, user, code, rate, birth, parent, note, key, photo }
    ).then((response) => {
        return res.json(response);
        
    }).catch(() => {
        console.log(err);
            return res.status(400).json({
            err: true,
            message: "erro"
        }) 
    });
})

routes.put('/updatedKid/:id', Kids.update);

routes.delete('/deletedKid/:id', Kids.delete);

module.exports = routes;