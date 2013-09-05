var express = require('express'),
    http = require('http'),
    simplePush = require('../simplepush/client.js');
    request = require('request');

var Server = function Server() {

  var app = express();
  var pushClient = simplePush;

  var configure = function configure() {
    app.use(function(req, res, next) {
      if (req.url.indexOf('api/') > -1)
        res.contentType('application/json');
      next();
    });

    var port = process.env.PORT || 8080;
    var mongoURL = process.env.MONGOURL || 'mongodb://127.0.0.1:27017/simplepush';
    // For running in appfog
    if (process.env.VCAP_SERVICES) {
      var services = JSON.parse(process.env.VCAP_SERVICES);
      mongoURL = services['mongodb-1.8'][0].credentials.url;
    }

    app.set('port', port);
    app.set('mongoURL', mongoURL);

    app.use('/', express.static('static'));
    app.use(express.bodyParser());

    pushClient.init(mongoURL);

    app.post('/api/v1/register', pushClient.register);
    app.get('/api/v1/get/:client', pushClient.get);
    app.get('/api/v1/add/:client/:manifest', pushClient.add);
    app.post('/api/v1/unregister', pushClient.unregister);
    app.get('/api/v1/dump', pushClient.dump);
    app.get('/api/v1/clear', pushClient.clear);

    app.get('/api/v1/market', pushClient.market);

    app.get('/verify', function(req, res) {
      var assertion = req.query.assertion;
      var host = req.headers.host;

      if (!assertion) {
        res.send(404, 'Not enought parameters');
      }

      console.log('BODY ::: ' + 'assertion=' + assertion + '&audience=http://' + host);

      request({
          method: 'POST',
          uri: 'https://verifier.login.persona.org/verify',
          body: 'assertion=' + assertion + '&audience=http://' + host,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }, function onRequest(error, response, body) {
          if (error) {
            res.send(500, error);
            return;
          }

          res.send(response.statusCode, body);
        });
    });

  };

  var start = function start() {
    configure();
    http.createServer(app).listen(app.get('port'), function() {
      console.log('Express server listening on port ' + app.get('port'));
    });
  };

  return {
    'start': start
  };

}();

module.exports = Server;
