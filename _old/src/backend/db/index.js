const Sequelize = require('sequelize');
const dbConfig = require('../connection/db');

const Admin = require('../models/Admin');
const Kid = require('../models/Kid');
const Task = require('../models/Task');
const Reward = require('../models/Reward');
const Result = require('../models/Result');

const connect = new Sequelize(dbConfig);

Admin.init(connect);
Kid.init(connect);
Task.init(connect);
Reward.init(connect);
Result.init(connect);

Kid.associate(connect.models);
Task.associate(connect.models);
Reward.associate(connect.models);
Result.associate(connect.models);

module.exports = connect;