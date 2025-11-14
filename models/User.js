// models/User.js
const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  registrations: [RegistrationSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
