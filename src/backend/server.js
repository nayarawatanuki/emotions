const activityMedia = require('./connection/activityMedia');
require('dotenv').config();

const express = require('express');
const path = require("path");
const { existsSync } = require('node:fs');
const cors = require('cors');
require('./db');

const administratorRoutes = require('./routes/Administrators');
const kidRoutes = require("./routes/Kids");
const activityRoutes = require("./routes/Activities");
const activityRewardRoutes = require('./routes/Rewards');
const activityResultRoutes = require('./routes/Results');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    "/kidPhoto",
    express.static(path.resolve(__dirname, "./uploads/images/kidPhoto"))
);
app.use(
    activityMedia.urlPath,
    express.static(activityMedia.directory)
);

app.use(administratorRoutes);
app.use(kidRoutes);
app.use(activityRoutes);
app.use(activityRewardRoutes);
app.use(activityResultRoutes);

const frontendBuild = path.resolve(__dirname, '../../build');
const frontendIndex = path.join(frontendBuild, 'index.html');
if (existsSync(frontendIndex)) {
    app.use(express.static(frontendBuild));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path === '/api' ||
            req.path.startsWith(activityMedia.urlPath + '/') ||
            req.path.startsWith('/kidPhoto/')) return next();
        return res.sendFile(frontendIndex);
    });
}

app.listen(3000, 'localhost', () => {
    console.log('server start');
})