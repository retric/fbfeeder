/**
 * Module dependencies.
 */
var express   = require('express');
var https     = require('https');
var dynamicHelpers = require('./dynamicHelpers');
var everyauth = require('everyauth');
var winston = require('winston').cli();

// inject everyauth into feeder module
var feeder    = require('./routes/feeder')(everyauth);

function stringify (obj) {
  return JSON.stringify(obj, null, 2);
}

// configure winston to log to file rather than console
winston.add(winston.transports.File, {filename: 'feeder.log', timestamp: false, json: false});
winston.remove(winston.transports.Console);
winston.transports.File.stringify = stringify;
winston.transports.Console.stringify = stringify;
winston.info('testing');

// create an express webserver
var app = express();

// session variables
var app_id = process.env.FACEBOOK_APP_ID;
var secret = process.env.FACEBOOK_SECRET;
var scope = 'read_stream';

// db setup

// setup mongodb
var MongoClient = require('mongodb').MongoClient;

// Connect to the db
MongoClient.connect("mongodb://localhost:27017/friendDb", function(err, db) {
  if (err) { return console.dir(err); }

  db.collection('');
});



/* setup mongoose
var mongoose = require('mongoose'),
  Schema   = mongoose.Schema,
  ObjectId = mongoose.SchemaTypes.ObjectId;

mongoose.model('User', UserSchema);
mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  var UserSchema = Schema({});
  User = mongoose.model('User', UserSchema);
}); */

// everyauth setup

// temporary var storage
var usersById = {};
var nextUserId = 0;
var usersByFbId = {};

// for use by everyauth
function addUser (source, sourceUser) {
  var user;
  if (arguments.length === 1) {
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {id: nextUserId};
    user[source] = sourceUser; 
  }
  return user;
}

// everyauth module setup
everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });

everyauth.facebook
  .appId(app_id)
  .appSecret(secret)
  .scope('read_stream')
  .findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata) {
    return usersByFbId[fbUserMetadata.id] ||
      (usersByFbId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata)); 
  })
  .redirectPath('/');

// configuration for routing
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'secret'}));
  app.use(everyauth.middleware(app));
  //app.use(mongooseAuth.middleware(app));
  //app.engine('xml', require('ejs').renderFile);

  // workaround for dynamichelpers in express 3
  app.use(function(req, res, next){
    res.locals.url = dynamicHelpers.url(req, res)();
    res.locals.url_logo = dynamicHelpers.url(req, res)('/logo.png');
    res.locals.channel = dynamicHelpers.url_no_scheme(req, res)('/channel.html');
    next();
  });
});

// listen to the PORT given to use in the environment
var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

// routes for pages
app.get('/', feeder.home);
app.get('/:user', feeder.user);
app.get('/:user/:id', feeder.retrieve_links);

// routes for functions
app.post('/friendlist', feeder.retrieve_friends);
app.get('/logout', feeder.logout);