var request = require('request');
var fs = require('fs');
var multer = require('multer');
var mongoose = require('mongoose');
var Collection = require('./models/collection');

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
    // AUDIO PAGE =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/audio', isLoggedIn, function(req, res, next) {

        // var unfiled = [];
        // var returnedData;
        //
        // request({
        //   url:'http://dgm3760.tylermaynard.com/api/quotes',
        //   json: true
        //   },
        //   function (error, response, responsebody) {
        //     console.log(responsebody);
        //     returnedData = responsebody;
        // });

        	Collection
        		.find(function(err, docs) {

            })
        });

        res.render('audio.ejs', {
            user : req.user, // get the user out of session and pass to template
            data: returnedData,
            unfiled: unfiled,
        });
    });

    var storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, '/Users/jeffcarbine/dev/spikedb/archive/music/' + req.body.collectionName);
      },
      filename: function (req, file, cb) {
        cb(null, req.body.artist + '.mp4'); // will be altered for each file later
      }
    });

    var upload = multer({ storage: storage });

    app.post('/addCollection',
      function(req, res, next) {
        console.log(req.body);
        var newCollection = new Collection({
      		name:req.body.collectionName,
      		artists:req.body.artists,
      		guest:req.body.guests,
      		year:req.body.year,
          label:req.body.recordLabel,
      		recordNumber:req.body.recordNumber,
      		tracks: [],
      	});
      	newCollection.save(function(err, doc){
          if(err) {
          	return next(err);
          } else {
            res.redirect('/audio');
          }
        });
      }
    );

    app.post('/editCollection',
      upload.single('audioFile'),
      function(req,res){
        console.log(req.body);
        res.status(204).end();
      }
    );

    // =====================================
    // VIDEO PAGE =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
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
    // SHEETS PAGE =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
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
    // READ-DIR-FILES ======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.post('/readdir', isLoggedIn, function(req, res) {

      // When posting to this route (which will happen when loading profile)
      // the directory will be read

    });

    // =====================================
    // MODIFY METADATA =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.post('/readdir', isLoggedIn, function(req, res) {

      //

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
