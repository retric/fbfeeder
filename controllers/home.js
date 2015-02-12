/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
  
  if (req.isAuthenticated()) {
    res.render ('feeder', {
      title: 'Feeder'
    });
  } else {
    res.render('home', {
      title: 'Home'
    });
  }
};
