'use strict';

const { findActivityTable, foreignKeyForActivity } = require('../activitySchema');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const activityTable = await findActivityTable(queryInterface);
    if (!activityTable) throw new Error('The activity table must exist before its references.');
    await queryInterface.createTable('results', { 
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
      response: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tries: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      time: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.dropTable('results');
  }
};