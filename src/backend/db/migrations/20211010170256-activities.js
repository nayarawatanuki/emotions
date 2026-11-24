'use strict';

const { activityTable, findActivityTable } = require('../activitySchema');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (await findActivityTable(queryInterface)) return;
    await queryInterface.createTable(activityTable, {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      kid_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'kids', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      emotion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      response1: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      response2: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      response3: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
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
    const table = await findActivityTable(queryInterface);
    if (table) await queryInterface.dropTable(table);
  }
};