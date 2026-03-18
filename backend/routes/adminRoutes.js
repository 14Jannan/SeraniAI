const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect, authorize('admin'));

router.route('/users').get(getAllUsers).post(createUser); // getting all users and creating new user

router.route('/users/:id').put(updateUser).delete(deleteUser); // updating and deleting a specific user

module.exports = router;