var express  = require('express');
var https    = require('https');

// create an express webserver
var app = express,
  http = require('http');
http.createServer(app);

// session variables
var app_id = process.env.FACEBOOK_APP_ID;
var secret = process.env.FACEBOOK_SECRET;
var scope = 'read_stream';

// setup mongoose with auth support
var mongoose = require('mongoose'),
  Schema   = mongoose.Schema,
  ObjectId = mongoose.SchemaTypes.ObjectId;

var UserSchema   = new Schema({}),
  User;
var mongooseAuth = require('mongoose-auth');

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

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'secret'}));
  app.use(mongooseAuth.middleware());

  // workaround for dynamichelpers in express 3
  app.use(function(req, res, next){
    res.locals.url = dynamicHelpers.url(req, res)();
    res.locals.url_logo = dynamicHelpers.url(req, res)('/logo.png');
    res.locals.channel = dynamicHelpers.url_no_scheme(req, res)('/channel.html');
    next();
  });
});

mongooseAuth.helpExpress(app);

app.engine('xml', require('ejs').renderFile);