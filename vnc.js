
var Canvas = require('canvas');
var Emitter = require('events').EventEmitter;
var rfb = require('rfb2');
var exec = require('child_process').exec;
var Jpeg = require('jpeg').Jpeg;
var fs = require('fs');

var SS_NAME = 'ss.jpg';

module.exports = VNC;

function VNC(host, port) {

  this.host = host;
  this.port = port;
  this.displayNum = port - 5900; // vnc convention

  this.command = 'vncsnapshot -quality 15 ' + this.host + ':' + this.displayNum + ' ' + SS_NAME;

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
  var self = this;
  if (rect.encoding != 0) {
    return self.emit('copy', rect);
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
    if (img) self.emit('frame', {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      image: img
    });
  });
};
