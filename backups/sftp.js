var fs = require('fs');
var path = require('path');
var Sftp = require('ssh2-sftp-client');
var asynk = require('asynk');
var folder = require('./src/folder');

module.exports = function(req, data, logger) {
  var files = null;
  switch(data.type) {
    case 'folder':
      files = folder(data.src);
  }
  if (!files) {
    req.reject('INVALID_SOURCE_TYPE');
    return logger.error('invalid source type: ' + JSON.stringify(data));
  }
  files.done(function(files) {
    req.notify({ status: 'RUNNING', percent: 0 });
    var sftp = new Sftp();
    sftp.connect({
      host: data.backup.host,
      port: data.backup.port,
      username: data.backup.username,
      password: data.backup.password,
      // debug: console.log
    }).then(function() {
      var checkedDir = [];
      var transfered = 0;
      return new Promise(function(resolve, reject) {
        asynk.each(files, function(filepath, cb) {
          fs.readFile(filepath, function(err, fileData) {
            if (err) {
              return cb(err);
            }
            var date = new Date().toISOString().substr(0, 10);
            var dst = path.join(data.backup.path, date, filepath.slice(data.src.length));
            if (data.backup.path.startsWith('./') && !dst.startsWith('./')) {
              dst = './' + dst;
            }
            var dstDir = path.dirname(dst);

            var put = function() {
              sftp.put(fileData, dst).then(function() {
                transfered++;
                var percent = files.length * 100 / transfered;
                req.notify({ status: 'RUNNING', percent });
                cb();
              }).catch(cb);
            };

            if (checkedDir.indexOf(dstDir) === -1) {
              sftp.exists(dstDir).then(function(exists) {
                if (!exists) {
                  sftp.mkdir(dstDir, true).then(function() {
                    checkedDir.push(dstDir);
                    put();
                  });
                } else {
                  checkedDir.push(dstDir);
                  put();
                }
              });
            } else {
              put();
            }
          });
        }).serie().done(resolve).fail(reject);
      });
    }).then(function() {
      req.resolve({ status: 'DONE' });
      logger.info('backup done');
    });
  });
  files.fail(function(err) {
    req.reject({ status: 'FAIL', err });
    logger.error(err);
  });
}