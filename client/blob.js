/*global URL*/

/* dependencies */
var Blob = require('blob');

module.exports = blobToImage;

function blobToImage(imageData) {
  if (Blob && 'undefined' != typeof URL) {
    var blob = new Blob([imageData], {type: 'image/jpeg'});
    return URL.createObjectURL(blob);
  } else if (imageData.base64) {
    return 'data:image/jpeg;base64,' + imageData.data;
  } else {
    return 'about:blank';
  }
}
