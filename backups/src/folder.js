var fs = require('fs');
var path = require('path');
var asynk = require('asynk');

module.exports = function(src) {
  var files = asynk.deferred();
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
      fs.readdir(src, { withFileTypes: true },  function(err, dirFiles) {
        if (err) {
          return files.reject(err);
        }
        asynk.each(dirFiles, function(file, cb) {
          if (file.isFile()) {
            file_list.push(path.join(src, file.name));
            return cb();
          }
          if (file.isDirectory()) {
            recurseReadDir(path.join(src, file.name), cb);
          }
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