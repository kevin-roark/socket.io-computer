
var Canvas = require('canvas');
var Emitter = require('events').EventEmitter;
var rfb = require('rfb2');
var exec = require('child_process').exec;
var Jpeg = require('jpeg').Jpeg;
var FixedJpegStack = require('jpeg').FixedJpegStack;
var fs = require('fs');

var SS_NAME = 'ss.jpg';

module.exports = VNC;

function VNC(host, port) {

  this.host = host;
  this.port = port;
  this.displayNum = port - 5900; // vnc convention

  this.width = 800;
  this.height = 600;

  this.r = rfb.createConnection({
    host: host,
    port: port
  });

  var self = this;
  this.r.on('rect', this.drawRect.bind(this));
}

VNC.prototype.__proto__ = Emitter.prototype;

function putData(ctx, id, rect) {
  ctx.putImageData(id, rect.x, rect.y);
}

VNC.prototype.drawRect = function(rect) {
  if (rect.encoding != 0) {
    this.emit('copy', rect);
    return;
  }

  var date = new Date;
  var rgb = new Buffer(rect.width * rect.height * 3);
 
  for (var i = 0, o = 0; i < rect.data.length; i += 4) {
    rgb[o++] = rect.data[i + 2];
    rgb[o++] = rect.data[i + 1];
    rgb[o++] = rect.data[i];
  }

  var self = this;
  var image = new Jpeg(rgb, rect.width, rect.height, 'rgb');
  image.encode(function(img, err){
    if (img) self.emit('raw', {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      image: img
    });
  });

  if (!this.state) {
    // first frame
    this.state = new FixedJpegStack(this.width, this.height, 'rgb');
    this.state.push(rgb, 0, 0, rect.width, rect.height);
  } else {
    this.state.push(rgb, rect.x, rect.y, rect.width, rect.height);
  }

  this.state.encode(function(img, err) {
    if (img) self.emit('frame', img);
  });
};
