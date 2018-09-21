const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  UserId: String,
  Name: String,
  Is_Pc: Boolean,
  Status:Boolean,
  DToken:String,
  CreatedOn: Date,
  Modified: Date,
  Disabled: Boolean,
});

module.exports = mongoose.model('Device', deviceSchema);
