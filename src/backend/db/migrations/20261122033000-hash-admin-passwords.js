'use strict';

const { hashPassword } = require('../../auth/password');

module.exports = {
    async up(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;
        await sequelize.transaction(async (transaction) => {
            const admins = await sequelize.query(
                'SELECT id, password FROM admins ORDER BY id FOR UPDATE',
                { type: Sequelize.QueryTypes.SELECT, transaction, logging: false }
            );
            for (const { id, password } of admins) {
                await queryInterface.bulkUpdate(
                    'admins', { password: await hashPassword(password) }, { id },
                    { transaction, logging: false }
                );
            }
        });
    },

    async down() {
        throw new Error('Hashed passwords cannot be converted back to plaintext.');
    }
};
