const { Model, DataTypes } = require('sequelize');

class Admin extends Model {
    static init(sequelize) {
        super.init({
            name: DataTypes.STRING,
            user: DataTypes.STRING,
            password: DataTypes.STRING,
        }, {
            sequelize
        })
    }
}

module.exports = Admin;