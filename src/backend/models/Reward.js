const { Model, DataTypes } = require('sequelize');

class Reward extends Model {
    static init(sequelize) {
        super.init({
            photo: DataTypes.STRING,
            message: DataTypes.STRING,
        }, {
            sequelize
        })
    }

    static associate(models) {
        this.belongsTo(models.Activity, { foreignKey: 'activity_id', as: 'activities'});
    }
}

module.exports = Reward;