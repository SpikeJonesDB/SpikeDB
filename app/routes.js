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

    app.get('/audio', isLoggedIn, function(req, res, next) {
      Promise.all([
        Collection.find().exec(),
        Tracks.find().exec()
      ]).then(function(data) {
        var collections = data[0];
        var tracks = data[1];
        console.log('Tracks: ' + tracks);
        res.render('audio.ejs', {
            collections: collections,
            tracks: tracks,
        });
      });
    });

    var storage = multer.diskStorage({
      destination: function (req, file, cb) {
        var collectionName = (req.body.collectionName).replace(/ /g,"_");
        var destination = appDirectory + '/archive/music/' + collectionName;
        mkdirp(destination, function (err) {
          if (err) console.error(err);
        });
        cb(null, destination);
      },
      filename: function (req, file, cb) {
        var filetype = file.mimetype;
        var ext = filetype.substring(filetype.indexOf('/')+1);
        if(ext == 'jpeg' || ext == 'jpg') {
          cb(null, 'art.' + ext);
        } else if (ext == 'mp3') {
          cb(null, (req.body.trackName).replace(/ /g,"_") + "." + ext)
        }
      }
    });
    var upload = multer({ storage: storage });

    app.post('/addCollection',
      upload.single('collectionArt'),
      function(req, res, next) {
        var newCollection = new Collection({
          type:req.body.collectionType,
      		name:req.body.collectionName,
          art: (req.body.collectionName).replace(/ /g,"_") + '/art.jpeg',
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
            console.log(res.body);
            res.redirect('/audio');
          }
        });
      }
    );

    app.post('/updateCollection',
    function(req, res, next) {
      var prevDir = appDirectory + '/archive/music/' + (req.body.prevCollectionName).replace(/ /g,"_");
      var currDir = appDirectory + '/archive/music/' + (req.body.collectionName).replace(/ /g,"_");
      fs.rename(prevDir, currDir, function (err) {
        if (err) throw err;
      });
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
            res.redirect('/audio#' + req.body.id);
          }
        });
    });

    app.post('/deleteCollection',
    function(req, res, next) {
      rmdir('/Users/jeffcarbine/dev/SpikeDB/archive/music/' + (req.body.collectionName).replace(/ /g,"_"), function(err) {
        if (err) throw err;
        console.log(req.body.collectionName + ' and all the files associated with it have been deleted.');
      });

      Promise.all([
        Collection.find({'_id':req.body.collectionID}).remove().exec(),
        Tracks.find({'collectionID':req.body.collectionID}).remove().exec()
      ]).then(function(data) {
        res.redirect('/audio');
      });
    });

    app.post('/addTrack',
      upload.single('audioFile'),
      function(req, res, next) {
        Tracks.count({collectionID: req.body.id}, function (err, count){
          if(count > 0){
            Tracks
              .findOneAndUpdate({
                collectionID: req.body.id,
              },{
                $push: {
                  tracks:
                    {
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
              var newTracks = new Tracks({
                collectionID: req.body.id,
                tracks: [{
                  title: req.body.trackName,
                  lyrics: req.body.trackLyrics,
                }]
              });
              newTracks.save(function(err, doc){
                if(err) {
                  return next(err);
                } else {
                  res.redirect('/audio#' + req.body.id);
                }
              });
            }

        });
      }
    );

    app.post('/updateTrack',
      upload.single('audioFile'),
      function(req, res, next) {
        var prevTrack = appDirectory + '/archive/music/' + (req.body.collectionName).replace(/ /g,"_") + '/' + req.body.prevTrackName.replace(/ /g,"_") + '.mp3';
        var currTrack = appDirectory + '/archive/music/' + (req.body.collectionName).replace(/ /g,"_") + '/' + req.body.trackName.replace(/ /g,"_") + '.mp3';
        fs.rename(prevTrack, currTrack, function (err) {
          if (err) throw err;
        });
            Tracks
              .findOneAndUpdate({
                'tracks._id': req.body.trackID,
              },{
                $set: {
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
                  res.redirect('/audio');
                }
              });
            });

      app.post('/deleteTrack',
        function(req, res, next) {
          var trackFile = appDirectory + '/archive/music/' + (req.body.collectionName).replace(/ /g,"_") + '/' + (req.body.trackName).replace(/ /g,"_") + '.mp3';
          fs.unlink(trackFile);
          Tracks
            .update({
              'collectionID' : req.body.collectionID
            },{
              $pull: {
                'tracks': {
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
    // IMAGES PAGE =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
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
