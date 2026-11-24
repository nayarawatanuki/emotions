const { Model, DataTypes } = require('sequelize');

class Result extends Model {
    static init(sequelize) {
        super.init({
            response: DataTypes.STRING,
            tries: DataTypes.STRING,
            time: DataTypes.STRING,
        }, {
            sequelize
        })
    }

    static associate(models) {
        this.belongsTo(models.Activity, { foreignKey: 'activity_id', as: 'activities'});
    }
}

module.exports = Result;