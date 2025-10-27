const path = require('path');

module.exports = {
    mode: "production",
    entry: "./src/index.js",
    output: {
        path: path.join(process.cwd(), 'docs'),
    },
};