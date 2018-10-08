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
global.connections = {}

// WebSocket server
wsServer.on('request', function (request) {
  var connection = request.accept(null, request.origin);


  connection.on('message', function (message) {
    try {
      var msg = JSON.parse(message.utf8Data);
      console.log(msg)
      if(msg['java_server']!=null)
      {
        console.log("java server connesso")
        global.connections['java_server'] = connection;
      } else if (msg['dtoken'] != null && msg['utoken']) {
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
                    global.connections[msg['dtoken']] = connection;
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

      } else if (msg['ricevente_dtoken'] != null && msg['interfacce'] != null) {
        if (global.connections[msg['ricevente_dtoken']] != null) {
          for (key in global.connections) {
            if (global.connections[key] == connection) {
              var dtoken_mittente = key
              var mongoose = require('mongoose')
              var Device = mongoose.model('Device');
              Device.findOne({
                  DToken: msg['ricevente_dtoken']
                })
                .exec().then(ricevente_dispositivo => {
                  if (ricevente_dispositivo.Status == true) {
                    var conn = global.connections[msg['ricevente_dtoken']]
                    if(mesg['interfacce'].mobile==false)
                    {
                      conn.sendUTF(JSON.stringify({
                        riceverai_da: dtoken_mittente,
                        interfacce: msg['interfacce']
                      }));
                      connection.sendUTF(JSON.stringify({
                        job: true
                      }));
                    }else
                    {
                      global.connections['java_server'].send(JSON.stringify({ricevente:msg['ricevente_dtoken'],mittente:dtoken_mittente}));  

                      conn.sendUTF(JSON.stringify({
                        riceverai_da: dtoken_mittente,
                        interfacce: msg['interfacce']
                      }));
                      connection.sendUTF(JSON.stringify({
                        job: true
                      }));
                    }                  
                  } else {
                    connection.sendUTF(JSON.stringify({
                      job: false
                    }));
                  }

                })

            }
          }
        } else {
          console.log("here7");
          connection.sendUTF(JSON.stringify({
            device_not_found: false
          }));
        }
      } else if(msg['interfaces']!=null && msg['dtoken_mittente']!=null)
      {
        if(msg['interfaces'].mobile==true)
        {
          global.connections[msg['dtoken_mittente']].sendUTF(JSON.stringify({
            interfaces: msg['interfaces']
          }));
        }
        else
        {
          for (key in global.connections) {
            if(global.connections[key]==connection)
            {
              global.connections['java_server'].send(JSON.stringify({disattiva:key}));  
              global.connections[msg['dtoken_mittente']].sendUTF(JSON.stringify({
                interfaces: msg['interfaces']
              }));
            }
          }
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