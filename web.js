var async   = require('async');
var express = require('express');
var util    = require('util');
var dynamicHelpers = require('./dynamicHelpers');

// create an express webserver
var app = express()
  , http = require('http');
http.createServer(app);

app.use(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());
app.use(express.cookieParser());

// set this to a secret value to encrypt session cookies
app.use(express.session({ secret: process.env.SESSION_SECRET || 'secret123' }));
app.use(require('faceplate').middleware({
    app_id: process.env.FACEBOOK_APP_ID,
    secret: process.env.FACEBOOK_SECRET,
    scope:  'user_likes,user_photos,user_photo_video_tags'
  })
);

// workaround for dynamichelpers in express 3
app.use(function(req, res, next){
  res.locals.url = dynamicHelpers.url(req, res)();
  res.locals.url_logo = dynamicHelpers.url(req, res)('/logo.png');
  res.locals.channel = dynamicHelpers.url_no_scheme(req, res)('/channel.html');
  next();
})

app.engine('xml', require('ejs').renderFile);

// set up mongodb
var mongo = require('mongodb'),
  Server = mongo.Server,
  Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('friendDb', server);

db.open(function(err, db) {
    if (!err) {
      console.log("Db connection established.");
    }
  });

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});

function render_page(req, res) {
  req.facebook.app(function(app) {
    req.facebook.me(function(user) {
      console.log(user);
      res.render('index.ejs', {
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {

    async.parallel([
      function(cb) {
        // query 4 friends and send them to the socket for this socket id
        req.facebook.get('/me/friends', { }, function(friends) {
          req.friends = JSON.stringify(friends);
          req.facebook.me(function(user) {
            
            // insert friend list into a collection corresponding to fb user id
            db.createCollection(user.id, {safe: true}, function(err, collection) {
              if (err) return;
              collection.insert(friends, {safe:true}, function(err, result) {
                if (err) throw err;
              });
            });

          });
          cb();
        });
      },
      function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT uid, name, is_app_user, pic_square FROM user WHERE uid in (SELECT uid2 FROM friend WHERE uid1 = me()) AND is_app_user = 1', function(result) {
          req.friends_using_app = result;
          cb();
        });
      },
      function(cb) {
        // query 10 links and send them to the socket for this socket id
        req.facebook.get('/me/links', { limit: 6 }, function(links) {
          req.links = links;
          cb();
        });
      }
    ], function() {
      render_page(req, res);
    });

  } else {
    render_page(req, res);
  }
}

// handle json retrieval of friend list by autocomplete form
function retrieve_friends(req, res) {
  // if the user is logged in
  if (req.facebook.token) {
    var body = req.body;
    db.collection(body.uid, function(err, collection) {
      var reg = new RegExp("(^" + body.name_startsWith + ".*)|(.+ " + body.name_startsWith +")", "i");
      console.log(reg);
      collection.find({"name": reg}).toArray(function(err, array) {
        res.send(JSON.stringify(array));
      });
    });
  } else {
    console.log("user not logged in");
  }
}

// retrieve the links corresponding to a given uid
function retrieve_links(req, res) {
  if (req.facebook.token) {
    req.facebook.get('/me/permissions', {}, function(res) {
      console.log("Permissions");
      console.log(res);
    })
    req.facebook.get("/" + req.params.id, {}, function(user) {
      req.facebook.get("/" + req.params.id + "/links", {}, function(links) {
        res.set('Content-Type', 'text/xml');
        res.render('rss.ejs', {
          user:     user.name,
          links:    links
        });
      });
    });
 } else {
    // remote access of feed itself
    console.log("user not logged in");
 }
}

// handle logout
function logout(req, res) {
  db.dropCollection(req.body.uid, function() {});
}

app.get('/', handle_facebook_request);
app.post('/', handle_facebook_request);
app.post('/friendlist', retrieve_friends);
app.post('/logout', logout);
app.get('/:user', handle_facebook_request);
app.get('/:user/:id', retrieve_links);