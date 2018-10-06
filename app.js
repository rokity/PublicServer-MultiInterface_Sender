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
var wsServer = new WebSocketServer({httpServer:server.listener})
// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);

  global.websocket = connection;
  // This is the most important callback for us, we'll handle
  // all messages from users here.
  // connection.on('message', function(message) {
  //   console.log(message.utf8Data);
  // });

  connection.on('close', function(connection) {
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



