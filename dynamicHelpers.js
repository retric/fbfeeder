
exports.host = function(req, res) {
    return req.headers['host'];
}

exports.scheme = function(req, res) {
    return req.headers['x-forwarded-proto'] || 'http';
}
  
exports.url = function(req, res) {
    return function(path) {
      return exports.scheme(req, res) + exports.url_no_scheme(req, res)(path);
    }
}

exports.url_no_scheme = function(req, res) {
  return function(path) {
    return '://' + exports.host(req, res) + (path || '');
  }
}
