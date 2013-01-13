/**
 * Module dependencies.
 */

var express   = require('express');
var feeder    = require('./routes/feeder');
var https     = require('https');
var dynamicHelpers = require('./dynamicHelpers');
var everyauth = require('everyauth');

// create an express webserver
var app = express();

// session variables
var app_id = process.env.FACEBOOK_APP_ID;
var secret = process.env.FACEBOOK_SECRET;
var scope = 'read_stream';

/* setup mongoose with auth support
var mongoose = require('mongoose'),
  Schema   = mongoose.Schema,
  ObjectId = mongoose.SchemaTypes.ObjectId;

var UserSchema   = new Schema({}),
  User;
var mongooseAuth = require('mongoose-auth');

// mongooseAuth: Schema decoration for routing
UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User: function() {
        return User;
      }
    }
  },
  facebook: {
    everyauth: {
      myHostname: 'http://localhost:3000',
      appId: app_id,
      appSecret: secret,
      redirectPath: '/'
    }
  }
});

mongoose.model('User', UserSchema);
mongoose.connect('mongodb://localhost/test');

User = mongoose.model('User');
*/

everyauth.facebook
  .appId(app_id)
  .appSecret(secret)
  .scope('read_stream')
  .findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata) {
    
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
app.get('/friendlist', feeder.retrieve_friends);
app.get('/logout', feeder.logout);