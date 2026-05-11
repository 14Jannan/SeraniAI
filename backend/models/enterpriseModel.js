const mongoose = require('mongoose');

/* MongoDB schema definition for enterprise organization documents */
const enterpriseSchema = new mongoose.Schema({
  /* Enterprise organization name */
  name: {
    type: String,
    required: true,
  },
  /* Reference to the user who owns/created this enterprise */
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  /* Array of user references belonging to this enterprise */
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  /* Timestamp when the enterprise was created */
  createdAt: {
    type: Date,
    default: Date.now,
  },
  /* Timestamp when the enterprise was last updated */
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Enterprise', enterpriseSchema);
