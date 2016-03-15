var mongoose = require('mongoose');

var collectionSchema = mongoose.Schema({
  type          : String,
  name          : String,
  artist        : String,
  guests        : String,
  year          : Number,
  label         : String,
  recordNumber  : String,
  tracks        : Array
});

module.exports = mongoose.model('Collection', collectionSchema);
