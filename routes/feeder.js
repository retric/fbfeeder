var https = require('https');
var winston = require('winston');

module.exports = function(everyauth) {
	return {
		// handle graph api requests
		graph_get: function(path, token, cb) {
  		https.get("https://graph.facebook.com/" + path + "?" + token, graph_parse(cb));
		},

		home: function(req, res) {
  			res.render('index');
		},

		// handle user page
		user: function(req, res) {

		},

		// handle initial retrieval of links
		retrieve_links: function(req, res) {

		},

		// handle retrieval of friends
		retrieve_friends: function(req, res) {
  			if (typeof req.user != undefined) {
  				winston.info("entered retrieve friends");
  				winston.info("everyauth:", everyauth.facebook);
  			}
		},

		// handle logout
		logout: function(req, res) {
  			req.logout();
  			req.redirect('/');
		}

	};
};
