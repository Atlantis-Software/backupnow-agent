var fs = require('fs');
var path = require('path');
var asynk = require('asynk');

module.exports = function(src) {
  var files = asynk.deferred();
  if (typeof src !== 'string') {
    files.reject(new Error('src is not a valid folder'));
    return files.promise();
  }
  // check folder src is a valid folder
  fs.stat(src, function(err, stats) {
    if (err) {
      return files.reject(err);
    }
    if (!stats.isDirectory()) {
      return files.reject(new Error(src + ' is not a valid folder'));
    }
    var file_list = [];
    var recurseReadDir = function(src, cb) {
      fs.readdir(src,  function(err, dirFiles) {
        if (err) {
          return files.reject(err);
        }
        asynk.each(dirFiles, function(file, cb) {
          var filename = path.join(src, file);
          fs.stat(filename, function(err, stat) {
            if (err) {
              return cb(err);
            }
            if (stat.isFile()) {
              file_list.push(filename);
              return cb();
            } else if (stat.isDirectory()) {
              return recurseReadDir(filename, cb);
            } else {
              return cb();
            }
          });
        }).serie().asCallback(cb);
      });
    };
    recurseReadDir(src, function(err) {
      if (err) {
        return files.reject(err);
      }
      files.resolve(file_list);
    });
  });

  return files.promise();
}