
var Emitter = require('events').EventEmitter;
var sys = require('sys');
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var VNC = require('./vnc');
var Canvas = require('canvas');

var displayNum = process.env.COMPUTER_DISPLAY || '0';
var port = 5900 + parseInt(displayNum, 10);
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
    '-m', '1024',
    '-vnc', hostName + ':' + displayNum,
    '-net', 'nic,model=rtl8139',
    '-net', 'user',
    '-usbdevice', 'tablet',
    '-hda', img,
    '-cdrom', iso,
    '-monitor', 'stdio',
    '-boot', 'c'
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

  this.vnc.on('copy', function(rect){
    self.emit('copy', rect);
  });

  this.vnc.on('frame', function(frame){
    self.emit('frame', frame);
  });

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

Computer.prototype.pointer = function(x, y, state) {
  if (!this.running) return this;
  this.vnc.r.pointerEvent(x, y, state);
};

Computer.prototype.key = function(key) {
  if (!this.running) return this;

  var command = 'sendkey ' + key + '\n';
  if (!this.qemu.stdin.writable) return;
  this.qemu.stdin.write(command);
};

Computer.prototype.destroy = function(){
  if (this.destroyed) return this;
  this.destroyed = true;
  this.running = false;
  return this;
};
