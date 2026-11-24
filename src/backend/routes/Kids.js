const { apiRoutes } = require('../../routes');
const express = require('express');
const routes = express.Router();

const multer = require('multer');
const multerConfig = require("../connection/AWS/kidPhoto/multer");

const kids = require("../controllers/KidController");

//FUNCTIONS
routes.get(apiRoutes.kids, kids.list);

routes.get(apiRoutes.kid, kids.listOne);

routes.post(apiRoutes.kidLogin, kids.login);

routes.post(apiRoutes.kids, multer(multerConfig).single("photo"), (req, res) => {
    
    const { key, location } = req.file || {};
    const photo = location || (key && `/kidPhoto/${encodeURIComponent(key)}`);
    if (!photo) return res.status(400).json({ error: 'Image required' });
    const { treatment: careActive, name, user, code, rate: grade, birth, parent, note } = req.body;
    //console.log("test ", req.body)

    const Kid = require("../models/Kid");

    const kid = Kid.create(
        { treatment: careActive, name, user, code, rate: grade, birth, parent, note, key, photo }
    ).then((response) => {
        return res.json(response);
        
    }).catch(() => {
            return res.status(400).json({
            err: true,
            message: "erro"
        }) 
    });
})

routes.put(apiRoutes.kid, kids.update);

routes.delete(apiRoutes.kid, kids.delete);

module.exports = routes;
