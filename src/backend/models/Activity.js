const { Model, DataTypes } = require('sequelize');

class Activity extends Model {
    static init(sequelize) {
        super.init({
            name: DataTypes.STRING,
            emotion: DataTypes.STRING,
            response1: DataTypes.STRING,
            response2: DataTypes.STRING,
            response3: DataTypes.STRING,
            image: DataTypes.STRING,
            image_description: DataTypes.TEXT,
            status: DataTypes.STRING,
        }, {
            sequelize,
            tableName: 'activities'
        })
    }

    static associate(models) {
        this.belongsTo(models.Kid, { foreignKey: 'kid_id', as: 'kids'});
        this.hasOne(models.Reward, { foreignKey: 'activity_id', as: 'rewards'});
        this.hasOne(models.Result, { foreignKey: 'activity_id', as: 'results'});
    }
}

module.exports = Activity;