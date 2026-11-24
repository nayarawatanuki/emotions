const path = require('path');

const urlPath = '/activityImage';
const directory = path.resolve(__dirname, '../uploads/images', urlPath.slice(1));

module.exports = { urlPath, directory };
