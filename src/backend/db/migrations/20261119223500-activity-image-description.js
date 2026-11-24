'use strict';

const { findActivityTable } = require('../activitySchema');

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await findActivityTable(queryInterface);
    if (!table) throw new Error('The activity table does not exist.');
    const columns = await queryInterface.describeTable(table);
    if (!columns.image_description) {
      await queryInterface.addColumn(table, 'image_description', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await findActivityTable(queryInterface);
    if (table && (await queryInterface.describeTable(table)).image_description) {
      await queryInterface.removeColumn(table, 'image_description');
    }
  }
};
