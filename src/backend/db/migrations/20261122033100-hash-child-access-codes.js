'use strict';

const { hashPassword } = require('../../auth/password');

module.exports = {
    async up(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;
        await sequelize.transaction(async (transaction) => {
            const children = await sequelize.query(
                'SELECT id, code FROM kids ORDER BY id FOR UPDATE',
                { type: Sequelize.QueryTypes.SELECT, transaction, logging: false }
            );
            for (const { id, code } of children) {
                await queryInterface.bulkUpdate(
                    'kids', { code: await hashPassword(code) }, { id },
                    { transaction, logging: false }
                );
            }
        });
    },

    async down() {
        throw new Error('Hashed access codes cannot be converted back to plaintext.');
    }
};
