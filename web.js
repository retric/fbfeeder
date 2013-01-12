var async   = require('async');
var express = require('express');
var util    = require('util');
var https   = require('https');
var fs      = require('fs');
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
    scope:  'read_stream'
  })
);

var app_id = process.env.FACEBOOK_APP_ID;
var secret = process.env.FACEBOOK_SECRET;
var scope = 'read_stream';

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

// setup for facebook extended token storage/retrieval
db.createCollection('tokens', function(err, collection) {
  if (err) console.log(err);
});

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});


// server functions

function render_page(req, res) {
  req.facebook.app(function(app) {
    req.facebook.me(function(user) {
      res.render('index.ejs', {
        req:       req,
        app:       app,
        user:      user,
        app_id:    process.env.FACEBOOK_APP_ID
      });
    });
  });
}


// callback to parse facebook JSON data
function graph_parse(cb) {
  return function(res) {
    var output = '';
    
    res.on("data", function(chunk) {
    output += chunk;
    });

    res.on('end', function() {
      var result = JSON.parse(output);
      console.log("graph parse")
      console.log(result)
      cb(result.data ? result.data : result);
    });
  }
}

// perform server-side graph api calls
function graph_get(path, token, cb) {
  https.get("https://graph.facebook.com/" + path + "?" + token, graph_parse(cb));
}

// retrieve user info from facebook given a facebook username or id
// no token required
function userinfo(user, cb) {
  https.get("https://graph.facebook.com/" + user, graph_parse(cb));
}

// extend my facebook token
function extend_token(token, cb) {
  https.get("https://graph.facebook.com/oauth/access_token?client_id=" + app_id +
            "&client_secret=" + secret +
            "&grant_type=fb_exchange_token&fb_exchange_token="+ token, graph_parse(cb));
}

function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {
    console.log("main function");
    async.parallel([
      /* function(cb) {
        // check if token exists for current user in db
        req.facebook.me(function(user) {
          if (user != null && user.id != null) {
            db.collection('tokens', function(err, collection) {
              collection.findOne({username:user.username}, function(err, item) {
                // add token into db if one doesn't exist
                if (item == null) {
                  extend_token(req.facebook.token, function(response) {
                    fs.writeFileSync('log.txt', response, encoding='utf8', console.log);
                    var entry = {username:user.username, token:response.toString('utf8')};
                    collection.insert(entry, {safe: true}, console.log);
                  });
                } else {
                  // do a graph query to check if the token is valid
                  graph_get("/me", item, function(response) {
                    if (response.error && response.error.type == "OAuthException") {
                      // if not, replace the stored token in the db with my current extended token

                    }
                  });
                }
              });
            });
          }
          cb();
        });
      }, */
      function(cb) {
        // query friend list
        req.facebook.me(function(user) {
          // insert friend list into a collection corresponding to fb user id
          db.createCollection("friends"+user.id, {safe: true}, function(err, collection) {
            if (err) return;
            req.facebook.get('/me/friends', {}, function(friends) {
              req.friends = JSON.stringify(friends);
              collection.insert(friends, {safe:true}, function(err, result) {
                if (err) throw err;
              });
            });
          });
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
    db.collection("friends"+body.uid, function(err, collection) {
      var reg = new RegExp("(^" + body.name_startsWith + ".*)|(.+ " + body.name_startsWith +")", "i");
      collection.find({"name": reg}).toArray(function(err, array) {
        res.send(JSON.stringify(array));
      });
    });
  } else {
    console.log("retrieve_friends: user not logged in");
  }
}

// insert link feed into db if no collection exists for this feed
function initialize_links(req, res, user) {
  db.createCollection(user.id + "." + req.params.id, function(err, collection) {
    req.facebook.get("/" + req.params.id, {}, function(user) {
      req.facebook.get("/" + req.params.id + "/links", { limit: 1000 }, function(links) {
        collection.insert(links, {safe:true}, console.log);
        res.set('Content-Type', 'text/xml');
        res.render('rss.ejs', {
          user:     user.name,
          links:    links
       });
     });
    });
  });
}

// retrieve the links corresponding to a given uid
function retrieve_links(req, res) {
  userinfo(req.params.user, function(user) {
    if (req.facebook.token) {
      // accessing feed from app page
      db.collection(user.id + "." + req.params.id, {safe:true}, function(err, collection) {
        if (err) initialize_links(req, res, user);
        else {
          // retrieve links from db 
          collection.find().toArray(function(err, links) {
            res.render('rss.ejs', {
              user:     user.name,
              links:    links
            });
          });
        }
      });
    } /*else {
      // remote accessing of feed
      console.log("retrieve_links: user not logged in");
      db.collection('tokens', function(err, collection) {
        if (err) console.log(err);
        collection.findOne({username:req.params.user}, function(err, item) {
          if (item !== null) {
            var token = item["token"];

            // retrieve links using graph api call
            // if token is expired (oauth exception), then retrieve links stored in db
            graph_get("/" + req.params.id, token, function(user) {
             graph_get("/" + req.params.id + "/links", token, function(links) {
               res.set('Content-Type', 'text/xml');
               res.render('rss.ejs', {
                 user:     user.name,
                 links:     links
               });
             });
            });


          } else {
            // token doesn't exist in db; return error because user needs to login
          }
        });
      });
    } */
  });
}

// handle logout
function logout(req, res) {
  db.dropCollection("friends"+req.body.uid, function() {});
  // remove my token from the token db since it expires upon logout
}

app.get('/', handle_facebook_request);
app.post('/', handle_facebook_request);
app.post('/friendlist', retrieve_friends);
app.post('/logout', logout);
app.get('/:user', handle_facebook_request);
app.get('/:user/:id', retrieve_links);