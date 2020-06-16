var sftp = require('../backups/sftp');
var asynk = require('asynk');
var path = require('path');
var assert = require('assert');
var SFTPServer = require('node-sftp-server');
var generateKeys = require('../bin/utils/generateKeys');

const PORT = 7000;
const USERNAME = "backup";
const PASSWORD = "test";

var data = {
  request:"backup",
  backup: { 
    id: 1,
    name: "backup",
    host: "127.0.0.1",
    port: PORT,
    type: "sftp",
    username: USERNAME,
    password: PASSWORD,
    path: "./ldap2/"
  },
  type: "folder",
  src: __dirname
};

var logger = {
  info: function(info) {
  },
  error: function(err) {
  }
};

generateKeys('127.0.0.1', __dirname);

var myserver = new SFTPServer({privateKeyFile: path.join(__dirname, 'agent.key')});
myserver.listen(PORT);
var sftpfiles = [];
myserver.on("connect", function(auth, info) {
  if (auth.method !== 'password' || auth.username !== USERNAME || auth.password !== PASSWORD) {
    return auth.reject(['password'],false);
  }
  return auth.accept(function(session) {
    session.on('stat', function(path, statkind, statresponder) {
      if (sftpfiles.indexOf(path) === -1) {
        statresponder.nofile();
      } else {
        statresponder.is_directory();
        statresponder.permissions = 0o755;
        statresponder.uid = 1;
        statresponder.gid = 1;
        statresponder.size = 0;
        statresponder.atime = 123456;
        statresponder.mtime = 123456;
        statresponder.file();
      }
      
    });
    session.on('mkdir', function(path, responder) {
      sftpfiles.push(path);
      responder.ok();
    });

    session.on('writefile', function(path, readstream) {
      sftpfiles.push(path);
      readstream.on('data', function() {});
    });

  });
});

describe('sftp', function() {
  it('should upload files', function(done) {
    var req = asynk.deferred();
    var files = asynk.deferred();
    files.resolve([__filename]);
    sftp(req, data, files, logger);
    req.fail(function(err) {
      done(new Error(err.err));
    });
    req.done(function() {
      assert.equal(sftpfiles.length, 2);
      done();
    });
  });
});
