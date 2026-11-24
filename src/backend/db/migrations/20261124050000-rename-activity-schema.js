'use strict';

const {
  activityTable: currentTable,
  activityKey: currentKey,
  previousActivityTable: previousTable,
  previousActivityKey: previousKey,
} = require('../activitySchema');

async function renameActivitySchema(queryInterface, fromTable, toTable, fromKey, toKey) {
  const tables = await queryInterface.showAllTables();
  if (tables.includes(fromTable) === tables.includes(toTable))
    throw new Error(`Expected exactly one of ${fromTable} and ${toTable}.`);

  const changes = [];
  for (const table of ['results', 'rewards']) {
    const columns = await queryInterface.describeTable(table);
    if (Boolean(columns[fromKey]) === Boolean(columns[toKey]))
      throw new Error(`Expected exactly one activity reference in ${table}.`);
    if (columns[fromKey]) changes.push(table);
  }

  if (tables.includes(fromTable)) await queryInterface.renameTable(fromTable, toTable);
  for (const table of changes) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${table}\` RENAME COLUMN \`${fromKey}\` TO \`${toKey}\``,
    );
  }
}

module.exports = {
  up(queryInterface) {
    return renameActivitySchema(queryInterface, previousTable, currentTable, previousKey, currentKey);
  },
  down(queryInterface) {
    return renameActivitySchema(queryInterface, currentTable, previousTable, currentKey, previousKey);
  },
};
