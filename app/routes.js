var request = require('request');
var fs = require('fs');
var multer = require('multer');
var mongoose = require('mongoose');
var Collection = require('./models/collection');
var Tracks = require('./models/tracks');
var mkdirp = require('mkdirp');

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

        Collection
          .find()
          .exec()
          .then(function(rows) {
            var collections = rows;
            res.render('audio.ejs', {
                data: collections,
            });
          });
    });

    var imageStorage = multer.diskStorage({
      destination: function (req, file, cb) {
        var collectionName = (req.body.collectionName).replace(/ /g,"_");
        var destination = '/Users/jeffcarbine/dev/SpikeDB/archive/music/' + collectionName;
        mkdirp(destination, function (err) {
          if (err) console.error(err);
        });
        cb(null, destination);
      },
      filename: function (req, file, cb) {
        cb(null, 'art.jpg');
      }
    });

    var audioStorage = multer.diskStorage({
      destination: function (req, file, cb) {
        var collectionName = (req.body.collectionName).replace(/ /g,"_");
        var destination = '/Users/jeffcarbine/dev/SpikeDB/archive/music/' + collectionName;
        mkdirp(destination, function (err) {
          if (err) console.error(err);
        });
        cb(null, destination);
      },
      filename: function (req, file, cb) {
        cb(null, (req.body.trackName).replace(/ /g,"_") + '.jpg');
      }
    });

    var uploadArt = multer({ storage: imageStorage });
    var uploadAudio = multer({ stoarge: audioStorage});

    app.post('/addCollection',
      uploadArt.single('collectionArt'),
      function(req, res, next) {
        var newCollection = new Collection({
          type:req.body.collectionType,
      		name:req.body.collectionName,
          art: (req.body.collectionName).replace(/ /g,"_") + '/art.jpg',
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
            res.redirect('/audio');
          }
        });
    });

    app.post('/addTrack',
      uploadAudio.single('audioFile'),
      function(req, res, next) {
        Tracks.count({collectionID: req.body.id}, function (err, count){
          if(count > 0){
            Tracks
              .findOneAndUpdate({
                collectionID: req.body.id,
              },{
                $push: {
                  tracks: [
                    {
                      title: req.body.trackTitle,
                      lyrics: req.body.trackLyrics,
                    }
                  ]
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
                  title: req.body.trackTitle,
                  lyrics: req.body.trackLyrics,
                }]
              });
              newTracks.save(function(err, doc){
                if(err) {
                  return next(err);
                } else {
                  res.redirect('/audio');
                }
              });
            }

        });
      }
    );

    // =====================================
    // VIDEO PAGE ==========================
    // =====================================

    app.get('/video', isLoggedIn, function(req, res) {

        var unfiled = [];
        var returnedData;

        request({
          url:'http://dgm3760.tylermaynard.com/api/quotes',
          json: true
          },
          function (error, response, responsebody) {
            console.log(responsebody);
            returnedData = responsebody;
        });

        res.render('video.ejs', {
            user : req.user, // get the user out of session and pass to template
            data: returnedData,
            unfiled: unfiled,
        });
    });

    // =====================================
    // IMAGES PAGE =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/images', isLoggedIn, function(req, res) {

        var unfiled = [];
        var returnedData;

        request({
          url:'http://dgm3760.tylermaynard.com/api/quotes',
          json: true
          },
          function (error, response, responsebody) {
            console.log(responsebody);
            returnedData = responsebody;
        });

        res.render('images.ejs', {
            user : req.user, // get the user out of session and pass to template
            data: returnedData,
            unfiled: unfiled,
        });
    });

    // =====================================
    // SHEETS PAGE =========================
    // =====================================

    app.get('/sheets', isLoggedIn, function(req, res) {

        var unfiled = [];
        var returnedData;

        request({
          url:'http://dgm3760.tylermaynard.com/api/quotes',
          json: true
          },
          function (error, response, responsebody) {
            console.log(responsebody);
            returnedData = responsebody;
        });

        res.render('sheets.ejs', {
            user : req.user, // get the user out of session and pass to template
            data: returnedData,
            unfiled: unfiled,
        });
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
