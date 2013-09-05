var App = function App() {

  var loginButton;
  var loggedButton;
  var preview;
  var currentUser = null;
  var client = null;

  var init = function init() {
    loginButton = document.getElementById('loginButton');
    loggedButton = document.getElementById('loggedButton');
    preview = document.getElementById('preview');

    loginButton.addEventListener('click', login);
    loggedButton.addEventListener('click', logout);

    loadMarket();
  };

  var loadMarket = function loadMarker() {
    $.get('/api/v1/market', function(apps) {

      apps.forEach(function(app) {
        var shouldHide = currentUser != null ? '' : 'hide';
        var item =
          '<div class="thumbnail clearfix">' +
            '<img src="' + app.icons['128'] + '" alt="' + app.name + '" class="pull-left span2 clearfix" style="margin-right:10px">' +
            '<div class="caption" class="pull-left">' +
              '<a data-install="' + app.manifest_url + '" class="btn btn-success icon pull-right ' + shouldHide + '">Install</a>' +
              '<h4>' +
              '<a href="#" >' + app.name + '</a>' +
              '</h4>' +
              '<small><b>' + app.description + '</small>' +
            '</div>' +
          '</div>';

        var li = document.createElement('li');
        li.classList.add('span6');
        li.classList.add('clearfix');
        li.innerHTML = item;

        preview.appendChild(li);
      });
    });
  };

  var login = function login() {
    navigator.id.request();
  };

  var logout = function logout() {
    if (confirm('You want to logout?')) {
      navigator.id.logout();
    }
  };

  var doLogout = function doLogout() {

  };

  var doLogin = function doLogin() {
    loginButton.classList.add('hide');
    loggedButton.textContent = 'Welcome ' + currentUser;
    loggedButton.classList.remove('hide');

    $.get('/api/v1/dump', function(data) {
      //So brute!!
      data.forEach(function(record) {
        if (record.email == currentUser) {
          client = record.client;
        }
      });
      if (client == null) {
        alert('Mail not registered for autoinstall');
      } else {
        var buttons = document.querySelectorAll('a[data-install]');
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.remove('hide');
          buttons[i].addEventListener('click', remoteInstall);
        }
      }
    });
  };

  var remoteInstall = function remoteInstall(evt) {
    var manifest = encodeURIComponent(evt.target.getAttribute('data-install'));
    var theClient = encodeURIComponent(client);

    $.get('/api/v1/add/' + theClient + '/' + manifest, function(data) {
      console.log(data);
      alert('App send to the device');
    });
  };

  navigator.id.watch({
    loggedInUser: currentUser,
    onlogin: function(assertion) {
      $.get('/verify?assertion=' + assertion, function(data) {
        var obj = JSON.parse(data);

        if (obj && obj.status == 'okay') {
          currentUser = obj.email;
          doLogin();
        }
      });
    },
    onlogout: function() {
      doLogout();
    }
  });

  return {
    'init': init
  };
}();

document.addEventListener("DOMContentLoaded", function(event) {
  App.init();
});