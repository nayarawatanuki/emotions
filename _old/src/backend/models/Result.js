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
        this.belongsTo(models.Task, { foreignKey: 'task_id', as: 'tasks'});
        this.belongsTo(models.Kid, { foreignKey: 'kid_id', as: 'kids'});
    }
}

module.exports = Result;