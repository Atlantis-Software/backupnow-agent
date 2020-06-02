var os = require('os');
var program = require('commander');

program.command('init <name> <ip>').action(function(name, ip) {
  var platform = null;
  switch(os.platform()) {
    case 'linux':
      platform = require('./linux-init');
      break;
  }
  if (platform) {
    platform(name, ip);
  } else {
    console.log('platform ' + os.platform() + ' is not supported');
  }
});

program.parse(process.argv);