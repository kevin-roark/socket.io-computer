
var fs = require('fs');
var Computer = require('./computer');
var join = require('path').join;
var crypto = require('crypto');
var debug = require('debug')('computer:worker');

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

process.title = 'socket.io-computer-emulator';

// redis
var redis = require('./redis').emu();
var sub = require('./redis').emu();
var io = require('socket.io-emitter')(redis, {key: 'xpemu'});

// iso
var iso = process.env.COMPUTER_ISO;
if ('/' != iso[0]) iso = join(process.cwd(), iso);
debug('iso %s', iso);

// img
var img = process.env.COMPUTER_IMG;
if ('/' != img[0]) img = join(process.cwd(), img);
debug('img %s', img);

var saveInterval = null;

// load computer emulator
var emu;

function load(){
  debug('loading emulator');
  emu = new Computer();

  emu.on('error', function() {
    console.log(new Date + ' - restarting emulator');
    emu.destroy();
    setTimeout(load, 1000);
  });

  var lastHash;

  emu.on('frame', function(frame) {
    io.emit('frame', frame);
  });

  emu.on('copy', function(rect) {
    io.emit('copy', rect);
  });

  console.log('init emu');
  emu.init(img, iso);
  setTimeout(function() {
    console.log('run emu');
    emu.run();
  }, 2000);

  function save() {
    if (saveInterval) {
      debug('will save in %d', saveInterval);
      emu.snapshot('xpsnapshot.img');
      setTimeout(save, saveInterval);
    }
  }
}

// controlling
sub.subscribe('computer:keydown');
sub.subscribe('computer:pointer');

sub.on('message', function(channel, data) {
  data = data.toString();

  if ('computer:keydown' == channel) {
    // data is a key for send_press
    emu.key(data, 0);
  } else if ('computer:pointer' == channel) {
    // absolute x and y of client
    var split = data.split(':');
    var x = parseInt(split[0], 10);
    var y = parseInt(split[1], 10);
    var state = parseInt(split[2], 10);
    emu.pointer(x, y, state);
  }
});

function checksum(str){
  return crypto.createHash('md5').update(str).digest('hex');
}

load();
