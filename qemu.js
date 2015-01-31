
var spawn = require('child_process').spawn;
var join = require('path').join;
var debug = require('debug')('computer:qemu');

if (!process.env.COMPUTER_ISO) {
  console.log('You must specify the ENV variable `COMPUTER_ISO` ' +
      'to location of iso file to broadcast.');
  process.exit(1);
}

if (!process.env.COMPUTER_IMG) {
  console.log('Must specificy the ENV variable `COMPUTER_IMG` ' +
    'to location of disk image to use');
  process.exit(1);
}

process.title = 'socket.io-computer-qemu';

var displayNum = process.env.COMPUTER_DISPLAY || '0';
var hostName = process.env.COMPUTER_VNC_HOST || '127.0.0.1';
var tcp = process.env.COMPUTER_TCP || '127.0.0.1:4444';

// iso
var iso = process.env.COMPUTER_ISO;
if ('/' != iso[0]) iso = join(process.cwd(), iso);
debug('iso %s', iso);

// img
var img = process.env.COMPUTER_IMG;
if ('/' != img[0]) img = join(process.cwd(), img);
debug('img %s', img);

init(img, iso);

function init(img, iso) {
  var command = 'qemu-system-x86_64';
  var args = [
    '-m', '1024',
    '-vnc', hostName + ':' + displayNum,
    '-net', 'nic,model=rtl8139',
    '-net', 'user',
    '-usbdevice', 'tablet',
    '-hda', img,
    '-cdrom', iso,
    '-monitor', 'tcp:' + tcp + ',server,nowait',
    '-boot', 'c'
  ];
  var options = {
    stdio: 'inherit'
  };

  var instance = spawn(command, args, options);
  instance.on('close', function(code) {
    debug(new Date + ' - qemu closed with code: ' + code);
    setTimeout(function() {
      init(img, iso);
    }, 500);
  });
}
