var folder = require('../backups/src/folder');
var fs = require('fs');
var path = require('path');
var os = require('os');
var assert = require('assert');

var listfolder = path.join(__dirname, '..');
var test1 = path.join(listfolder, 'index.js');
var test2 = path.join(listfolder, 'package.json');
var test3 = path.join(listfolder, 'backups', 'src', 'folder.js');

describe('folder', function() {
  it('should list the folder', function(done) {
    var files = folder(listfolder);
    files.fail(done);
    files.done(function(list) {
      assert(list.indexOf(test1) !== -1, 'file index.js not listed');
      assert(list.indexOf(test2) !== -1, 'file package.json not listed');
      assert(list.indexOf(test3) !== -1, 'file backups/src/folder.js not listed');
      done();
    });
  });
});
