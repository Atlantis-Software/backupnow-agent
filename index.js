var fs = require('fs');
var os = require('os');
var path = require('path');
var yaml = require('js-yaml');
var log4js = require('log4js');
var telepathy = require('telepathymq');
var asynk = require('asynk');

var sftp = require('./backups/sftp');
var folder = require('./backups/src/folder');

process.on('uncaughtException', function(err) {
  console.log(err);
});

var config_folder;
switch(os.platform()) {
  case 'linux':
    config_folder = '/etc/backup-agent/';
    break;
}
if (!config_folder) {
  return console.log('Plateform ' + os.platform() + ' is not supported');
}

var config = yaml.safeLoad(fs.readFileSync(path.join(config_folder, 'config.yml')));
log4js.configure({
  appenders: { agent: { type: 'file', filename: config.log } },
  categories: { default: { appenders: ['agent'], level: 'error' } }
});
var logger = log4js.getLogger('agent');

var socket = new telepathy(config.name);

asynk.add(fs.readFile).args(config.key, asynk.callback)
  .add(fs.readFile).args(config.cert, asynk.callback)
  .add(fs.readFile).args(config.manager.cert, asynk.callback)
  .parallel().asCallback(function(err, files) {
  if (err) {
    return logger.error(err);
  }

  var tlsOptions = {
    requestCert: true,
    rejectUnauthorized: true,
    key: files.shift(),
    cert: files.shift(),
    ca: files
  };

  var connectString = 'tls://' + config.manager.ip + ':' + config.manager.port;
  socket.register('manager', connectString, tlsOptions);

  socket.on('request', function(req, data) {
    if (!data || !data.backup || !data.backup.type) {
      req.reject('INVALID_REQUEST: no backup type');
      return logger.error('no backup type found: ' + JSON.stringify(data));
    }

    var files = null;
    switch(data.type) {
      case 'folder':
        files = folder(data.src);
    }
    if (!files) {
      req.reject('INVALID_SOURCE_TYPE');
      return logger.error('invalid source type: ' + JSON.stringify(data));
    }

    switch(data.backup.type) {
      case 'sftp':
        sftp(req, data, files, logger);
        break;
      default:
        req.reject('INVALID_BACKUP_TYPE');
        logger.error('invalid backup type: ' + JSON.stringify(data));
        break;
    }
  });
});
