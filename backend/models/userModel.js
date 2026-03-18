const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  journal: {
    type: String,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'enterprise'], 
    default: 'user' 
  },
  // OTP Fields
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  
  streakCount: {
  type: Number,
  default: 0,
},
lastLessonCompletedAt: {
  type: Date,
  default: null,
},
lessonProgress: {
  type: [lessonProgressSchema],
  default: [],
},

});


module.exports = mongoose.model('User', userSchema);