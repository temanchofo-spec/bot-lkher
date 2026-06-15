const { colors } = require('../SystemLog/colors.js');
module.exports = (color, message) => console.log(colors.hex(color, message));