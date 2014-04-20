
var Canvas = require('canvas');
var rfb = require('rfb2');

module.exports = VNC;

function VNC(host, port) {
  this.canvas = new Canvas(200, 150);
  this.r = rfb.createConnection({
    host: host,
    port: port
  });

  var ctx = this.canvas.getContext('2d');

  this.r.on('connect', function() {
    // connected, woo!
    this.r.on('rect', function(rect) {
      // got a frame
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
        ctx.drawImage(canvas, rect.src.x, rect.src.y, rect.width, rect.height, rect.x, rect.y);
      }
    });
  });
}

VNC.prototype.getFrame = function(callback) {
  this.canvas.toBuffer(function(err, buf) {
    if (err) throw err;
    callback(buf);
  });
};
