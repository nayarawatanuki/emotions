'use strict';

module.exports = {
  up(queryInterface, Sequelize) {
    return queryInterface.addColumn('tasks', 'image_description', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down(queryInterface) {
    return queryInterface.removeColumn('tasks', 'image_description');
  }
};
