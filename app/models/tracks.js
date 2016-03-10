var mongoose = require('mongoose');

var tracksSchema = mongoose.Schema({
  collectionID      : String,
  tracks            : [{
    title       : String,
    lyrics      : String
  }]
});

module.exports = mongoose.model('Tracks', tracksSchema);
