const path = require('path');

const projectRoot = process.cwd();
console.log("–– – projectRoot––", projectRoot);
const wrapperScript = path.join(projectRoot, '/pm2-wrapper.sh');
const envServer = path.join(projectRoot, '/.env.server');
const envWeb = path.join(projectRoot, '/.env.web');

module.exports = {
    apps: [
        {
            name: 'restate-worker',
            cwd: path.join("../../", 'apps/workflow'),
            script: wrapperScript,
            args: [envServer, 'bun', 'run', 'dev:hot']
        },
        {
            name: 'api-server',
            cwd: path.join("../../", 'apps/server'),
            script: wrapperScript,
            args: [envServer, 'bun', 'run', 'dev:hot']
        },
        {
            name: 'web-app',
            cwd: path.join("../../", 'apps/web'),
            script: wrapperScript,
            args: [envWeb, 'bun', 'run', 'dev:hot']
        }
    ]
};
