const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

//this router is like a mini-application
const router = express.Router();

//Special case of not following REST routes
//becase this will only be one httpMethod and only for POST
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
//since middleware runs in sequence of each other, putting this in here will run
//the protect through out the succeeding routes below subsequently protecting the routes.
//and so with this, we don't need to put .protect before each of the routes.
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

// Succeeding routes after this will have it accessed by admin and restrict to other users.
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

//assign our router as an export object. This is important as the module
//doesn't know what to send to the requiring module
module.exports = router;
