var mongoose = require('mongoose');

var collectionSchema = mongoose.Schema({
  type          : String,
  name          : String,
  artist        : String,
  guests        : String,
  year          : Number,
  label         : String,
  recordNumber  : String,
  tracksID      : String,
});

module.exports = mongoose.model('Collection', collectionSchema);
