var mongoose = require('mongoose');

var collectionSchema = mongoose.Schema({
  type          : String,
  name          : String,
  art           : String,
  artist        : String,
  guests        : String,
  year          : Number,
  label         : String,
  recordNumber  : Number,
  tracksID      : String,
});

module.exports = mongoose.model('Collection', collectionSchema);
