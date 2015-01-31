
var Emitter = require('events').EventEmitter;
var sys = require('sys');
var fs = require('fs');
var exec = require('child_process').exec;
var VNC = require('./vnc');
var Canvas = require('canvas');
var debug = require('debug')('computer:computer');
var net = require('net');

var hostName = process.env.COMPUTER_VNC_HOST || '127.0.0.1';
var displayNum = process.env.COMPUTER_DISPLAY || '0';
var port = 5900 + parseInt(displayNum, 10);
var tcp = process.env.COMPUTER_TCP || '127.0.0.1:4444';

module.exports = Computer;

function Computer() {
  if (!(this instanceof Computer)) return new Computer();
  this.running = false;
  this.img = process.env.COMPUTER_IMG || null;
}

Computer.prototype.__proto__ = Emitter.prototype;

Computer.prototype.closed = function() {
  this.running = false;
  setTimeout(this.run, 100);
  return;
};

Computer.prototype.run = function() {
  var self = this;

  try {
    this.vnc = new VNC(hostName, port);
  } catch(e) {
    console.log('connection error');
    return self.closed();
  }

  try {
    var split = tcp.split(':');
    var tcpHost = split[0];
    var tcpPort = split[1];
    this.tcp = net.connect({host: tcpHost, port: tcpPort});
    this.tcp.on('end', function() {
      return self.closed();
    });
  } catch(e) {
    console.log('tcp connection error');
    return self.closed();
  }

  this.vnc.on('copy', function(rect){
    self.emit('copy', rect);
  });

  this.vnc.on('raw', function(frame){
    self.emit('raw', frame);
  });

  this.vnc.on('frame', function(frame){
    self.emit('frame', frame);
  });

  this.running = true;
};

// saves a snapshot of disk image to the given filename
Computer.prototype.snapshot = function(name) {
  if (!this.running || !this.img) return;

  var command = 'qemu-img create -f qcow2 -b ' + this.img + ' ' + name;
  exec(command, function(error, stdout, stderr) {
    if (!error) {
      console.log('saved emu to ' + name);
    }
  });
};

Computer.prototype.pointer = function(x, y, state) {
  if (!this.running) return this;
  try {
    this.vnc.r.pointerEvent(x, y, state);
  } catch(e) {
    debug('vnc error -- qemu probably down');
    this.closed();
  }
};

Computer.prototype.key = function(key) {
  if (!this.running) return this;
  var command = 'sendkey ' + key + '\n';
  this.tcpWrite(command);
};

Computer.prototype.destroy = function(){
  if (this.destroyed) return this;
  this.destroyed = true;
  this.running = false;
  return this;
};

Computer.prototype.tcpWrite = function(command) {
  try {
    this.tcp.write(command);
  } catch (e) {
    debug('tcp error -- qemu probably down');
    this.closed();
  }
};
