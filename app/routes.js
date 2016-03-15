var request = require('request');
var fs = require('fs');
var multer = require('multer');
var mongoose = require('mongoose');
var Collection = require('./models/collection');
var Tracks = require('./models/tracks');
var mkdirp = require('mkdirp');
var rmdir = require('rimraf');

var appDirectory = "/Users/jeffcarbine/dev/SpikeDB";

// app/routes.js
module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('index.ejs'); // load the index.ejs file
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/audio', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    // uncomment to add a new user, comment out in production.
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/audio', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));


    // =====================================
    // AUDIO PAGE ==========================
    // =====================================

    // load the main audio page
    app.get('/audio', isLoggedIn, function(req, res, next) {
      Promise.all([
        Collection.find().exec(), // pull all data from collections and
        Tracks.find().exec()      // pull all datay from respective tracks
      ]).then(function(data) {
        var collections = data[0];
        var tracks = data[1];
        res.render('audio.ejs', { // passing the returned data to the response body
            collections: collections,
            tracks: tracks,
            collectionMessage: req.flash('collectionMessage'),
            trackMessage: req.flash('trackMessage'),
        });
      });
    });

    // setting up the upload handler
    var storage = multer.diskStorage({
      // check if there are any conflicts with track or collectionName
      destination: function (req, file, cb) {
        var filetype = file.mimetype;
        var ext = filetype.substring(filetype.indexOf('/')+1);
        var destination;
        if(ext == 'jpeg' || ext == 'jpg') {
          destination = appDirectory + '/archive/music/' + req.newMongoId;
        } else if (ext == 'mp3') {
          destination = appDirectory + '/archive/music/' + req.body.id;
        }
        mkdirp(destination, function (err) { // folder must be created
          if (err) console.error(err);       // in order to save to it
        });
        cb(null, destination);
      },
      filename: function (req, file, cb) {
        var filetype = file.mimetype;
        var ext = filetype.substring(filetype.indexOf('/')+1);
        cb(null, (req.newMongoId + '.' + ext));
      }
    });
    var upload = multer({ storage: storage }); // save new storage to upload function

    // add a new collection
    app.post('/addCollection',
      function(req, res, next) {
        req.newMongoId = mongoose.Types.ObjectId();
        next();
      },
      upload.single('collectionArt'),
      function(req, res, next) {
        Collection.find().exec() // get all current collection names to avoid overwriting
          .then(function(collections) {
            var currCollectionNames = [];
            for(i=0;i<collections.length;i++) {
              currCollectionNames.push(collections[i].name);
            }
            return currCollectionNames;
          }).then(function(currCollectionNames) {
            // check if collection name exists in the array
            if (currCollectionNames.indexOf(req.body.collectionName) === -1) {
              // create a new collection
              var newCollection = new Collection({
                _id: req.newMongoId,
                type:req.body.collectionType,
                name:req.body.collectionName,
                artist:req.body.artist,
                guests:req.body.guests,
                year:req.body.year,
                label:req.body.recordLabel,
                recordNumber:req.body.recordNumber,
              });
              newCollection.save(function(err, doc){
                if(err) {
                  return next(err);
                } else {
                  res.redirect('/audio'); // refresh the page
                }
              });
            } else {
              // give the user the error message
              req.flash('collectionMessage', "You can't have two collections with the same name. Please check your collection names and try again.");
              res.redirect('/audio');
            }
          });
      }
    );

    // change collection information
    app.post('/updateCollection',
    function(req, res, next) {
      // match the collection via id instead of name so there
      // are no conflicts if the name changes
      var id = req.body.id;
      console.log(req.body);
    	Collection
    		.findOneAndUpdate({
    			_id: id,
    		},{
    			$set: {
            name:req.body.collectionName,
        		artist:req.body.artist,
        		guests:req.body.guests,
        		year:req.body.year,
            label:req.body.recordLabel,
        		recordNumber:req.body.recordNumber,
          },
    		},{
    			new: true
    		})
    		.exec(function(err, doc){
          if(err) {
          	return next(err);
          } else {
            // refresh page and put the user on the collection
            // they were currently editing
            res.redirect('/audio#' + req.body.id);
          }
        });
    });

    // delete a collection and all related tracks and files
    app.post('/deleteCollection',
    function(req, res, next) {
      // remove the directory completely, which also removes all
      // .mp3 and .jpeg files
      rmdir('/Users/jeffcarbine/dev/SpikeDB/archive/music/' + (req.body.collectionName).replace(/ /g,"_"), function(err) {
        if (err) throw err;
        console.log(req.body.collectionName + ' and all the files associated with it have been deleted.');
      });

      // get collection from DB and associated tracks collection
      // and delete them
      Promise.all([
        Collection.find({'_id':req.body.collectionID}).remove().exec(),
        Tracks.find({'collectionID':req.body.collectionID}).remove().exec()
      ]).then(function(data) {
        res.redirect('/audio');
      });
    });

    // add a new track to a collection
    app.post('/addTrack',
      function(req, res, next) {
        req.newMongoId = mongoose.Types.ObjectId();
        next();
      },
      upload.single('audioFile'), // see upload handler (line 79)
      function(req, res, next) {
        // this checks of the tracks already exists or not
        Tracks.count({collectionID: req.body.id}, function (err, count){
          if(count > 0){ // if the tracks already exists
            Tracks.find({collectionID: req.body.id}).exec() // find the tracks
            .then(function(tracks) {    // check that the tracks don't already
              var currTrackNames = [];  // have a track by that same name
              for(i=0;i<tracks[0].tracks.length;i++) {
                console.log(tracks[0].tracks[i].title);
                currTrackNames.push(tracks[0].tracks[i].title);
              }
              return currTrackNames;
            })
            .then(function(currTrackNames) {
              // if there are no conflicts with track names
              if(currTrackNames.indexOf(req.body.trackName) === -1) {
                Tracks // get the correct tracks
                  .findOneAndUpdate({
                    collectionID: req.body.id,
                  },{
                    $push: { // push another track entry onto the tracks array
                      tracks:
                        {
                          _id: req.newMongoId,
                          title: req.body.trackName,
                          lyrics: req.body.trackLyrics,
                        }
                    }
                  },{
                    new: true
                  })
                  .exec(function(err, doc){
                    if(err) {
                      return next(err);
                    } else {
                      res.redirect('/audio');
                    }
                  });
                } else {
                  // if there is a track with the same name as they are trying
                  // to save, this message is sent
                  req.flash('trackMessage', "You can't have two tracks with the same name in the same collection. Please check your track names and try again.");
                  res.redirect('/audio#' + req.body.id);
                }
            });
          } else { // if the tracks does not exist yet for this collection
              var newTracks = new Tracks({ // create it
                collectionID: req.body.id,
                tracks: [{
                  _id: req.newMongoId,
                  title: req.body.trackName,
                  lyrics: req.body.trackLyrics,
                }]
              });
              newTracks.save(function(err, doc){
                if(err) {
                  return next(err);
                } else {
                  // refresh the page and put the user at the
                  // collection they are modifying
                  res.redirect('/audio#' + req.body.id);
                }
              });
            }

        });
      }
    );

    // update the name, lyrics or file of a track
    app.post('/updateTrack',
      upload.single('audioFile'), // see line 79
      function(req, res, next) {
        // rename the track file if the track title changes
        var prevTrack = appDirectory + '/archive/music/' + (req.body.collectionName).replace(/ /g,"_") + '/' + req.body.prevTrackName.replace(/ /g,"_") + '.mp3';
        var currTrack = appDirectory + '/archive/music/' + (req.body.collectionName).replace(/ /g,"_") + '/' + req.body.trackName.replace(/ /g,"_") + '.mp3';
        fs.rename(prevTrack, currTrack, function (err) {
          if (err) throw err;
        });
            Tracks
              .findOneAndUpdate({
                // get the track by ID so there's no conflict if the
                // name of the track changes
                'tracks._id': req.body.trackID,
              },{
                $set: { // update the info
                    'tracks.$.title' : req.body.trackName,
                    'tracks.$.lyrics' : req.body.trackLyrics,
                }
              },{
                new: true
              })
              .exec(function(err, doc){
                if(err) {
                  return next(err);
                } else {
                  // refresh the page
                  res.redirect('/audio');
                }
              });
            });

      // remove track info from DB and delete the file
      app.post('/deleteTrack',
        function(req, res, next) {
          // find the file and delete it
          var trackFile = appDirectory + '/archive/music/' + (req.body.collectionName).replace(/ /g,"_") + '/' + (req.body.trackName).replace(/ /g,"_") + '.mp3';
          fs.unlink(trackFile);
          // remove the entry from the DB
          Tracks
            .update({
              // get the collection
              'collectionID' : req.body.collectionID
            },{
              $pull: {
                'tracks': {
                  // delete the track with the corresponding ID
                  "_id" : req.body.trackID
                }
              }
            })
            .exec(function(err, doc){
              if(err) {
                return next(err);
              } else {
                res.redirect('/audio');
              }
            });
          });

    // =====================================
    // VIDEO PAGE ==========================
    // =====================================

    app.get('/video', isLoggedIn, function(req, res) {

        res.render('video.ejs');
    });

    // =====================================
    // IMAGES PAGE =========================
    // =====================================

    app.get('/images', isLoggedIn, function(req, res) {

        res.render('images.ejs');
    });

    // =====================================
    // SHEETS PAGE =========================
    // =====================================

    app.get('/sheets', isLoggedIn, function(req, res) {

        res.render('sheets.ejs');
    });

    // =====================================
    // API ENDPOINTS========================
    // =====================================
    app.get('/retrieve/collections', function(req, res) {
      // return all collection data
    });

    app.get('/retrieve/videos', function(req, res) {
      // return all video data
    });

    app.get('/retrieve/images', function(req, res) {
      // return all image data
    });

    app.get('/retrieve/sheets', function(req, res) {
      // return all sheet music data
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}
