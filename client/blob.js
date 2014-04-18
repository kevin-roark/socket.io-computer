/*global URL*/

/* dependencies */
var Blob = require('blob');

module.exports = blobToImage;

function blobToImage(imageData) {
  if (Blob && 'undefined' != typeof URL) {
    var blob = new Blob([imageData], {type: 'image/jpg'});
    return URL.createObjectURL(blob);
  } else if (imageData.base64) {
    return 'data:image/jpg;base64,' + imageData.data;
  } else {
    return 'about:blank';
  }
}
