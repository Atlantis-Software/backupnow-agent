var fs = require('fs');
var path = require('path');
var Ftp = require('ftp');
var asynk = require('asynk');

module.exports = function(req, data, files, logger) {
  files.done(function(files) {
    req.notify({ status: 'RUNNING', percent: 0 });
    var ftp = new Ftp();
    ftp.connect({
      host: data.backup.host,
      port: data.backup.port,
      user: data.backup.username,
      password: data.backup.password
    });
    ftp.on('error', function(err) {
      ftp.end();
      var ftp_err = 'FTP_ERROR';
      switch (err.code) {
        case 530:
          ftp_err = 'INVALID_LOGIN_OR_PASWORD';
          break;
        case 'ECONNREFUSED':
          ftp_err = 'FTP_CONNECTION_REFUSED';
          break;
        case 'EHOSTUNREACH':
          ftp_err = 'FTP_HOST_UNREACHABLE'
      }
      req.reject({ status: 'FAIL', err: ftp_err });
      logger.error(err);
    });
    ftp.on('ready', function() {
      var checkedDir = [];
      var transfered = 0;
      var currentFolder = [];

      var getRelativeLink = function(current, next) {
        var relative = [];
        var i = 0;
        while(current[i] && next[i] && current[i] === next[i]) {
          i++;
        }
        for (var j = i; j < current.length; j++) {
          relative.push('..');
        }
        for (var k = i; k < next.length; k++) {
          relative.push(next[k]);
        }
        return relative;
      };

      var createIfnotExist = function(dir, cb) {
        var next = dir.split('/').filter(function(f) { return f !== ''; });
        var relative = getRelativeLink(currentFolder, next);
        var loopFolders = function(folders, cb) {
          if (folders.length === 0) {
            return cb();
          }
          var folder = folders.shift();
          ftp.cwd(folder, function(err) {
            if (err) {
              if (err.code === 550) {
                folders.unshift(folder);
                return ftp.mkdir(folders.join('/'), true, cb);
              }
              return cb(err);
            }
            if (folder !== '..') {
              currentFolder.push(folder);
            } else {
              currentFolder.pop();
            }
            checkedDir.push(currentFolder.join('/'));
            loopFolders(folders, cb);
          });
        };
        loopFolders(relative, cb);
      };

      var put = function(fileData, dst, cb) {
        ftp.put(fileData, dst, function(err) {
          if (err) {
            return cb(err);
          }
          transfered++;
          var percent = transfered / files.length * 100;
          req.notify({ status: 'RUNNING', percent });
          cb();
        });
      };

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

          if (checkedDir.indexOf(dstDir) === -1) {
            createIfnotExist(dstDir, function(err) {
              put(fileData, dst, cb);
            });
          } else {
            put(fileData, dst, cb);
          }
        });
      }).serie().done(function() {
        req.resolve({ status: 'DONE' });
        logger.info('backup done');
      }).fail(function(err) {
        switch(err.code) {
          case "ECONNREFUSED":
            req.reject({ status: 'FAIL', err: 'could not connect to ftp' });
            break;
          default:
            req.reject({ status: 'FAIL', err: 'could not send files to ftp' });
            break;
        }
        logger.error(err);
      });
    });
  });
  files.fail(function(err) {
    req.reject({ status: 'FAIL', err: 'could not list files' });
    logger.error(err);
  });
};
