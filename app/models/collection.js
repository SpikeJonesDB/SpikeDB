var mongoose = require('mongoose');

var collectionSchema = mongoose.Schema({
  name          : String,
  artist        : String,
  guests        : String,
  year          : Number,
  label         : String,
  recordNumber  : Number,
  tracks        : Array,
});

module.exports = mongoose.model('Collection', collectionSchema);
