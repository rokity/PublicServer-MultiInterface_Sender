const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  ID_RECEIVING_DEVICE: String,
  CODE: String,
  TIMESTAMP: Date,
  WIFI:Array,
  BLUETOOTH:String,
  MOBILE:Boolean,
  CreatedOn: Date,
  Modified: Date,
  Disabled: Boolean,
});

module.exports = mongoose.model('Session', sessionSchema);
