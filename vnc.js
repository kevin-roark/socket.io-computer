
var Canvas = require('canvas');
var rfb = require('rfb2');

module.exports = VNC;

function VNC(host, port) {
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
    self.width = self.r.width;
    self.height = self.r.height;
    self.canvas = new Canvas(self.width, self.height);
    console.log(self.height);
    console.log(self.width);
    self.r.on('rect', function(rect) {
      // got a frame
      if (rect.width > self.width || rect.height > self.height) {
        self.width = rect.width;
        self.height = rect.height;
        self.canvas = new Canvas(rect.width, rect.height);
      }

      self.rect = rect;
      self.drawRect(rect);
    });
  });
}

// from ansi-vnc
VNC.prototype.scaleFactor = function() {
  var oldWidth = this.canvas.width;
  var oldHeight = this.canvas.height;
  var maxWidth = this.display.width;
  var maxHeight = this.display.height;

  var sf;
  if (oldWidth > oldHeight) {
    sf = maxWidth / oldWidth;
  } else {
    sf = maxHeight / oldHeight;
  }
  return sf;
}

function putData(ctx, id, rect) {
  ctx.putImageData(id, rect.x, rect.y);
}

VNC.prototype.drawRect = function(rect) {
  var ctx = this.canvas.getContext('2d');
  if (rect.encoding == rfb.encodings.raw) {
    var id = ctx.createImageData(rect.width, rect.height);
    for (var i=0;i< id.data.length; i+=4) {
      id.data[i] = rect.data[i+2];
      id.data[i+1] = rect.data[i+1];
      id.data[i+2] = rect.data[i];
      id.data[i+3] = 255;
    }
    
    putData(ctx, id, rect);
  } else if (rect.encoding == rfb.encodings.copyRect) {
    ctx.drawImage(this.canvas, rect.src.x, rect.src.y, rect.width, rect.height, rect.x, rect.y);
  }
}

VNC.prototype.getFrame = function(callback) {
  if(!this.rect) {
    callback(null); return;
  }

  this.canvas.toBuffer(function(err, buf) {
    if (err) throw err;
    callback(buf);
  });
};
