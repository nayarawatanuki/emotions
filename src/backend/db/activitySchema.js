const activityTable = 'activities';
const activityKey = 'activity_id';
const previousActivityTable = 'tasks';
const previousActivityKey = 'task_id';

async function findActivityTable(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const candidates = [activityTable, previousActivityTable].filter((name) => tables.includes(name));
    if (candidates.length > 1) {
        throw new Error('More than one activity table exists.');
    }
    return candidates[0];
}

function foreignKeyForActivity(table) {
    return table === previousActivityTable ? previousActivityKey : activityKey;
}

module.exports = {
    activityTable,
    activityKey,
    previousActivityTable,
    previousActivityKey,
    findActivityTable,
    foreignKeyForActivity,
};
