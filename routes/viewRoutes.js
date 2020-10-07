const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

//View Template Routes
// I think all of the routes in here are for handling the routes / rendering our views templates
//(pug files)
// its not to be confused with the JS inside public. which handles the actions of the views.

//so before accessing every web routes, we need to check if the user is logged in first.
//instead of having it here, we use isLoggedIn per route because it will be redundant for
//getAccount to run the same process for both isLoggedIn and protect
// router.use(authController.isLoggedIn);

router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/me', authController.protect, viewsController.getAccount);
//This is the route that will be hit when a cc is successfully charged so this is also the point where
//we want to create our booking, so we will need to add bookingCheckout middleware function in this stack.
router.get(
  '/my-tours',
  bookingController.createBookingCheckout,
  authController.protect,
  viewsController.getMyTours
);

// Traditional Way
router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
