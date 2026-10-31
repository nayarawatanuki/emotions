const { Model, DataTypes } = require('sequelize');

class Task extends Model {
    static init(sequelize) {
        super.init({
            name: DataTypes.STRING,
            emotion: DataTypes.STRING,
            response1: DataTypes.STRING,
            response2: DataTypes.STRING,
            response3: DataTypes.STRING,
            image: DataTypes.STRING,
            status: DataTypes.STRING,
        }, {
            sequelize
        })
    }

    static associate(models) {
        this.belongsTo(models.Kid, { foreignKey: 'kid_id', as: 'kids'});
        this.hasOne(models.Reward, { foreignKey: 'task_id', as: 'rewards'});
        this.hasOne(models.Result, { foreignKey: 'task_id', as: 'results'});
    }
}

module.exports = Task;