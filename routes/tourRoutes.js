const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// Param Middleware, acts on the parameter sent
// router.param('id', tourController.checkID);

//creating a middleware for our alias, these are for routes that are always getting triggered
//before we get all of the tours, we modify our req by calling our special middleware
router
  .route('/top-5-tours')
  .get(tourController.getTopToursAlias, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guides'),
    tourController.getMonthlyPlan
  );

// in query string we can specify it like this:
// /tours-within?distance=233&center=33.730557,-117.855580&unit=mi
// instead of this: but the one below is cleaner and is a standard.
// /tours-within/<km or mi from where you are>/center/<location of where you are>/unit/<unit of distance>
// /tours-within/233/center/33.730557,-117.855580/unit/mi
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

//get distances from all the tours given a certain point
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

//chaining multiple middleware by comma.
//since we want to make this getAllTour as a gateway into our application, we will remove the protect
//so that other sites can access our api. Also, we want to protect creating tours and have it access
//by only admins and lead guides
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

//Same with creating tours, we want to restrict editing and deleting to only
//admins and lead-guid to do this route
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

//nested routes
//POST /tour/xtourxxxidx/reviews
//GET /tour/xtourxxxidx/reviews
//in here we specify a review route where we careate a review
//based on tour's id and the current user logged in.
//this is somehow a not so good approach
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

//to better implement nested routes, we want to mount a router to a specific route.
//if this specific route is encountered, we will use the reviewRouter
router.use('/:tourId/reviews', reviewRouter);

//assign our router as an export object. This is important as the module
//doesn't know what to send to the requiring module
module.exports = router;
