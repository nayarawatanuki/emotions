'use strict';

const { activityKey: currentIndex, previousActivityKey: historicalIndex } = require('../activitySchema');
const historicalPrefix = '/taskImage/';
const currentPrefix = '/activityImage/';

async function normalizeActivityStorage(queryInterface, previousIndex, nextIndex, previousPrefix, nextPrefix) {
    const { sequelize } = queryInterface;
    const generator = queryInterface.queryGenerator;
    for (const table of ['results', 'rewards']) {
        const indexes = await queryInterface.showIndex(table);
        if (indexes.some((index) => index.name === previousIndex)) {
            await sequelize.query(
                `ALTER TABLE ${generator.quoteIdentifier(table)}
                 RENAME INDEX ${generator.quoteIdentifier(previousIndex)}
                 TO ${generator.quoteIdentifier(nextIndex)}`
            );
        }
    }

    await sequelize.transaction(async (transaction) => {
        for (const [table, column] of [['activities', 'image'], ['rewards', 'photo']]) {
            const field = generator.quoteIdentifier(column);
            await sequelize.query(
                `UPDATE ${generator.quoteIdentifier(table)}
                 SET ${field} = CONCAT(:nextPrefix, SUBSTRING(${field}, CHAR_LENGTH(:previousPrefix) + 1))
                 WHERE LEFT(${field}, CHAR_LENGTH(:previousPrefix)) = :previousPrefix`,
                { replacements: { previousPrefix, nextPrefix }, transaction }
            );
        }
    });
}

module.exports = {
    up(queryInterface) {
        return normalizeActivityStorage(queryInterface, historicalIndex, currentIndex, historicalPrefix, currentPrefix);
    },
    down(queryInterface) {
        return normalizeActivityStorage(queryInterface, currentIndex, historicalIndex, currentPrefix, historicalPrefix);
    }
};
