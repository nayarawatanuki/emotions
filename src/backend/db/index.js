const Sequelize = require('sequelize');
const dbConfig = require('../connection/db');

const Administrator = require('../models/Administrator');
const Kid = require("../models/Kid");
const Activity = require("../models/Activity");
const Reward = require('../models/Reward');
const Result = require('../models/Result');

const connect = new Sequelize(dbConfig);

Administrator.init(connect);
Kid.init(connect);
Activity.init(connect);
Reward.init(connect);
Result.init(connect);

Kid.associate(connect.models);
Activity.associate(connect.models);
Reward.associate(connect.models);
Result.associate(connect.models);

module.exports = connect;