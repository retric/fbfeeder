// handle home page
exports.home = function(req, res) {
  res.render('index');
}

// handle user page
exports.user = function(req, res) {

}

// handle initial retrieval of links
exports.retrieve_links = function(req, res) {

}

// handle retrieval of friends
exports.retrieve_friends = function(req, res) {
  
}

// handle logout
exports.logout = function(req, res) {
  req.logout();
  req.redirect('/');
}
