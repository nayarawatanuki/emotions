'use strict';

const { findActivityTable, foreignKeyForActivity } = require('../activitySchema');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const activityTable = await findActivityTable(queryInterface);
    if (!activityTable) throw new Error('The activity table must exist before its references.');
    await queryInterface.createTable('rewards', { 
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      [foreignKeyForActivity(activityTable)]: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: activityTable, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      photo: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      message: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('rewards');
  }
};