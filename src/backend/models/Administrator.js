const { Model, DataTypes } = require('sequelize');

class Administrator extends Model {
    static init(sequelize) {
        super.init({
            name: DataTypes.STRING,
            user: DataTypes.STRING,
            password: DataTypes.STRING,
        }, {
            sequelize,
            tableName: 'admins'
        })
    }
}

module.exports = Administrator;