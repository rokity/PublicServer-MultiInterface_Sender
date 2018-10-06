const Hapi = require('hapi');

// Plugin Hapi
const vision = require('vision');
const inert = require('inert');
const lout = require('lout');

// Get configuration parameters for web-server
const hostnameParameter = process.argv[2];
const portParameter = process.argv[3];
// Setup configuration variables for web-server
const server = Hapi.server({
  port: portParameter,
  host: hostnameParameter,
});
// Connect to the Database and load Models
require('./connection')()

// Get Routes Configuration and Load on web-server
const routes = require('./routes');

server.route(routes);


//WebSocket
var WebSocketServer = require('websocket').server;
var wsServer = new WebSocketServer({
  httpServer: server.listener
})
var connections = {};

// WebSocket server
wsServer.on('request', function (request) {
  var connection = request.accept(null, request.origin);

  global.websocket = connection;

  connection.on('message', function (message) {
    try {
      var msg = JSON.parse(message.utf8Data);
      if (msg['dtoken'] != null && msg['utoken']) {
        var mongoose = require('mongoose')
        var Device = mongoose.model('Device');
        isAuthenticated(msg['utoken'])
          .then(isLogged => {
            if (isLogged.status == true) {
              Device.findOneAndUpdate({
                  DToken: msg['dtoken'],
                  UserId: isLogged.id_user._id
                }, {
                  Status: true
                }).exec().then(device => {
                  if (device.length != 0) {
                    connection.sendUTF(JSON.stringify({
                      status: true
                    }));
                    connections[msg['dtoken']] = connection;
                  } else
                    connection.sendUTF(JSON.stringify({
                      status: false
                    }));
                })
                .catch(val => {
                  connection.sendUTF(JSON.stringify({
                    status: false
                  }));
                })
            } else
              connection.sendUTF(JSON.stringify({
                status: false
              }));

          });

      } else if (msg['ricevente_dtoken'] != null) {

        if (connections[msg['ricevente_dtoken']] != null) {
          for (key in connections) {
            if (connections[key] == connection) {
              var dtoken_mittente = key
              var mongoose = require('mongoose')
              var Device = mongoose.model('Device');
              Device.findOne({
                  DToken: msg['ricevente_dtoken']
                })
                .exec().then(ricevente_dispositivo => {
                  if (ricevente_dispositivo.Status == true) {
                    var conn = connections[msg['ricevente_dtoken']]
                    conn.sendUTF(JSON.stringify({
                      riceverai_da: dtoken_mittente
                    }));
                    connection.sendUTF(JSON.stringify({
                      job: true
                    }));
                  } else {
                    connection.sendUTF(JSON.stringify({
                      job: false
                    }));
                  }

                })

            } else {
              connection.sendUTF(JSON.stringify({
                job: false
              }));
            }
          }

        }else
        {
          connection.sendUTF(JSON.stringify({
            job: false
          }));
        }
      }
    } catch (e) {
      console.log(e);
    }


  });


  connection.on('close', function (connection) {
    // close user connection
  });
});

//Token Array
global.tokens = []

// Initializie the web-server Hapi
const init = async () => {
  // Add Plugin of Hapi
  await server.register([vision, inert, lout]);
  // Let's start the webserver
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};
// If web-server crash
process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});
// Launch the web-server
init();


var isAuthenticated = (token) => {
  return new Promise((resolve, reject) => {
    if (token == undefined) {
      resolve({
        status: false
      });
    } else {
      var mongoose = require('mongoose')
      var moment = require('moment');
      var Utente = mongoose.model('Utente');
      Utente.find({
        Token: token
      }).exec().then(docs => {
        if (docs.length != 0) {
          var expireDate = docs[0].ScadenzaToken;
          var date = moment();
          if (moment(date).isAfter(expireDate))
            resolve({
              status: false
            })
          else
            resolve({
              status: true,
              id_user: docs[0]._id
            })
        } else {
          resolve({
            status: false
          });
        }

      })

    }
  });
}