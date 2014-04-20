
var Canvas = require('canvas');
var rfb = require('rfb2');

module.exports = VNC;

function VNC(host, port) {
  this.width = 0;
  this.height = 0;
  this.canvas = null; //new Canvas(width, height);
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
      self.width = rect.width;
      self.height = rect.height;
    });
  });
}

function drawRect(ctx, rect) {
  ctx.clearRect(0, 0, rect.width, rect.height);
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
    callback(null); return;
  }

  if (!this.canvas) {
    if (this.width && this.height) {
      this.canvas = new Canvas(this.width, this.height);
    } else {
      callback(null); return;
    }
  }

  drawRect(this.canvas.getContext('2d'), this.rect);
  this.canvas.toBuffer(function(err, buf) {
    if (err) throw err;
    callback(buf);
  });
};
