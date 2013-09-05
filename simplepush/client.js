var mongoq = require('mongoq'),
    request = require('request');

// Deal with each channel and keeps
// track of the pending app to install
// Format:
// {
//    "client": "<channel url>",
//    "email": "email@email.com"
//    "sequence": <sequenece number>
//    "apps": [<manifest_url1>,<manifest_url2>, ...] 
// }
var Client = function Client() {

  var db, autoinstall;

  var init = function init(url) {
    db = mongoq(url, {safe: false});
    autoinstall = db.collection('autoinstall');
  };

  // Propertly saves on the database the client
  var createNewClient = function createNewClient(client, email, cb) {
    var obj = {
      'client': client,
      'email': email,
      'sequence': 0,
      'history': [],
      'date': new Date()
    };
    console.log('About to create new entry: ' + JSON.stringify(obj));

    autoinstall.insert(obj).done(function onDone() {
      cb(obj);
    });
  };

  // Requires parameter client (which is a url) and email
  var register = function register(req, res) {
    var params = req.body;

    if (!params || !params.email || !params.client) {
      res.send(404, 'Not enough parameters');
      return;
    }

    autoinstall.findOne({'email': params.email}).
      done(function onDone(already) {
        if (already === null) {
          createNewClient(params.client, params.email, function onCreated(obj) {
            res.send(200, obj);
          });
        } else {
          console.log('Already registered ' + params.email);
          already.client = params.client();
          already.update().done(function onDone() {
            res.send(200, already);
          });
        }
    });
  };

  // Remove client
  var unregister = function unregister(req, res) {
    var params = req.body;

    if (!params || !params.client || !params.email) {
      res.send(404, 'Not enought parameters in POST body');
      return;
    }

    autoinstall.remove({'client': params.client,
      'email': params.email}).done(function onDone(obj) {
      // TODO: Unregister from push notification server
      res.send(200, obj);
    });
  };

  var add = function add(req, res) {
    var client = unescape(req.params.client);
    var manifestUrl = unescape(req.params.manifest);

    console.log('Client ::: ' + client);
    console.log('Adding manifiest ::: ' + manifestUrl);

    autoinstall.findOne({'client': client}).done(function(pending) {
      pending.history.push(manifestUrl);
      pending.sequence = parseInt(pending.sequence) + 1;
      autoinstall.update({'client': client}, pending).done(function(obj) {
        // Send request to notification server with new sequence
        request({
          method: 'PUT',
          uri: pending.client,
          body: 'version=' + pending.sequence
        }, function onRequest(error, response, body) {
          if (error) {
            res.send(500, error);
            return;
          }

          res.send(response.statusCode, body);
        });
      });
    }).fail(function(err) {
      res.send(404, err);
    });
  };

  // Non secure way of getting pending apps
  var get = function get(req, res) {
    var client = unescape(req.params.client);

    autoinstall.findOne({'client': client}).done(function(pending) {
      if (req.query.clean) {
        var originalHistory = pending.history.slice(0);
        pending.history = [];
        autoinstall.update({'client': client}, pending).done(function(obj) {
          pending.history = originalHistory;
          res.send(200, JSON.stringify(pending));
        });
      } else {
        res.send(200, JSON.stringify(pending));
      }
    }).fail(function(err) {
      res.send(404, err);
    });
  };

  var dump = function dump(req, res) {
    autoinstall.find({}).toArray().done(function(all) {
      res.send(200, JSON.stringify(all));
    });
  };

  var clear = function clear(req, res) {
    autoinstall.remove({}).done(function() {
      res.send(200, 'ok');
    });
  };

  var market = function market(req, res) {
    var market = db.collection('apps');

    market.find({}).toArray().done(function(apps) {
      res.send(200, apps);
    });
  };

  return {
    'init': init,
    'register': register,
    'unregister': unregister,
    'get': get,
    'add': add,
    'dump': dump,
    'clear': clear,
    'market': market
  };

}();

module.exports = Client;
