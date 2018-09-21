const mongoose = require('mongoose');

const utenteSchema = new mongoose.Schema({
  Username: String,
  Password: String,
  Token:String,
  ScadenzaToken:Date,
  CreatedOn: Date,
  Modified: Date,
  Disabled: Boolean,
});

module.exports = mongoose.model('Utente', utenteSchema);
