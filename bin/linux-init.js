var fs = require('fs');
var inquirer = require('inquirer');
var yaml = require('js-yaml');
var generateKeys = require('./utils/generateKeys');

module.exports = function(name, ip) {
  var dir = '/etc/backup-agent';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, 0744);
  }
  var checkValidPort = function(value) {
    value = parseInt(value);
    if (Number.isInteger(value) && value > 0 && value < 65535) {
      return true;
    }
    return 'Port must be an integer between 0 and 65535';
  };
  inquirer.prompt([
    {type: 'input', name: 'host', message: 'What is the manager host ?', default: 'localhost'},
    {type: 'input', name: 'port', message: 'What is the manager port ?', default: 8000, validate: checkValidPort, filter: parseInt},
    {type: 'input', name: 'crt', message: 'Paste manager crt:', default: ''}
  ]).then(function(manager) {
    fs.writeFileSync('/etc/backup-agent/manager.crt', manager.crt);
    var default_config = yaml.dump({
      name,
      ip,
      key: '/etc/backup-agent/agent.key',
      cert: '/etc/backup-agent/agent.crt',
      log: '/var/log/backup-agent.log',
      manager: {
        ip: manager.host,
        port: manager.port,
        cert: '/etc/backup-agent/manager.crt'
      }
    });
    fs.writeFileSync('/etc/backup-agent/config.yml', default_config);
    generateKeys(ip, '/etc/backup-agent/');
  }).catch(function(err) {
    console.log(err);
  });
};
