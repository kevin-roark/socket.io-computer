
var fs = require('fs');
var Computer = require('./computer');
var crypto = require('crypto');
var debug = require('debug')('computer:worker');
var turn = require('./turn');

process.title = 'socket.io-computer-emulator';

// redis
var redis = require('./redis').emu();
var sub = require('./redis').emu();
var io = require('socket.io-emitter')(redis, {key: 'xpemu'});

var saveInterval = null;

// load computer emulator
var emu;

function load() {
  debug('loading emulator');
  emu = new Computer();

  emu.on('error', function() {
    console.log(new Date + ' - restarting emulator');
    emu.destroy();
    setTimeout(load, 1000);
  });

  var state;

  emu.on('raw', function(frame) {
    io.emit('raw', frame);
  });

  emu.on('frame', function(buf) {
    redis.set('computer:frame', buf);
  });

  emu.on('copy', function(rect) {
    io.emit('copy', rect);
  });

  setTimeout(function() {
    console.log('running emu');
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
sub.subscribe('computer:turn');

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
  } else if ('computer:turn' == channel) {
    // turn request (data is socket.id)
    turn.push(data);
    turn.checkQueue(true);
  }
});

function checksum(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

load();
