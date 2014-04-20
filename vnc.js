
var Canvas = require('canvas');
var rfb = require('rfb2');

module.exports = VNC;

function VNC(host, port) {
  var width = 200;
  var height = 150;
  this.canvas = new Canvas(width, height);
  try {
    this.r = rfb.createConnection({
      host: host,
      port: port
    });
  } catch(e) {
    throw new Error('cannot vnc connect');
  }
  
  var self = this;

  self.r.on('connect', function() {
    // connected, woo!
    self.r.on('rect', function(rect) {
      // got a frame
      self.rect = rect;
    });
  });
}

function drawRect(ctx, rect) {
  if (rect.encoding == rfb.encodings.raw) {
    var id = ctx.createImageData(rect.width, rect.height);
    for (var i=0;i< id.data.length; i+=4) {
      id.data[i] = rect.data[i+2];
      id.data[i+1] = rect.data[i+1];
      id.data[i+2] = rect.data[i];
      id.data[i+3] = 255;
    }
    ctx.putImageData(id, rect.x, rect.y);
  } else if (rect.encoding == rfb.encodings.copyRect) {
    ctx.drawImage(this.canvas, rect.src.x, rect.src.y, rect.width, rect.height, rect.x, rect.y);
  }
}

VNC.prototype.getFrame = function(callback) {
  if(!this.rect) {
    callback(null);
    return;
  }

  drawRect(this.canvas.getContext('2d'), this.rect);
  this.canvas.toBuffer(function(err, buf) {
    if (err) throw err;
    callback(buf);
  });
};
