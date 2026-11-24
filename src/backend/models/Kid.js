const { Model, DataTypes } = require('sequelize');

class Kid extends Model {
    static init(sequelize) {
        super.init({
            treatment: DataTypes.STRING,
            name: DataTypes.STRING,
            user: DataTypes.STRING,
            code: DataTypes.STRING,
            rate: DataTypes.STRING,
            birth: DataTypes.STRING,
            parent: DataTypes.STRING,
            note: DataTypes.STRING,
            key: DataTypes.STRING,
            photo: DataTypes.STRING,
        }, {
            sequelize,
            tableName: 'kids'
        })
    }

    static associate(models) {
        this.hasMany(models.Activity, { foreignKey: 'kid_id', as: 'activities'});
    }
}

module.exports = Kid;