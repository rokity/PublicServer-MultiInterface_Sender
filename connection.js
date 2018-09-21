// require mongoose module
const mongoose = require('mongoose');
const model = require('./model');
// require database URL from properties file
const dbURL = require('./config');

/**
 * connection to database
 */
module.exports = () => {
  mongoose.connect(dbURL, {
    useNewUrlParser: true
  });

  mongoose.connection.on('connected', () => {
    console.log('Mongoose default connection is open ');
    return model();
  });

  mongoose.connection.on('error', (err) => {
    console.error(`Mongoose default connection has occured ${err} error`);
  });

  mongoose.connection.on('disconnected', () => {
    console.error('Mongoose default connection is disconnected');
  });

  mongoose.connection.once('open', function () {
    //Connesso
   //console.log('Connected to the server');
  });

  process.on('SIGINT', () => {
    mongoose.connection.close(() => {
      console.error('Mongoose default connection is disconnected due to application termination');
      process.exit(0);
    });
  });
};
