const sequelize = require("sequelize")

module.exports = {
    dialect: 'mysql',
    host: 'localhost',
    username: 'root',
    password: process.env.DB_PASSWORD,
    database: 'emotions',
    define: {
        timezone: 'UTC-03:00',
        timestamps: true,
    },
}