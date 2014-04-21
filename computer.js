
var Emitter = require('events').EventEmitter;
var sys = require('sys');
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var VNC = require('./vnc');

var displayNum = process.env.COMPUTER_DISPLAY || '0';
var port = 5900 + parseInt(displayNum);
var hostName = process.env.COMPUTER_VNC_HOST || '127.0.0.1';
var SS_NAME = 'ss.jpg';

module.exports = Computer;

function Computer() {
  if (!(this instanceof Computer)) return new Computer();
  this.running = false;
}

Computer.prototype.__proto__ = Emitter.prototype;

function onQemuData(computer, data) {
  console.log('qemu data: ' + data);
}

function onQemuClose(computer, code) {
  console.log('qemu closed with code: ' + code);
}

Computer.prototype.init = function(img, iso) {
  this.img = img;
  this.iso = iso;
  var self = this;

  var command = 'qemu-system-x86_64';
  var args = [
    '-m', '256',
    '-vnc', hostName + ':' + displayNum,
    '-hda', img,
    '-cdrom', iso,
    '-monitor', 'stdio',
    '-boot', 'd'
  ];
  this.qemu = spawn(command, args);
  this.qemu.on('data', function(data) {
    onQemuData(self, data);
  });
  this.qemu.on('close', function(code) {
    onQemuClose(self, code);
  });
};

Computer.prototype.run = function() {
  var self = this;

  try {
    this.vnc = new VNC(hostName, port);
  } catch(e) {
    console.log('connection error');
    setTimeout(self.run, 100);
    return;
  }

  this.loop = setInterval(function() {
    frame();
  }, 100);

  function frame() {
    self.vnc.getFrame(function(buf) {
      if (buf) {
        self.emit('frame', buf);
      }
    });
  }

  this.running = true;
};

// saves a snapshot of disk image to the given filename
Computer.prototype.snapshot = function(name) {
  if (!this.running) return;

  var command = 'qemu-img create -f qcow2 -b' + this.img + ' ' + name;
  exec(command, function(error, stdout, stderr) {
    if (!error) {
      console.log('saved emu to ' + name);
    }
  });
};

Computer.prototype.mouse = function(dx, dy) {
  if (!this.running) return this;

  var command = 'mouse_move ' + dx + ' ' + dy + '\n';
  this.qemu.stdin.write(command);
};

Computer.prototype.click = function(state) {
  if (!this.running) return this;

  var command = 'mouse_button ' + state + '\n';
  console.log(command);
  this.qemu.stdin.write(command);
}

Computer.prototype.key = function(key) {
  if (!this.running) return this;

  var command = 'sendkey ' + key + '\n';
  this.qemu.stdin.write(command);
};

Computer.prototype.destroy = function(){
  if (this.destroyed) return this;
  this.destroyed = true;
  this.running = false;
  return this;
};
